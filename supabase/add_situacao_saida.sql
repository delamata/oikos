-- Adiciona o controle de saída da rede (transferência ou perdido) ao
-- cadastro de membros. Rode uma vez no SQL Editor do Supabase.

alter table members add column if not exists situacao_saida text not null default 'ativo';
alter table members add column if not exists saida_detalhe text;

alter table members drop constraint if exists members_situacao_saida_check;
alter table members add constraint members_situacao_saida_check
  check (situacao_saida in ('ativo', 'transferido_celula', 'transferido_rede', 'transferido_igreja', 'perdido'));

-- Enquanto situacao_saida = 'ativo', active continua true. Quando a
-- situação mudar para qualquer outro valor pelo app, active vira false
-- automaticamente (a pessoa some da listagem principal, mas continua no
-- banco para o relatório de Perdidos por Célula e o histórico em
-- Movimentações). 
