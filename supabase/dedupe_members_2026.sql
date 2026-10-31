-- Encontra e remove cadastros duplicados em members (gerados por
-- cadastro repetido, não pelo seed.sql — para aquele caso antigo veja
-- dedupe_members.sql). Rode no SQL Editor do Supabase, PASSO A PASSO,
-- na ordem abaixo. Não execute o arquivo inteiro de uma vez: confira o
-- resultado de cada select antes de ir para o próximo passo.

-- ---------------------------------------------------------------------
-- PASSO 1 — VALIDAR (alta confiança): mesmo nome (ignorando maiúsculas
-- e espaços extras) E mesma data de nascimento. É a mesma regra que o
-- banco já proíbe daqui pra frente (members_nome_nasc_unique,
-- add_unique_nome_nasc.sql) — quem aparece aqui furou essa regra antes
-- dela existir, ou teve o nascimento preenchido depois.
-- ---------------------------------------------------------------------
select
  nome, nasc, count(*) as copias,
  array_agg(numero order by numero) as matriculas,
  array_agg(celula order by numero) as celulas,
  array_agg(posicao order by numero) as posicoes,
  array_agg(id order by numero) as ids
from members
where nasc is not null
group by lower(btrim(nome)), nasc, nome
having count(*) > 1
order by nome;

-- ---------------------------------------------------------------------
-- PASSO 2 — VALIDAR (revisão manual): mesmo nome, mas nascimento
-- ausente ou diferente em pelo menos um dos cadastros. NÃO dá pra
-- apagar automaticamente — pode ser gente real com o mesmo nome (comum
-- em Kids e Juvenis, que às vezes não têm nascimento preenchido).
-- Compare célula/telefone/posição antes de decidir. Para excluir um
-- destes, use o botão "Excluir" (só Admin) na ficha da pessoa, dentro
-- do próprio Cadastro de Membros.
-- ---------------------------------------------------------------------
select
  nome, count(*) as copias,
  array_agg(numero order by numero) as matriculas,
  array_agg(nasc order by numero) as nascimentos,
  array_agg(celula order by numero) as celulas,
  array_agg(tel order by numero) as telefones,
  array_agg(id order by numero) as ids
from members
group by lower(btrim(nome))
having count(*) > 1
order by nome;

-- ---------------------------------------------------------------------
-- PASSO 3 — CONFERIR quem seria removido pelo Passo 4, antes de apagar
-- de verdade. Mantém, em cada grupo do Passo 1 (mesmo nome + mesmo
-- nascimento), o cadastro de MENOR Nº de matrícula (o mais antigo) —
-- os outros do mesmo grupo entram na lista de remoção.
-- ---------------------------------------------------------------------
create temporary table if not exists duplicados_para_apagar as
select id
from (
  select id, row_number() over (partition by lower(btrim(nome)), nasc order by numero) as posicao
  from members
  where nasc is not null
) t
where posicao > 1;

select m.numero, m.nome, m.celula, m.posicao, m.nasc
from members m
join duplicados_para_apagar d on d.id = m.id
order by m.nome, m.numero;

-- ---------------------------------------------------------------------
-- PASSO 4 — APAGAR. Só rode depois de conferir a lista do Passo 3 e
-- estar de acordo com ela. Limpa primeiro qualquer vínculo em
-- celula_hierarquia (caso um duplicado tenha sido marcado, por engano,
-- como discipulador/obreiro de alguma célula — do contrário o apagar
-- falharia). Histórico de movimentações e presença dessas pessoas é
-- removido junto (é assim que o banco já funciona hoje). Isso NÃO pode
-- ser desfeito.
-- ---------------------------------------------------------------------
update celula_hierarquia set discipulador_id = null
  where discipulador_id in (select id from duplicados_para_apagar);
update celula_hierarquia set obreiro_id = null
  where obreiro_id in (select id from duplicados_para_apagar);

delete from members where id in (select id from duplicados_para_apagar);

drop table duplicados_para_apagar;

-- Confira o total depois de apagar:
select count(*) as total_membros from members;
