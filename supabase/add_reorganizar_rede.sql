-- Quando um Discipulador ou um Obreiro/Pastor de Rede deixa de estar
-- Ativo (campo "Situação" sai de "Ativo" — perdido, inativo ou
-- transferido), as células e pessoas que reportavam a ele passam
-- automaticamente para quem já respondia um nível acima, até que
-- alguém marque um substituto em Administração:
--
--   - Discipulador saiu: os líderes que tinham ele como "Supervisor"
--     passam a reportar ao Obreiro/Pastor já responsável pela célula de
--     cada um; as células dele ficam com "Discipulador: Não definido".
--   - Obreiro/Pastor de Rede saiu: os discipuladores que tinham ele como
--     "Supervisor" passam a reportar a quem ELE reportava (o Pastor); as
--     células onde ele era o Obreiro/Pastor responsável passam para esse
--     mesmo Pastor (ou ficam "Não definido" se ele também não tinha
--     supervisor cadastrado).
--
-- Reativar a pessoa depois NÃO desfaz a reorganização — quem assumiu
-- continua responsável até alguém trocar manualmente em Administração.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_hierarquia_status.sql
-- (usa celula_hierarquia, members.funcao e members.supervisor_id).

create or replace function reorganizar_rede_ao_sair() returns trigger
language plpgsql security definer as $$
begin
  -- Só age na transição Ativo → qualquer outra situação.
  if old.situacao_saida = 'ativo' and new.situacao_saida is distinct from 'ativo' then

    if old.funcao = 'Discipulador' then
      -- Líderes dela passam a reportar ao Obreiro/Pastor já responsável
      -- pela própria célula de cada um (fica "Não definido" se a célula
      -- também não tiver um Obreiro cadastrado).
      update members m
      set supervisor_id = h.obreiro_id
      from celula_hierarquia h
      where m.supervisor_id = old.id
        and m.celula = h.celula;

      -- As células dela ficam sem discipulador até alguém novo ser cadastrado.
      update celula_hierarquia set discipulador_id = null where discipulador_id = old.id;
    end if;

    if old.funcao in ('Obreiro', 'Pastor de Rede') then
      -- Discipuladores dele passam a reportar a quem ELE reportava.
      update members set supervisor_id = old.supervisor_id where supervisor_id = old.id;

      -- As células onde ele era o responsável passam para o mesmo alvo.
      update celula_hierarquia set obreiro_id = old.supervisor_id where obreiro_id = old.id;
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists members_reorganizar_rede on members;
create trigger members_reorganizar_rede
  after update on members
  for each row execute function reorganizar_rede_ao_sair();

-- ---------------------------------------------------------------------
-- Conferência (rode à parte, a qualquer momento): células sem
-- discipulador ou sem obreiro/pastor responsável agora.
-- ---------------------------------------------------------------------
-- select celula, discipulador_id, obreiro_id
-- from celula_hierarquia
-- where discipulador_id is null or obreiro_id is null
-- order by celula;
