-- Dia e horário da célula + edição "leve" (nome, dia, horário) para
-- quem lidera no dia a dia, não só Pastor/admin:
--   - Líder e Líder em Treinamento editam a própria célula.
--   - Discipulador edita todas as células da sua rede de discipulado.
--   - Pastor/admin (acesso total) edita qualquer uma, como já faziam.
-- Reatribuir discipulador/obreiro continua exclusivo de Administração
-- (editar_celula) — aqui não dá pra mexer nisso.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_frequencia.sql
-- (a função abaixo também move celula_encontros ao renomear).

-- 1. Colunas novas em celula_hierarquia.
alter table celula_hierarquia add column if not exists dia_semana text;
alter table celula_hierarquia add column if not exists horario time;

alter table celula_hierarquia drop constraint if exists celula_hierarquia_dia_semana_check;
alter table celula_hierarquia add constraint celula_hierarquia_dia_semana_check
  check (dia_semana is null or dia_semana in (
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ));

-- 2. Quem pode editar nome/dia/horário de uma célula (mais permissivo
--    que editar_celula/hierarquia_write_full, que é só acesso total).
create or replace function pode_editar_celula(alvo text) returns boolean
language plpgsql security definer stable as $$
declare r record;
begin
  select * into r from meu_perfil();
  if r is null then return false; end if;
  if r.is_full then return true; end if;
  if r.posicao = 'Discipulador' then
    return exists (select 1 from celula_hierarquia where celula = alvo and discipulador_id = r.member_id);
  end if;
  if r.posicao in ('Líder', 'Líder em Treinamento') then
    return alvo = r.celula;
  end if;
  return false;
end;
$$;

grant execute on function pode_editar_celula(text) to authenticated;

-- 3. Editar nome/dia/horário — versão "leve" de editar_celula(), aberta
--    a quem pode_editar_celula() autorizar, sem mexer em discipulador/
--    obreiro. Renomear leva as pessoas, os encontros e o link de
--    frequência junto, numa transação só.
create or replace function editar_dados_celula(
  p_celula text,
  p_novo_nome text,
  p_dia_semana text,
  p_horario text
) returns text
language plpgsql security definer as $$
declare
  v_nome text := btrim(coalesce(p_novo_nome, ''));
  v_dia text := nullif(btrim(coalesce(p_dia_semana, '')), '');
  v_horario time := nullif(btrim(coalesce(p_horario, '')), '')::time;
begin
  if not pode_editar_celula(p_celula) then
    raise exception 'Você não tem acesso para editar esta célula.';
  end if;
  if v_nome = '' then
    raise exception 'Digite o nome da célula.';
  end if;
  if v_dia is not null and v_dia not in (
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ) then
    raise exception 'Dia da célula inválido: %', v_dia;
  end if;
  if not exists (select 1 from celula_hierarquia where celula = p_celula) then
    raise exception 'Célula não encontrada: %', p_celula;
  end if;

  if v_nome = p_celula then
    update celula_hierarquia
      set dia_semana = v_dia, horario = v_horario
      where celula = p_celula;
    return v_nome;
  end if;

  if exists (
    select 1 from celula_hierarquia
    where lower(celula) = lower(v_nome) and celula <> p_celula
  ) then
    raise exception 'Já existe uma célula chamada "%".', v_nome;
  end if;

  insert into celula_hierarquia (celula, discipulador_id, obreiro_id, dia_semana, horario, token_frequencia)
    select v_nome, discipulador_id, obreiro_id, v_dia, v_horario, token_frequencia
    from celula_hierarquia where celula = p_celula;
  update members set celula = v_nome where celula = p_celula;
  update celula_encontros set celula = v_nome where celula = p_celula;
  delete from celula_hierarquia where celula = p_celula;

  return v_nome;
end;
$$;

grant execute on function editar_dados_celula(text, text, text, text) to authenticated;

-- 4. editar_celula() (Administração) também precisa levar dia_semana,
--    horario e token_frequencia ao renomear — sem isso, cada vez que um
--    Pastor/admin renomeasse uma célula por lá, esses dados se perdiam.
--    (token_frequencia já se perdia antes desta migração também; corrige
--    de brinde.)
create or replace function editar_celula(
  p_celula text,
  p_novo_nome text,
  p_discipulador_id uuid,
  p_obreiro_id uuid
) returns text
language plpgsql security definer as $$
declare
  v_nome text := btrim(coalesce(p_novo_nome, ''));
begin
  if not coalesce((select is_full from meu_perfil()), false) then
    raise exception 'Só Pastor ou administrador pode editar células.';
  end if;
  if v_nome = '' then
    raise exception 'Digite o nome da célula.';
  end if;
  if not exists (select 1 from celula_hierarquia where celula = p_celula) then
    raise exception 'Célula não encontrada: %', p_celula;
  end if;

  if v_nome = p_celula then
    update celula_hierarquia
      set discipulador_id = p_discipulador_id, obreiro_id = p_obreiro_id
      where celula = p_celula;
    return v_nome;
  end if;

  if exists (
    select 1 from celula_hierarquia
    where lower(celula) = lower(v_nome) and celula <> p_celula
  ) then
    raise exception 'Já existe uma célula chamada "%".', v_nome;
  end if;

  insert into celula_hierarquia (celula, discipulador_id, obreiro_id, dia_semana, horario, token_frequencia)
    select v_nome, p_discipulador_id, p_obreiro_id, dia_semana, horario, token_frequencia
    from celula_hierarquia where celula = p_celula;
  update members set celula = v_nome where celula = p_celula;
  update celula_encontros set celula = v_nome where celula = p_celula;
  delete from celula_hierarquia where celula = p_celula;

  return v_nome;
end;
$$;
