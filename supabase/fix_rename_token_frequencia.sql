-- Corrige um bug introduzido em add_dados_celula.sql: ao renomear uma
-- célula que já tinha gerado um link de frequência, o passo que copiava
-- token_frequencia pra linha nova criava, por um instante, DUAS linhas
-- com o mesmo token — e token_frequencia é unique (add_frequencia_link.sql)
-- — gerando "duplicate key value violates unique constraint
-- celula_hierarquia_token_frequencia_key" e cancelando o renomear.
--
-- A correção: antes de criar a linha nova, zera o token_frequencia da
-- linha antiga (ela só é apagada no fim mesmo, continua existindo até
-- lá por causa das foreign keys de members/celula_encontros que ainda
-- apontam pro nome antigo). Assim só uma linha tem aquele token em
-- cada instante.
--
-- Rode uma vez no SQL Editor do Supabase — substitui editar_celula() e
-- editar_dados_celula() pela versão corrigida.

create or replace function editar_celula(
  p_celula text,
  p_novo_nome text,
  p_discipulador_id uuid,
  p_obreiro_id uuid
) returns text
language plpgsql security definer as $$
declare
  v_nome text := btrim(coalesce(p_novo_nome, ''));
  v_dia text;
  v_horario time;
  v_token text;
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

  select dia_semana, horario, token_frequencia into v_dia, v_horario, v_token
    from celula_hierarquia where celula = p_celula;

  -- Libera o token da linha antiga ANTES de criar a nova com ele —
  -- senão as duas coexistem por um instante e o unique recusa.
  update celula_hierarquia set token_frequencia = null where celula = p_celula;

  insert into celula_hierarquia (celula, discipulador_id, obreiro_id, dia_semana, horario, token_frequencia)
    values (v_nome, p_discipulador_id, p_obreiro_id, v_dia, v_horario, v_token);

  update members set celula = v_nome where celula = p_celula;
  update celula_encontros set celula = v_nome where celula = p_celula;
  delete from celula_hierarquia where celula = p_celula;

  return v_nome;
end;
$$;

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
  v_disc uuid;
  v_obr uuid;
  v_token text;
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

  select discipulador_id, obreiro_id, token_frequencia into v_disc, v_obr, v_token
    from celula_hierarquia where celula = p_celula;

  update celula_hierarquia set token_frequencia = null where celula = p_celula;

  insert into celula_hierarquia (celula, discipulador_id, obreiro_id, dia_semana, horario, token_frequencia)
    values (v_nome, v_disc, v_obr, v_dia, v_horario, v_token);

  update members set celula = v_nome where celula = p_celula;
  update celula_encontros set celula = v_nome where celula = p_celula;
  delete from celula_hierarquia where celula = p_celula;

  return v_nome;
end;
$$;
