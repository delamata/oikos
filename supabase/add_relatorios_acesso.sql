-- Relatórios + novo nível de acesso do Pastor de Rede.
--
-- O que muda (vale para o sistema TODO, não só para o Relatórios):
--   - Pastor de Rede deixa de ter acesso total. Passa a ver o mesmo que o
--     Obreiro: as células em que está marcado como obreiro responsável
--     (Administração → célula) e as células dos discipuladores que ele
--     supervisiona (campo "Supervisor" na ficha do discipulador).
--   - Obreiro ganha esse mesmo caminho pelo "Supervisor".
--   - Acesso total fica só para Pastor e admin (profiles.is_admin).
--   - Nova function minhas_celulas(): lista as células que quem está
--     logado enxerga. O app usa para montar os filtros do Relatórios.
--
-- ANTES de rodar, confira quem é Pastor de Rede e o que ele vai passar a
-- ver (consulta no fim do arquivo, comentada). Quem ficar com 0 células
-- precisa ser marcado como obreiro das células dele em Administração —
-- ou, se deve continuar vendo tudo, receber is_admin:
--   update profiles set is_admin = true where member_id = '<id da pessoa>';
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_rede_conjuge.sql.

create or replace function meu_perfil()
returns table(is_full boolean, celula text, posicao text, member_id uuid)
language sql security definer stable as $$
  select
    coalesce(p.is_admin, false) or m.posicao = 'Pastor',
    m.celula, m.posicao, m.id
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
  -- ou o obreiro/pastor de rede responsável por ela, ou se supervisiono
  -- o discipulador dela.
  if exists (
    select 1 from celula_hierarquia h
    left join members d on d.id = h.discipulador_id
    where h.celula = alvo
      and (h.discipulador_id in (r.member_id, v_conjuge)
        or h.obreiro_id in (r.member_id, v_conjuge)
        or d.supervisor_id in (r.member_id, v_conjuge))
  ) then
    return true;
  end if;

  -- Fora isso, cada um vê a própria célula.
  return alvo = r.celula;
end;
$$;

create or replace function minhas_celulas() returns setof text
language sql security definer stable as $$
  select h.celula from celula_hierarquia h where pode_ver_celula(h.celula) order by h.celula
$$;

grant execute on function minhas_celulas() to authenticated;

-- ---------------------------------------------------------------------
-- Conferência (rode ANTES, sozinha): cada Pastor de Rede e Obreiro, e
-- quantas células vai enxergar com a regra nova.
-- ---------------------------------------------------------------------
-- select m.nome, m.posicao, coalesce(p.is_admin, false) as is_admin,
--   (select count(*) from celula_hierarquia h
--      left join members d on d.id = h.discipulador_id
--     where h.obreiro_id in (m.id, m.conjuge_id)
--        or h.discipulador_id in (m.id, m.conjuge_id)
--        or d.supervisor_id in (m.id, m.conjuge_id)) as celulas_que_vai_ver
-- from members m
-- left join profiles p on p.member_id = m.id
-- where m.posicao in ('Pastor de Rede', 'Obreiro') and m.active
-- order by m.posicao, m.nome;
