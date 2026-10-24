-- Etapa 3: RLS de profiles e turmas atribuidas pelo administrador.
-- Aplicada ao projeto SEA original; versao alinhada ao historico remoto.
-- Nao infere vinculos a partir de atividades nem altera perfis existentes.

begin;

create schema if not exists sea_private authorization postgres;
revoke all on schema sea_private from public, anon, authenticated;
grant usage on schema sea_private to authenticated, service_role;

create table public.professor_turmas (
  professor_id uuid not null references public.profiles(id) on delete restrict,
  turma text not null check (turma = btrim(turma) and char_length(turma) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (professor_id, turma)
);
alter table public.professor_turmas enable row level security;

-- Consultas internas limitadas ao solicitante; evita recursao na propria RLS.
create function sea_private.current_active_role()
returns text language sql stable security definer set search_path = ''
as $function$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.ativo is true;
$function$;

create function sea_private.can_view_student(student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles caller
    join public.professor_turmas v on v.professor_id = caller.id
    join public.profiles student on student.turma = v.turma
    where caller.id = (select auth.uid())
      and caller.role = 'professor' and caller.ativo is true
      and student.id = student_id
      and student.role = 'aluno' and student.ativo is true
  );
$function$;

revoke execute on function sea_private.current_active_role()
  from public, anon, authenticated, service_role;
revoke execute on function sea_private.can_view_student(uuid)
  from public, anon, authenticated, service_role;
grant execute on function sea_private.current_active_role()
  to authenticated, service_role;
grant execute on function sea_private.can_view_student(uuid)
  to authenticated, service_role;

-- A RLS limita linhas; este trigger complementa a protecao dos campos.
create function sea_private.guard_profile_fields()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.created_at is distinct from old.created_at
    or new.badges is distinct from old.badges then
    raise exception using errcode = '42501',
      message = 'Estes campos do perfil sao gerenciados pelo backend.';
  end if;

  if sea_private.current_active_role() = 'admin' and old.role in ('aluno', 'professor') then
    if new.pontos is distinct from old.pontos then
      raise exception using errcode = '42501',
        message = 'A pontuacao nao pode ser editada pela gestao de usuarios.';
    end if;
    return new;
  end if;

  if new.turma is distinct from old.turma or new.ativo is distinct from old.ativo then
    raise exception using errcode = '42501',
      message = 'Somente um administrador ativo pode alterar turma e situacao da conta.';
  end if;

  -- Excecao temporaria: preserva o fluxo antigo de credito ao proprio aluno.
  -- Remover na etapa de envio e pontuacao atomicos pelo servidor.
  if new.pontos is distinct from old.pontos and (
    old.id = (select auth.uid()) and old.role = 'aluno' and old.ativo is true
  ) is not true then
    raise exception using errcode = '42501', message = 'Alteracao de pontos nao autorizada.';
  end if;
  return new;
end;
$function$;
revoke execute on function sea_private.guard_profile_fields()
  from public, anon, authenticated, service_role;
create trigger sea_guard_profile_fields before update on public.profiles
for each row execute function sea_private.guard_profile_fields();

drop policy "Acesso autenticado ao próprio perfil" on public.profiles;
drop policy "Anon pode inserir perfil" on public.profiles;

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, avatar, turma, ativo, pontos) on public.profiles to authenticated;

-- O proprio perfil permanece legivel quando inativo para o fluxo de logout.
create policy profiles_read on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select sea_private.current_active_role()) = 'admin'
  or sea_private.can_view_student(id)
);
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()) and (select sea_private.current_active_role()) is not null)
with check (id = (select auth.uid()) and (select sea_private.current_active_role()) is not null);
create policy profiles_update_admin on public.profiles for update to authenticated
using ((select sea_private.current_active_role()) = 'admin' and role in ('aluno', 'professor'))
with check ((select sea_private.current_active_role()) = 'admin' and role in ('aluno', 'professor'));

revoke all on public.professor_turmas from public, anon, authenticated;
grant select, insert, delete on public.professor_turmas to authenticated;
grant all on public.professor_turmas to service_role;
create policy professor_turmas_read on public.professor_turmas for select to authenticated
using (
  (select sea_private.current_active_role()) = 'admin'
  or (professor_id = (select auth.uid()) and (select sea_private.current_active_role()) = 'professor')
);
create policy professor_turmas_insert_admin on public.professor_turmas for insert to authenticated
with check ((select sea_private.current_active_role()) = 'admin');
create policy professor_turmas_delete_admin on public.professor_turmas for delete to authenticated
using ((select sea_private.current_active_role()) = 'admin');

create function sea_private.require_professor()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if not exists (select 1 from public.profiles where id = new.professor_id and role = 'professor') then
    raise exception using errcode = '23514', message = 'O vinculo exige um perfil de professor.';
  end if;
  return new;
end;
$function$;
revoke execute on function sea_private.require_professor()
  from public, anon, authenticated, service_role;
create trigger professor_turmas_require_professor
before insert or update on public.professor_turmas
for each row execute function sea_private.require_professor();

-- Substituicao atomica dos vinculos, sem DELETE/INSERT separados no navegador.
create function public.set_professor_turmas(p_professor_id uuid, p_turmas text[])
returns integer language plpgsql security invoker set search_path = ''
as $function$
declare
  total integer;
begin
  if sea_private.current_active_role() is distinct from 'admin' then
    raise exception using errcode = '42501',
      message = 'Somente um administrador ativo pode atribuir turmas.';
  end if;
  if p_turmas is null or pg_catalog.cardinality(p_turmas) > 100
    or pg_catalog.array_ndims(p_turmas) > 1
    or exists (select 1 from pg_catalog.unnest(p_turmas) t(turma)
      where turma is null or pg_catalog.char_length(pg_catalog.btrim(turma)) not between 1 and 80) then
    raise exception using errcode = '22023', message = 'Lista de turmas invalida.';
  end if;

  perform 1 from public.profiles where id = p_professor_id and role = 'professor' for update;
  if not found then
    raise exception using errcode = '22023', message = 'Professor nao encontrado.';
  end if;

  delete from public.professor_turmas where professor_id = p_professor_id;
  insert into public.professor_turmas (professor_id, turma)
  select distinct p_professor_id, pg_catalog.btrim(t.turma)
  from pg_catalog.unnest(p_turmas) t(turma);
  get diagnostics total = row_count;
  return total;
end;
$function$;
revoke execute on function public.set_professor_turmas(uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.set_professor_turmas(uuid, text[]) to authenticated;

commit;
