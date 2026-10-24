-- Etapa 4: regras de acesso a atividades e respostas.
-- Aplicada ao projeto SEA original; versao alinhada ao historico remoto.
-- Gabaritos e pontuacao autoritativa serao tratados na etapa seguinte.

begin;

lock table public.atividades, public.respostas in access exclusive mode;
alter table public.atividades enable row level security;
alter table public.respostas enable row level security;

create function sea_private.can_manage_activity(author_id uuid, activity_classes text[])
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = author_id and p.id = (select auth.uid())
      and p.role = 'professor' and p.ativo is true
  )
  and activity_classes is not null
  and coalesce(pg_catalog.array_ndims(activity_classes), 1) = 1
  and not exists (
    select 1 from pg_catalog.unnest(activity_classes) c(turma)
    where c.turma is null or not exists (
      select 1 from public.professor_turmas v
      where v.professor_id = author_id and v.turma = c.turma
    )
  );
$function$;

create function sea_private.can_read_student_activity(author_id uuid, activity_classes text[])
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles student
    join public.professor_turmas v on v.turma = student.turma and v.professor_id = author_id
    join public.profiles author on author.id = author_id and author.role = 'professor'
    where student.id = (select auth.uid())
      and student.role = 'aluno' and student.ativo is true
      and student.turma = any(activity_classes)
  );
$function$;

create function sea_private.can_submit_activity(activity_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.atividades a
    where a.id = activity_id and a.publicada is true
      and sea_private.can_read_student_activity(a.professor_id, a.turmas)
  );
$function$;

create function sea_private.can_read_teacher_response(activity_id uuid, student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.atividades a
    join public.profiles student on student.id = student_id
    where a.id = activity_id
      and sea_private.can_manage_activity(a.professor_id, a.turmas)
      and student.role = 'aluno' and student.ativo is true
      and student.turma = any(a.turmas)
  );
$function$;

revoke execute on function sea_private.can_manage_activity(uuid, text[])
  from public, anon, authenticated, service_role;
revoke execute on function sea_private.can_read_student_activity(uuid, text[])
  from public, anon, authenticated, service_role;
revoke execute on function sea_private.can_submit_activity(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function sea_private.can_read_teacher_response(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function sea_private.can_manage_activity(uuid, text[]) to authenticated;
grant execute on function sea_private.can_read_student_activity(uuid, text[]) to authenticated;
grant execute on function sea_private.can_submit_activity(uuid) to authenticated;
grant execute on function sea_private.can_read_teacher_response(uuid, uuid) to authenticated;

drop policy "Acesso autenticado a atividades" on public.atividades;
drop policy "Acesso autenticado a respostas" on public.respostas;

revoke all on public.atividades, public.respostas from public, anon, authenticated;
grant select, delete on public.atividades to authenticated;
grant insert (titulo, descricao, professor_id, professor_nome, materia, turmas, questoes, publicada)
  on public.atividades to authenticated;
grant update (titulo, descricao, materia, turmas, questoes, publicada)
  on public.atividades to authenticated;
grant select on public.respostas to authenticated;
-- Pontuacao e feedback ainda sao aceitos no INSERT legado, ate a nova RPC.
grant insert (atividade_id, aluno_id, respostas, pontuacao, feedback)
  on public.respostas to authenticated;

-- CREATE e TRUNCATE nao sao controlados pelas politicas de linhas.
revoke create on schema public from public, anon, authenticated;

create policy atividades_read on public.atividades for select to authenticated
using (
  (select sea_private.current_active_role()) = 'admin'
  or sea_private.can_manage_activity(professor_id, turmas)
  or (publicada is true and sea_private.can_read_student_activity(professor_id, turmas))
);
create policy atividades_insert_teacher on public.atividades for insert to authenticated
with check (
  sea_private.can_manage_activity(professor_id, turmas)
  and publicada is not null
  and (publicada is false or pg_catalog.cardinality(turmas) > 0)
);
create policy atividades_update_teacher on public.atividades for update to authenticated
using (sea_private.can_manage_activity(professor_id, turmas))
with check (
  sea_private.can_manage_activity(professor_id, turmas)
  and publicada is not null
  and (publicada is false or pg_catalog.cardinality(turmas) > 0)
);
create policy atividades_delete_teacher on public.atividades for delete to authenticated
using (sea_private.can_manage_activity(professor_id, turmas));

create policy respostas_read on public.respostas for select to authenticated
using (
  (select sea_private.current_active_role()) = 'admin'
  or (aluno_id = (select auth.uid()) and (select sea_private.current_active_role()) = 'aluno')
  or sea_private.can_read_teacher_response(atividade_id, aluno_id)
);
create policy respostas_insert_student on public.respostas for insert to authenticated
with check (
  aluno_id = (select auth.uid()) and sea_private.can_submit_activity(atividade_id)
);

-- RESTRICT protege inclusive concorrencia e respostas que a RLS do autor oculta.
-- Nenhuma resposta existente e apagada ou regravada.
alter table public.respostas
  drop constraint respostas_atividade_id_fkey,
  add constraint respostas_atividade_id_fkey
    foreign key (atividade_id) references public.atividades(id) on delete restrict;

commit;
