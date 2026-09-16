-- Célula e culto acontecem em dias diferentes, então passam a ser
-- lançamentos separados, cada um com a sua data.
--
-- O que muda: a presença no culto deixa de ser uma coluna do encontro da
-- célula. Ela continua em cultos / presencas_culto (mesmas tabelas de
-- sempre), só que agora com a data do culto, independente da data em que
-- a célula se reuniu.
--
-- Nenhum dado é apagado: celula_encontros.culto_id continua lá (só não é
-- mais preenchido) e todas as presenças já lançadas seguem valendo.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_frequencia.sql.

-- ---------------------------------------------------------------------
-- 1. Resumo do encontro da célula — sem as colunas de culto
-- ---------------------------------------------------------------------
drop view if exists frequencia_encontros;
create view frequencia_encontros with (security_invoker = true) as
  select
    e.id,
    e.celula,
    e.data,
    e.lider_id,
    count(p.*) filter (where p.id is not null)                         as pessoas,
    count(p.*) filter (where p.presente)                               as presentes,
    count(p.*) filter (where not p.presente)                           as ausentes,
    count(m.*) filter (where m.status_pessoa = 'Visitante')            as visitantes,
    count(m.*) filter (where m.status_pessoa = 'Frequentador Assíduo') as fas,
    count(m.*) filter (where m.status_pessoa = 'Membro')               as membros
  from celula_encontros e
  left join presencas_celula p on p.encontro_id = e.id
  left join members m on m.id = p.member_id
  group by e.id, e.celula, e.data, e.lider_id;

grant select on frequencia_encontros to authenticated;

-- ---------------------------------------------------------------------
-- 2. Resumo do culto, por célula — a partir de presencas_culto
-- ---------------------------------------------------------------------
drop view if exists frequencia_cultos;
create view frequencia_cultos with (security_invoker = true) as
  select
    c.id            as culto_id,
    c.data,
    m.celula,
    count(pc.*)                              as pessoas,
    count(pc.*) filter (where pc.presente)   as presentes
  from presencas_culto pc
  join cultos c on c.id = pc.culto_id
  join members m on m.id = pc.member_id
  group by c.id, c.data, m.celula;

grant select on frequencia_cultos to authenticated;

create index if not exists cultos_data_idx on cultos (data desc);

-- ---------------------------------------------------------------------
-- 3. Limpeza: a função que amarrava o culto à semana do encontro não é
--    mais usada (a data do culto agora é escolhida no lançamento).
-- ---------------------------------------------------------------------
drop function if exists culto_da_semana(date);

comment on column celula_encontros.culto_id is
  'Histórico: ligava o encontro ao culto da semana, quando os dois eram lançados juntos. Não é mais preenchido — o culto tem lançamento e data próprios.';
