// Edge Function: cria um login (e-mail + senha inicial) para alguém já
// cadastrado em `members`, e vincula esse login ao cadastro em
// `profiles`. Só quem tem acesso total (Pastor/Pastor de Rede/admin)
// pode chamar isso — é a única parte do app que usa a chave secreta
// (service_role) do Supabase, e por isso precisa rodar aqui, nunca no
// navegador. Veja o passo a passo de deploy em README.md.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente "como quem chamou", só pra descobrir quem é e checar
    // se tem acesso total — usa a policy/função que já existe no
    // banco (meu_perfil()), não reimplementa a regra aqui.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Não autenticado.' }, 401);

    const { data: perfilRows, error: perfilErr } = await callerClient.rpc('meu_perfil');
    const perfil = Array.isArray(perfilRows) ? perfilRows[0] : perfilRows;
    if (perfilErr || !perfil || !perfil.is_full) {
      return json({ error: 'Só quem tem acesso total pode criar login para outra pessoa.' }, 403);
    }

    const body = await req.json();
    const email = (body.email || '').trim();
    const password = body.password || '';
    const memberId = body.member_id;
    if (!email || !password || !memberId) {
      return json({ error: 'Preencha e-mail, senha e a pessoa vinculada.' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'A senha inicial precisa ter pelo menos 6 caracteres.' }, 400);
    }

    // Daqui em diante usa a chave secreta — só essa function tem
    // acesso a ela, nunca o navegador.
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || 'Não foi possível criar o login.' }, 400);
    }

    const { error: profileErr } = await adminClient
      .from('profiles')
      .insert({ user_id: created.user.id, member_id: memberId });
    if (profileErr) {
      return json({ error: 'Login criado, mas não deu pra vincular ao cadastro: ' + profileErr.message }, 400);
    }

    return json({ user_id: created.user.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado.' }, 500);
  }
});
