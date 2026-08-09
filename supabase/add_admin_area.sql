-- Área de Admin: células dinâmicas + liderança sênior sem célula
-- obrigatória. Rode uma vez no SQL Editor do Supabase, depois de
-- add_rbac.sql (novos projetos também precisam rodar isso — não é
-- um "se já existia antes"). Veja o passo a passo em README.md.

-- 1. Célula deixa de ser obrigatória — Discipulador, Obreiro, Pastor e
--    Pastor de Rede não pertencem a uma célula específica.
alter table members alter column celula drop not null;

-- 2. Limpa o workaround antigo: antes dessa mudança, quem era
--    Discipulador/Obreiro/Pastor ficava preso numa célula-fantasma
--    chamada 'Discipulador' (rotulada "Discipulado" na tela) só pra
--    satisfazer o "not null". Agora esse caso vira null de verdade.
update members set celula = null
  where celula = 'Discipulador'
    and posicao in ('Discipulador', 'Obreiro', 'Pastor', 'Pastor de Rede');

delete from celula_hierarquia
  where celula = 'Discipulador'
    and not exists (select 1 from members where celula = 'Discipulador');

-- 3. Garante que toda célula já usada em members está no registro de
--    células, para a foreign key do passo 4 nunca falhar por
--    divergência de dados antigos.
insert into celula_hierarquia (celula)
  select distinct celula from members
  where celula is not null and celula not in (select celula from celula_hierarquia)
  on conflict (celula) do nothing;

-- 4. celula_hierarquia vira o registro oficial de células (a tela de
--    admin cadastra células ali). members.celula passa a apontar pra
--    lá, e só é opcional para liderança sênior.
alter table members drop constraint if exists members_celula_fkey;
alter table members add constraint members_celula_fkey
  foreign key (celula) references celula_hierarquia(celula);

alter table members drop constraint if exists members_celula_required_check;
alter table members add constraint members_celula_required_check
  check (celula is not null or posicao in ('Discipulador', 'Obreiro', 'Pastor', 'Pastor de Rede'));

-- 5. O cadastro público (sem login) também precisa listar as células
--    pra pessoa escolher a dela — hoje só quem está logado podia ler
--    celula_hierarquia.
drop policy if exists "hierarquia_select_anon" on celula_hierarquia;
create policy "hierarquia_select_anon" on celula_hierarquia
  for select to anon using (true);
