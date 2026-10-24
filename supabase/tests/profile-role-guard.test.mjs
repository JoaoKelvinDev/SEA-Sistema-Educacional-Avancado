import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

// Aceita apenas um modulo PGlite local; nunca recebe URL de banco ou credenciais.
const moduleUrl = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2])).href
  : '@electric-sql/pglite';
const { PGlite } = await import(moduleUrl);
const migration = await readFile(new URL(
  '../migrations/20261024221520_protect_profile_role.sql', import.meta.url,
), 'utf8');

const ids = {
  aluno: '00000000-0000-4000-8000-000000000001',
  professor: '00000000-0000-4000-8000-000000000002',
  admin: '00000000-0000-4000-8000-000000000003',
  semPerfil: '00000000-0000-4000-8000-000000000004',
  cadastro: '00000000-0000-4000-8000-000000000005',
};
const updateError = {
  code: '42501',
  message: 'O papel do perfil so pode ser alterado pelo backend autorizado.',
};
const insertError = {
  code: '42501',
  message: 'Perfis criados diretamente devem ter papel de aluno.',
};

// Estrutura e politicas relevantes observadas na auditoria; somente dados ficticios.
const fixture = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create role supabase_auth_admin nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text not null,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant usage on schema auth to supabase_auth_admin;
  grant insert on auth.users to supabase_auth_admin;
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    name text not null,
    role text not null check (role in ('admin', 'professor', 'aluno')),
    avatar text,
    turma text,
    pontos integer default 0,
    badges text[] default '{}',
    ativo boolean default true,
    created_at timestamptz default now()
  );
  alter table public.profiles enable row level security;
  grant select, insert, update, delete on public.profiles
    to anon, authenticated, service_role;
  create policy "Acesso autenticado ao proprio perfil" on public.profiles
    for all to authenticated using (auth.uid() = id)
    with check (auth.uid() = id);
  create policy "Anon pode inserir perfil" on public.profiles
    for insert to anon with check (true);

  -- Replica o cadastro legado somente para detectar regressao nesta etapa.
  -- Aceitar role de raw_user_meta_data continua sendo um problema pendente.
  create function public.handle_new_user() returns trigger
    language plpgsql security definer set search_path = public as $$
  begin
    insert into public.profiles (id, email, name, role, turma)
    values (new.id, new.email, 'Pessoa ficticia',
      coalesce(new.raw_user_meta_data->>'role', 'aluno'),
      new.raw_user_meta_data->>'turma')
    on conflict (id) do nothing;
    return new;
  exception when others then return new;
  end;
  $$;
  create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${ids.aluno}', 'aluno@example.invalid', '{"role":"aluno"}'),
    ('${ids.professor}', 'professor@example.invalid', '{"role":"professor"}'),
    ('${ids.admin}', 'admin@example.invalid', '{"role":"admin"}'),
    ('${ids.semPerfil}', 'sem-perfil@example.invalid', '{}');
  delete from public.profiles where id = '${ids.semPerfil}';
