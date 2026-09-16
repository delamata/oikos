// Oikos IA — responde perguntas em linguagem natural sobre os dados do
// Oikos.
//
// Como a segurança funciona aqui:
//
// 1. Toda consulta é feita com o TOKEN DE QUEM PERGUNTOU (nunca com a
//    service_role). Assim a RLS do Postgres continua valendo: um líder
//    só soma a própria célula, um discipulador a rede dele, e por aí.
//    O modelo de IA não tem como ver o que o usuário não veria.
// 2. O modelo NÃO recebe o banco nem gera SQL. Esta função calcula um
//    painel de indicadores (números já agregados + listas curtas) e só
//    esse painel é enviado.
// 3. O prompt proíbe inventar: sem dado no painel, a resposta é que o
//    Oikos não tem essa informação.
//
// Publicar:  supabase functions deploy oikos-ia
// Segredo:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function pct(parte: number, total: number) {
  return total ? Math.round((parte / total) * 1000) / 10 : 0;
}

type Encontro = {
  celula: string; data: string; pessoas: number; presentes: number; ausentes: number;
  presentes_culto: number; visitantes: number; fas: number; membros: number;
};

function somar(rows: Encontro[]) {
  const s = (campo: keyof Encontro) => rows.reduce((acc, r) => acc + Number(r[campo] || 0), 0);
  const pessoas = s('pessoas'), presentes = s('presentes'), culto = s('presentes_culto');
  return {
    encontros: rows.length,
    lancamentos: pessoas,
    presentes_celula: presentes,
    ausentes_celula: s('ausentes'),
    presentes_culto: culto,
    percentual_presenca_celula: pct(presentes, pessoas),
    percentual_presenca_culto: pct(culto, pessoas),
    visitantes: s('visitantes'),
    frequentadores_assiduos: s('fas'),
    membros: s('membros'),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const auth = req.headers.get('Authorization') || '';
    if (!auth) return json({ error: 'Faça login para usar o Oikos IA.' }, 401);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'A chave da Anthropic ainda não foi configurada no Supabase (segredo ANTHROPIC_API_KEY).' }, 500);
    }

    const { pergunta } = await req.json().catch(() => ({ pergunta: '' }));
    if (!pergunta || !String(pergunta).trim()) return json({ error: 'Escreva uma pergunta.' }, 400);

    // Cliente com o token de quem perguntou: a RLS faz o recorte.
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: perfilRows } = await sb.rpc('meu_perfil');
    const perfil = Array.isArray(perfilRows) ? perfilRows[0] : perfilRows;
    if (!perfil || !perfil.member_id) {
      return json({ error: 'Seu login ainda não está vinculado a um cadastro no Oikos.' }, 403);
    }
    if (!perfil.is_full) {
      return json({ error: 'O Oikos IA está disponível para Pastor, Pastor de Rede e administradores.' }, 403);
    }

    // ---- Painel de indicadores (tudo já filtrado pela RLS) ----
    const hoje = new Date().toISOString().slice(0, 10);
    const d7 = diasAtras(7), d28 = diasAtras(28), d56 = diasAtras(56), d30 = diasAtras(30), d90 = diasAtras(90), d180 = diasAtras(180);

    const [encRes, membrosRes, hierRes, movRes, presRes] = await Promise.all([
      sb.from('frequencia_encontros').select('*').gte('data', d180).order('data', { ascending: false }),
      sb.from('members').select('id, nome, celula, posicao, status_pessoa, funcao, active, primeira_visita, created_at'),
      sb.from('celula_hierarquia').select('*'),
      sb.from('movimentacoes').select('member_id, campo, valor_anterior, valor_novo, data').gte('data', d180),
      sb.from('presencas_celula').select('member_id, presente, celula_encontros(data, celula)').limit(5000),
    ]);

    const encontros: Encontro[] = (encRes.data || []) as Encontro[];
    const membros = membrosRes.data || [];
    const hierarquia = hierRes.data || [];
    const movs = movRes.data || [];
    const presencas = (presRes.data || []) as any[];

    const ativos = membros.filter((m: any) => m.active !== false);
    const statusDe = (m: any) => m.status_pessoa || (['Visitante', 'Frequentador Assíduo'].includes(m.posicao) ? m.posicao : 'Membro');

    const ultimaSemana = encontros.filter((e) => e.data >= d7);
    const ultimas4 = encontros.filter((e) => e.data >= d28);
    const quatroAnteriores = encontros.filter((e) => e.data >= d56 && e.data < d28);

    // Frequência por célula, nas 4 semanas atuais e nas 4 anteriores
    const porCelula: Record<string, any> = {};
    for (const e of encontros) {
      const c = (porCelula[e.celula] ||= { celula: e.celula, encontros: 0, presentes: 0, lancamentos: 0, culto: 0, visitantes: 0, ultimo_lancamento: e.data });
      c.encontros++; c.presentes += Number(e.presentes || 0); c.lancamentos += Number(e.pessoas || 0);
      c.culto += Number(e.presentes_culto || 0); c.visitantes += Number(e.visitantes || 0);
      if (e.data > c.ultimo_lancamento) c.ultimo_lancamento = e.data;
    }
    const mediaPorCelula = (rows: Encontro[]) => {
      const m: Record<string, { presentes: number; encontros: number }> = {};
      for (const e of rows) {
        const c = (m[e.celula] ||= { presentes: 0, encontros: 0 });
        c.presentes += Number(e.presentes || 0); c.encontros++;
      }
      return m;
    };
    const atual = mediaPorCelula(ultimas4), anterior = mediaPorCelula(quatroAnteriores);
    const tendencia = Object.keys({ ...atual, ...anterior }).map((celula) => {
      const a = atual[celula]?.presentes ?? 0, b = anterior[celula]?.presentes ?? 0;
      return {
        celula,
        presentes_ultimas_4_semanas: a,
        presentes_4_semanas_anteriores: b,
        variacao_percentual: b ? Math.round(((a - b) / b) * 1000) / 10 : null,
        situacao: a > b ? 'crescimento' : a < b ? 'queda' : 'estável',
      };
    });

    // Células que ainda não lançaram nesta semana
    const celulasComLancamento = new Set(ultimaSemana.map((e) => e.celula));
    const semLancamento = hierarquia
      .map((h: any) => h.celula)
      .filter((c: string) => !celulasComLancamento.has(c));

    // Visitantes
    const visitantes = ativos.filter((m: any) => statusDe(m) === 'Visitante');
    const visitantesDoMes = visitantes.filter((m: any) => (m.primeira_visita || m.created_at?.slice(0, 10) || '') >= d30);
    const presencasPorPessoa: Record<string, number> = {};
    const ultimaPresenca: Record<string, string> = {};
    for (const p of presencas) {
      const info = Array.isArray(p.celula_encontros) ? p.celula_encontros[0] : p.celula_encontros;
      if (!info || !p.presente) continue;
      presencasPorPessoa[p.member_id] = (presencasPorPessoa[p.member_id] || 0) + 1;
      if (!ultimaPresenca[p.member_id] || info.data > ultimaPresenca[p.member_id]) ultimaPresenca[p.member_id] = info.data;
    }
    const visitantesRecorrentes = visitantes
      .filter((m: any) => (presencasPorPessoa[m.id] || 0) > 2)
      .map((m: any) => ({ nome: m.nome, celula: m.celula, presencas: presencasPorPessoa[m.id] }))
      .slice(0, 50);

    // Quem não aparece há 4 semanas (só quem já tem histórico de presença)
    const semPresencaRecente = ativos
      .filter((m: any) => ultimaPresenca[m.id] && ultimaPresenca[m.id] < d28)
      .map((m: any) => ({ nome: m.nome, celula: m.celula, status: statusDe(m), ultima_presenca: ultimaPresenca[m.id] }))
      .slice(0, 60);

    // Mudanças de status nos últimos 6 meses (Visitante → FA → Membro)
    const nomePorId: Record<string, string> = {};
    for (const m of membros) nomePorId[m.id] = m.nome;
    const mudancasStatus = movs
      .filter((m: any) => m.campo === 'status_pessoa' || m.campo === 'posicao')
      .map((m: any) => ({ pessoa: nomePorId[m.member_id] || 'desconhecido', de: m.valor_anterior, para: m.valor_novo, data: String(m.data).slice(0, 10) }))
      .slice(0, 80);

    const composicao = {
      total_ativos: ativos.length,
      membros: ativos.filter((m: any) => statusDe(m) === 'Membro').length,
      frequentadores_assiduos: ativos.filter((m: any) => statusDe(m) === 'Frequentador Assíduo').length,
      visitantes: visitantes.length,
      por_funcao: ativos.reduce((acc: Record<string, number>, m: any) => {
        const f = m.funcao || (['Visitante', 'Frequentador Assíduo', 'Membro'].includes(m.posicao) ? null : m.posicao);
        if (f) acc[f] = (acc[f] || 0) + 1;
        return acc;
      }, {}),
    };

    const redes = hierarquia.map((h: any) => ({
      celula: h.celula,
      discipulador: nomePorId[h.discipulador_id] || null,
      obreiro_ou_pastor_de_rede: nomePorId[h.obreiro_id] || null,
      pessoas_ativas: ativos.filter((m: any) => m.celula === h.celula).length,
    }));

    const painel = {
      hoje,
      escopo_do_usuario: perfil.is_full ? 'acesso total (todas as células que a permissão dele alcança)' : 'escopo restrito',
      observacao: 'Todos os números já estão filtrados pela permissão de quem perguntou. Períodos: "semana" = últimos 7 dias; "mês" = últimos 30 dias.',
      frequencia_ultima_semana: somar(ultimaSemana),
      frequencia_ultimas_4_semanas: somar(ultimas4),
      frequencia_4_semanas_anteriores: somar(quatroAnteriores),
      frequencia_por_celula_180_dias: Object.values(porCelula),
      tendencia_por_celula: tendencia,
      celulas_sem_lancamento_nesta_semana: semLancamento,
      composicao_da_rede: composicao,
      visitantes_ultimos_30_dias: visitantesDoMes.map((m: any) => ({ nome: m.nome, celula: m.celula, primeira_visita: m.primeira_visita })).slice(0, 60),
      visitantes_com_mais_de_duas_presencas: visitantesRecorrentes,
      pessoas_sem_presenca_ha_mais_de_4_semanas: semPresencaRecente,
      mudancas_de_status_ultimos_6_meses: mudancasStatus,
      celulas_e_responsaveis: redes,
    };

    const system = [
      'Você é o Oikos IA, assistente da rede de células Videira SCS / Rede Oikos.',
      'Responda SEMPRE em português do Brasil, de forma direta e objetiva.',
      'Use EXCLUSIVAMENTE os dados do painel JSON fornecido. Nunca invente números, nomes ou tendências.',
      'Se o painel não tiver o dado necessário, responda exatamente: "Não existem informações suficientes no Oikos para responder essa pergunta." e diga, em uma linha, o que precisaria ser lançado no sistema para que a resposta exista.',
      'Sempre que possível mostre os números usados (valores absolutos e percentuais) e compare com o período anterior.',
      'Se a resposta ficar melhor como tabela, use tabela em markdown simples. Listas longas: no máximo 15 itens, dizendo quantos ficaram de fora.',
      'Não peça desculpas nem explique como você funciona. Não mencione JSON, banco de dados, RLS ou permissões.',
      'Os dados já vêm filtrados pela permissão de quem perguntou — trate-os como o universo completo disponível para essa pessoa.',
    ].join(' ');

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Dá pra trocar por um modelo mais barato sem mexer no código:
        // basta criar o segredo OIKOS_IA_MODEL no Supabase (ex:
        // claude-haiku-4-5-20251001).
        model: Deno.env.get('OIKOS_IA_MODEL') || 'claude-sonnet-5',
        max_tokens: 1200,
        system,
        messages: [
          { role: 'user', content: 'Painel de indicadores do Oikos (JSON):\n' + JSON.stringify(painel) + '\n\nPergunta: ' + pergunta },
        ],
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error('Anthropic API:', resposta.status, detalhe);
      return json({ error: 'O serviço de IA não respondeu agora (código ' + resposta.status + '). Tente de novo em instantes.' }, 502);
    }

    const body = await resposta.json();
    const texto = (body.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();
    return json({ resposta: texto || 'Não existem informações suficientes no Oikos para responder essa pergunta.' });
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro inesperado ao consultar o Oikos IA.' }, 500);
  }
});
