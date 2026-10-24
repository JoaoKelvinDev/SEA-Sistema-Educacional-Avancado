import { createClient } from 'npm:@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(status === 405 ? { Allow: 'POST, OPTIONS' } : {}),
    },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Metodo nao permitido.' });
  }

  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    return jsonResponse(401, { error: 'Autenticacao obrigatoria.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Configuracao do servidor indisponivel.' });
  }

  try {
    const backend = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Valida o token no Auth; nunca confia em um JWT apenas decodificado.
    const { data: authData, error: authError } = await backend.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(401, { error: 'Sessao invalida ou expirada.' });
    }

    // A autorizacao vem do perfil atual no banco, nao dos metadados do usuario.
    const { data: caller, error: callerError } = await backend
      .from('profiles')
      .select('role, ativo')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (callerError) {
      return jsonResponse(503, { error: 'Nao foi possivel verificar a permissao.' });
    }
    if (caller?.role !== 'admin' || caller.ativo !== true) {
      return jsonResponse(403, { error: 'Somente um administrador ativo pode criar professores.' });
    }

    let body: unknown;
    try {
      const text = await req.text();
      if (new TextEncoder().encode(text).byteLength > 16_384) {
        return jsonResponse(413, { error: 'Requisicao muito grande.' });
      }
      body = JSON.parse(text);
    } catch {
      return jsonResponse(400, { error: 'Envie um objeto JSON valido.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(400, { error: 'Envie um objeto JSON valido.' });
    }

    const input = body as Record<string, unknown>;
    const email = typeof input.email === 'string' ? input.email.trim() : '';
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(400, { error: 'Informe um email valido.' });
    }
    if (!name || name.length > 120) {
      return jsonResponse(400, { error: 'Informe um nome com ate 120 caracteres.' });
    }
    if (password.length < 6 || password.length > 1_024) {
      return jsonResponse(400, { error: 'Informe uma senha entre 6 e 1024 caracteres.' });
    }

    const { data: created, error: createError } = await backend.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { sea_role: 'professor' },
      // Compatibilidade durante a publicacao: o trigger novo ignora este role.
      user_metadata: { name, role: 'professor' },
    });
    if (createError || !created.user) {
      if (createError?.code === 'email_exists' || createError?.code === 'user_already_exists') {
        return jsonResponse(409, { error: 'Ja existe uma conta com este email.' });
      }
      const status = createError?.status === 400 || createError?.status === 422 ? 400 : 500;
      return jsonResponse(status, {
        error: 'Nao foi possivel criar o professor. Verifique o email e os requisitos da senha.',
      });
    }

    const { data: profile, error: profileError } = await backend
      .from('profiles')
      .select('role, ativo')
      .eq('id', created.user.id)
      .maybeSingle();
    if (profileError || profile?.role !== 'professor' || profile.ativo !== true) {
      return jsonResponse(500, {
        error: 'A conta foi criada, mas o perfil precisa ser verificado pela administracao. Nao repita o cadastro.',
      });
    }

    // Retorna apenas o identificador necessario; nunca o objeto completo do Auth.
    return jsonResponse(200, { success: true, user: { id: created.user.id } });
  } catch {
    return jsonResponse(500, { error: 'Nao foi possivel concluir o cadastro do professor.' });
  }
});
