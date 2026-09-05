-- Vínculo de cônjuge entre dois cadastros. Quando alguém está como
-- "Casado (a)", dá pra apontar (opcionalmente) o cadastro do cônjuge;
-- o app mantém o vínculo nos dois sentidos e replica a célula e a
-- situação de um para o outro, pra o casal nunca ficar em células
-- diferentes ou com um ativo e outro não.
--
-- Rode uma vez no SQL Editor do Supabase.

alter table members add column if not exists conjuge_id uuid references members(id) on delete set null;

create index if not exists members_conjuge_idx on members (conjuge_id);
