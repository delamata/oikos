-- Cadastro de Membros acessível sem login, em versão limitada. A view
-- abaixo roda com o privilégio de quem criou (não do "anon"), então
-- ela decide exatamente quais colunas saem — nome, célula, tipo,
-- posição e idade só. Telefone, data de nascimento exata, estado
-- civil, batismo/encontro e tudo mais NUNCA saem daqui: quem não
-- loga não tem acesso a essas colunas de jeito nenhum, nem direto
-- pela API (o RLS de members continua bloqueando 100% pra "anon").
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_admin_area.sql.
-- Passo pra todo mundo, novo ou existente — igual add_rbac.sql.

create or replace view members_publico as
  select id, nome, celula, tipo, posicao,
    extract(year from age(current_date, nasc))::int as idade
  from members
  where active = true;

grant select on members_publico to anon;
