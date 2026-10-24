-- Etapa 1: proteger o papel em escritas diretas de profiles.
-- Aplicada ao projeto SEA original; versao sincronizada com o historico remoto.
-- A definicao do papel em handle_new_user sera corrigida em outra etapa.

begin;

do $preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = pg_catalog.to_regclass('public.profiles')
      and attname = 'role'
      and atttypid = 'pg_catalog.text'::pg_catalog.regtype
      and attnotnull
      and not attisdropped
  ) then
    raise exception 'Esperada a coluna public.profiles.role do tipo text NOT NULL.';
  end if;
end;
$preflight$;

create or replace function public.sea_guard_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  -- current_user e o papel efetivo do Postgres, nao profiles.role nem um claim.
  -- Apenas conexoes de backend confiaveis podem atribuir papeis privilegiados.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Evita contornar o bloqueio de UPDATE apagando e recriando o perfil.
    if new.role is distinct from 'aluno' then
      raise exception using
        errcode = '42501',
        message = 'Perfis criados diretamente devem ter papel de aluno.';
    end if;
  elsif new.role is distinct from old.role then
    raise exception using
      errcode = '42501',
      message = 'O papel do perfil so pode ser alterado pelo backend autorizado.';
  end if;

  return new;
end;
$function$;

-- A funcao e acionada pelo trigger, sem conceder uma RPC aos clientes.
revoke execute on function public.sea_guard_profile_role()
  from public, anon, authenticated, service_role;

create or replace trigger sea_guard_profile_role
before insert or update on public.profiles
for each row execute function public.sea_guard_profile_role();

commit;