`;

test('protecao de profiles.role em Postgres local e descartavel', async (t) => {
  const db = await PGlite.create();
  // O banco existe apenas em memoria; nenhum arquivo .env e carregado.
  try {
    await db.exec(fixture);
    assert.equal((await db.query('select current_user as role')).rows[0].role, 'postgres');

    const asCaller = async (role, id, action) => {
      assert.ok(['anon', 'authenticated', 'service_role', 'supabase_auth_admin'].includes(role));
      await db.exec(`begin; set local role ${role};`);
      try {
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
        return await action();
      } finally {
        await db.exec('rollback;');
      }
    };
    const updateRole = (id, role) => db.query(
      'update public.profiles set role = $1 where id = $2 returning role', [role, id],
    );
    const insertProfile = (role) => db.query(
      'insert into public.profiles (id,email,name,role) values ($1,$2,$3,$4) returning role',
      [ids.semPerfil, 'novo@example.invalid', 'Pessoa ficticia', role],
    );

    await t.test('reproduz a elevacao de papel antes da migracao', async () => {
      await asCaller('authenticated', ids.aluno, async () => {
        assert.equal((await updateRole(ids.aluno, 'admin')).rows[0].role, 'admin');
      });
    });

    const before = (await db.query('select * from public.profiles order by id')).rows;
    await db.exec(migration);
    await db.exec(migration);

    await t.test('aplicar e reaplicar nao altera perfis nem duplica o trigger', async () => {
      assert.deepEqual((await db.query('select * from public.profiles order by id')).rows, before);
      assert.equal((await db.query(`
        select count(*)::int as count from pg_trigger
        where tgrelid = 'public.profiles'::regclass and tgname = 'sea_guard_profile_role'
      `)).rows[0].count, 1);
    });

    for (const [original, target] of [['aluno', 'admin'], ['aluno', 'professor'],
      ['professor', 'admin'], ['admin', 'professor']]) {
      await t.test(`bloqueia ${original} mudando o proprio papel para ${target}`, async () => {
        await asCaller('authenticated', ids[original], async () => {
          await assert.rejects(updateRole(ids[original], target), updateError);
        });
      });
    }

    await t.test('mantem atualizacoes existentes sem mudar o papel', async () => {
      await asCaller('authenticated', ids.aluno, async () => {
        const result = await db.query(`
          update public.profiles set name = 'Nome atualizado', pontos = 15,
            role = 'aluno' where id = $1 returning name, pontos, role
        `, [ids.aluno]);
        assert.deepEqual(result.rows, [{ name: 'Nome atualizado', pontos: 15, role: 'aluno' }]);
      });
    });

    await t.test('nao confia em claims que afirmam service_role ou admin', async () => {
      await asCaller('authenticated', ids.aluno, async () => {
        await db.query("select set_config('request.jwt.claim.role', 'service_role', true)");
        await db.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ role: 'service_role', user_metadata: { role: 'admin' } }),
        ]);
        await assert.rejects(updateRole(ids.aluno, 'admin'), updateError);
      });
    });

    for (const caller of ['anon', 'authenticated']) {
      for (const role of ['admin', 'professor']) {
        await t.test(`bloqueia INSERT ${role} por ${caller}`, async () => {
          await asCaller(caller, ids.semPerfil, async () => {
            await assert.rejects(insertProfile(role), insertError);
          });
        });
      }
    }

    await t.test('bloqueia UPSERT que tenta promover o proprio perfil', async () => {
      await asCaller('authenticated', ids.aluno, async () => {
        await assert.rejects(db.query(`
          insert into public.profiles (id,email,name,role) values ($1,$2,$3,'admin')
          on conflict (id) do update set role = excluded.role
        `, [ids.aluno, 'aluno@example.invalid', 'Pessoa ficticia']), insertError);
      });
    });

    await t.test('bloqueia apagar e recriar o proprio perfil como administrador', async () => {
      await asCaller('authenticated', ids.aluno, async () => {
        await db.query('delete from public.profiles where id = $1', [ids.aluno]);
        await assert.rejects(db.query(`
          insert into public.profiles (id,email,name,role) values ($1,$2,$3,'admin')
        `, [ids.aluno, 'aluno@example.invalid', 'Pessoa ficticia']), insertError);
      });
    });

    await t.test('preserva INSERT de aluno permitido pela RLS existente', async () => {
      await asCaller('authenticated', ids.semPerfil, async () => {
        assert.equal((await insertProfile('aluno')).rows[0].role, 'aluno');
      });
    });

    await t.test('preserva RLS para atualizacoes de outro usuario', async () => {
      await asCaller('authenticated', ids.aluno, async () => {
        assert.deepEqual((await updateRole(ids.professor, 'aluno')).rows, []);
      });
    });

    await t.test('permite atribuicao pelo backend service_role', async () => {
      await asCaller('service_role', '', async () => {
        assert.equal((await updateRole(ids.aluno, 'professor')).rows[0].role, 'professor');
        assert.equal((await insertProfile('professor')).rows[0].role, 'professor');
      });
    });

    await t.test('preserva o trigger legado de cadastro sem alterar sua implementacao', async () => {
      await asCaller('supabase_auth_admin', '', async () => {
        await db.query(`
          insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3)
        `, [ids.cadastro, 'cadastro@example.invalid', JSON.stringify({ role: 'professor' })]);
        await db.exec('reset role;');
        assert.equal((await db.query('select role from public.profiles where id=$1', [ids.cadastro]))
          .rows[0].role, 'professor');
      });
    });

    await t.test('funcao nao eleva privilegios e nao concede EXECUTE aos clientes', async () => {
      const result = await db.query(`
        select p.prosecdef, p.proconfig,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
          has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
        from pg_proc p where p.oid = 'public.sea_guard_profile_role()'::regprocedure
      `);
      assert.deepEqual(result.rows, [{ prosecdef: false, proconfig: ['search_path=""'],
        anon_execute: false, authenticated_execute: false, service_execute: false }]);
    });
  } finally {
    await db.close();
  }
});
