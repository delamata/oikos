-- Nova situação "Inativo": a pessoa continua cadastrada, com a célula
-- de origem preservada no histórico, mas não é contada em nenhum
-- relatório ou total de célula (o campo active vira false, igual aos
-- transferidos/perdidos). Diferente de "Perdido": inativo não entra na
-- contagem de Perdidos por Célula.
--
-- Rode uma vez no SQL Editor do Supabase.

alter table members drop constraint if exists members_situacao_saida_check;
alter table members add constraint members_situacao_saida_check
  check (situacao_saida in ('ativo', 'inativo', 'transferido_celula', 'transferido_rede', 'transferido_igreja', 'perdido'));
