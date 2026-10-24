-- Etapa 2: o cadastro publico nao escolhe papeis privilegiados.
-- Aplicada apos publicar a smart-action compativel com app_metadata.sea_role.

begin;

do $preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'auth.users'::pg_catalog.regclass
      and tgname = 'on_auth_user_created'
      and tgfoid = pg_catalog.to_regprocedure('public.handle_new_user()')
      and tgenabled = 'O'
      and not tgisinternal
  ) then
    raise exception 'Esperado o trigger ativo on_auth_user_created em auth.users.';
  end if;
end;
$preflight$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile_role text := coalesce(new.raw_app_meta_data ->> 'sea_role', 'aluno');
begin
  -- raw_app_meta_data so pode ser atribuido por um backend autorizado.
  -- raw_user_meta_data.role e deliberadamente ignorado.
  if profile_role not in ('aluno', 'professor', 'admin') then
    raise exception using
      errcode = '22023',
      message = 'Papel de cadastro invalido na configuracao do backend.';
  end if;

  insert into public.profiles (id, email, name, role, turma)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(pg_catalog.split_part(new.email, '@', 1), ''),
      'Usuario'
    ),
    profile_role,
    new.raw_user_meta_data ->> 'turma'
  );

  -- Uma falha na criacao do perfil deve cancelar o cadastro inteiro.
  -- Nao engolir excecoes nem ignorar conflitos silenciosamente.
  return new;
end;
$function$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated, service_role;

commit;
