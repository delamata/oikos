-- Casal divide a mesma rede de discipulado.
--
-- Antes, só quem estava marcado como discipulador/obreiro da célula em
-- celula_hierarquia enxergava aquela célula. Agora o cônjuge (vínculo
-- members.conjuge_id, feito na ficha da pessoa) enxerga a mesma rede.
-- Ex: Andre Delamata é discipulador das células X e Y; Simone Delamata,
-- casada com ele, passa a ver X e Y também.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_conjuge.sql.

-- Id do cônjuge de quem está logado (o app usa pra montar o Início).
create or replace function meu_conjuge_id() returns uuid
language sql security definer stable as $$
  select m.conjuge_id
  from profiles p
  join members m on m.id = p.member_id
  where p.user_id = auth.uid()
$$;

create or replace function pode_ver_celula(alvo text) returns boolean
language plpgsql security definer stable as $$
declare
  r record;
  v_conjuge uuid;
begin
  select * into r from meu_perfil();
  if r is null then return false; end if;
  if r.is_full then return true; end if;

  select conjuge_id into v_conjuge from members where id = r.member_id;

  -- A célula é da minha rede se eu OU meu cônjuge formos o discipulador
  -- ou o obreiro responsável por ela.
  if exists (
    select 1 from celula_hierarquia h
    where h.celula = alvo
      and (h.discipulador_id in (r.member_id, v_conjuge)
        or h.obreiro_id in (r.member_id, v_conjuge))
  ) then
    return true;
  end if;

  -- Fora isso, cada um vê a própria célula.
  return alvo = r.celula;
end;
$$;

-- ---------------------------------------------------------------------
-- Conferência (opcional): discipuladores e obreiros SEM cônjuge
-- vinculado. Se algum deles é casado, abra a ficha, marque "Casado (a)"
-- e escolha o cônjuge — só assim o cônjuge passa a ver a rede.
-- ---------------------------------------------------------------------
-- select m.nome, m.posicao, m.civil
-- from members m
-- where m.posicao in ('Discipulador', 'Obreiro')
--   and m.active = true
--   and m.conjuge_id is null
-- order by m.nome;
