-- Hoje, pode_ver_celula(alvo) só decide algo quando "alvo" é uma célula.
-- Discipulador, Obreiro, Pastor de Rede e Pastor não têm célula (members.
-- celula = null por desenho, ver add_admin_area.sql) — e toda comparação
-- com "alvo = null" dá null, que a RLS trata como false. Resultado: hoje
-- SÓ quem tem acesso total (is_full) consegue ver essas pessoas em
-- Cadastro de Membros; um Líder não vê nem o próprio discipulador, nem o
-- obreiro da sua rede, nem a si mesmo se ele próprio for um deles.
--
-- Esta migração resolve isso com uma regra simples, usando a MESMA
-- hierarquia que pode_ver_celula() já respeita: alguém sem célula fica
-- visível para quem já pode ver pelo menos uma célula onde essa pessoa é
-- discipulador_id ou obreiro_id — ou seja, exatamente quem está "acima"
-- dela na rede (Líder vê o discipulador e o obreiro da própria célula;
-- Discipulador vê o obreiro/pastor de rede acima dele; etc.), além de
-- cada um sempre ver a si mesmo/ao cônjuge. Acesso total continua vendo
-- todo mundo.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_relatorios_acesso.sql
-- (usa pode_ver_celula(), definida lá).

create or replace function pode_ver_pessoa_sem_celula(p_alvo_id uuid) returns boolean
language plpgsql security definer stable as $$
declare
  r record;
  v_conjuge uuid;
begin
  select * into r from meu_perfil();
  if r is null then return false; end if;
  if r.is_full then return true; end if;

  select conjuge_id into v_conjuge from members where id = r.member_id;

  if p_alvo_id in (r.member_id, v_conjuge) then
    return true;
  end if;

  return exists (
    select 1 from celula_hierarquia h
    where pode_ver_celula(h.celula)
      and (h.discipulador_id = p_alvo_id or h.obreiro_id = p_alvo_id)
  );
end;
$$;

grant execute on function pode_ver_pessoa_sem_celula(uuid) to authenticated;

drop policy if exists "members_select_scope" on members;
create policy "members_select_scope" on members
  for select using (
    case when celula is null then pode_ver_pessoa_sem_celula(id) else pode_ver_celula(celula) end
  );
