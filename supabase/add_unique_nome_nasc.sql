-- Impede cadastrar a mesma pessoa duas vezes: bloqueia (no banco, pra
-- valer até pelo cadastro público sem login) um novo registro com o
-- mesmo nome e a mesma data de nascimento de alguém que já existe.
-- Rode uma vez no SQL Editor do Supabase.

-- Se a criação do índice abaixo der erro de "duplicada", já existem
-- dois cadastros com o mesmo nome (sem diferenciar maiúsculas/espaços)
-- e a mesma data de nascimento. Rode a consulta comentada abaixo pra
-- achar quem são e decida à mão o que fazer (corrigir o nome/data de
-- um deles, ou apagar o duplicado) antes de rodar esse arquivo de novo.
--
-- select lower(btrim(nome)) as nome_norm, nasc, array_agg(id) as ids, array_agg(nome) as nomes
-- from members
-- where nasc is not null
-- group by lower(btrim(nome)), nasc
-- having count(*) > 1;

create unique index if not exists members_nome_nasc_unique
  on members (lower(btrim(nome)), nasc)
  where nasc is not null;
