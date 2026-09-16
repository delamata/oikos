-- Histórico de frequência vindo da planilha Google (o formulário que os
-- líderes preenchiam antes do módulo de Frequência do Oikos).
--
-- Por que uma tabela separada: a planilha registra TOTAIS por célula e
-- data (quantos membros, FAs, visitantes e kids estiveram), não quem
-- esteve. Os lançamentos feitos no Oikos são pessoa a pessoa
-- (celula_encontros / presencas_celula). Misturar os dois na mesma
-- tabela obrigaria a inventar nomes para completar os totais antigos —
-- então o histórico fica aqui, do jeito que foi coletado, e as duas
-- fontes aparecem lado a lado na tela.
--
-- Sem chave estrangeira para celula_hierarquia de propósito: a planilha
-- tem células que não existem mais (ex: "Junior e Luciana"), e o
-- histórico delas não pode ser perdido.
--
-- Rode uma vez no SQL Editor, depois de add_frequencia.sql. Em seguida
-- rode importar_historico_planilha.sql para trazer os dados.

create table if not exists frequencia_planilha (
  id uuid primary key default gen_random_uuid(),
  celula text not null,
  data date not null,
  rodizio boolean not null default false,   -- evento ponte / célula rodízio
  membros int not null default 0,
  fas int not null default 0,
  visitantes int not null default 0,
  kids int not null default 0,
  total int generated always as (membros + fas + visitantes + kids) stored,
  enviado_em timestamptz,                   -- carimbo do formulário
  importado_em timestamptz not null default now()
);

create index if not exists frequencia_planilha_celula_idx on frequencia_planilha (celula);
create index if not exists frequencia_planilha_data_idx on frequencia_planilha (data desc);

alter table frequencia_planilha enable row level security;

-- Mesmo escopo do resto: cada um enxerga o histórico das células que já
-- pode ver. Células que não existem mais ficam visíveis só para quem
-- tem acesso total.
drop policy if exists "frequencia_planilha_select" on frequencia_planilha;
create policy "frequencia_planilha_select" on frequencia_planilha
  for select to authenticated using (pode_ver_celula(celula));

-- Escrita só com acesso total (a importação roda no SQL Editor, como
-- dono do banco, e não depende desta policy).
drop policy if exists "frequencia_planilha_write" on frequencia_planilha;
create policy "frequencia_planilha_write" on frequencia_planilha
  for all to authenticated
  using ((select is_full from meu_perfil()))
  with check ((select is_full from meu_perfil()));
