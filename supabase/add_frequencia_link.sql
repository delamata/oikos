-- Lançamento de frequência por link, sem login.
--
-- Cada célula ganha um link próprio (com um código secreto) que o líder
-- guarda no celular. Abrindo o link ele marca a presença da célula dele
-- e pronto — não precisa de conta nem de senha.
--
-- Por que um código em vez de deixar aberto como o cadastro público: o
-- cadastro público só CRIA um visitante, enquanto aqui se escreve a
-- frequência de uma célula existente. O código limita cada link a uma
-- única célula e, se vazar, o admin gera outro e o antigo para de valer.
--
-- Nada aqui abre a tabela members para quem não tem login: as funções
-- rodam com privilégio próprio, devolvem só nome/status das pessoas
-- daquela célula e escrevem só a presença daquele encontro.
--
-- Rode uma vez no SQL Editor, depois de add_frequencia.sql.

alter table celula_hierarquia add column if not exists token_frequencia text unique;

-- Marca de onde veio o lançamento (app com login, ou link público).
alter table celula_encontros add column if not exists origem text not null default 'app';

-- ---------------------------------------------------------------------
-- Gerar / trocar o código da célula (só acesso total)
-- ---------------------------------------------------------------------
create or replace function gerar_token_frequencia(p_celula text) returns text
language plpgsql security definer as $$
declare v_token text;
begin
  if not coalesce((select is_full from meu_perfil()), false) then
    raise exception 'Só Pastor ou administrador pode gerar o link.';
  end if;
  if not exists (select 1 from celula_hierarquia where celula = p_celula) then
    raise exception 'Célula não encontrada: %', p_celula;
  end if;
  -- 12 caracteres, sem os que se confundem ao digitar/ler.
  v_token := translate(encode(gen_random_bytes(9), 'base64'), '+/=', 'xyz');
  update celula_hierarquia set token_frequencia = v_token where celula = p_celula;
  return v_token;
end;
$$;

grant execute on function gerar_token_frequencia(text) to authenticated;

-- ---------------------------------------------------------------------
-- Abrir o lançamento pelo link: devolve a célula, a data e as pessoas
-- ---------------------------------------------------------------------
create or replace function frequencia_publica_abrir(p_token text, p_data date)
returns jsonb
language plpgsql security definer as $$
declare
  v_celula text;
  v_encontro uuid;
  v_pessoas jsonb;
begin
  select celula into v_celula from celula_hierarquia where token_frequencia = p_token;
  if v_celula is null then
    raise exception 'Link inválido ou desativado.';
  end if;
  if p_data > current_date or p_data < current_date - interval '90 days' then
    raise exception 'Data fora do período permitido.';
  end if;

  select id into v_encontro from celula_encontros where celula = v_celula and data = p_data;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'nome', m.nome,
           'status', m.status_pessoa,
           'presente', coalesce(p.presente, false)
         ) order by m.nome), '[]'::jsonb)
    into v_pessoas
    from members m
    left join presencas_celula p on p.member_id = m.id and p.encontro_id = v_encontro
   where m.celula = v_celula and m.active;

  return jsonb_build_object(
    'celula', v_celula,
    'data', p_data,
    'ja_lancado', v_encontro is not null,
    'pessoas', v_pessoas
  );
end;
$$;

grant execute on function frequencia_publica_abrir(text, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Salvar a presença lançada pelo link
-- ---------------------------------------------------------------------
create or replace function frequencia_publica_salvar(p_token text, p_data date, p_presentes uuid[])
returns jsonb
language plpgsql security definer as $$
declare
  v_celula text;
  v_encontro uuid;
  v_total int;
  v_presentes int;
begin
  select celula into v_celula from celula_hierarquia where token_frequencia = p_token;
  if v_celula is null then
    raise exception 'Link inválido ou desativado.';
  end if;
  if p_data > current_date or p_data < current_date - interval '90 days' then
    raise exception 'Data fora do período permitido.';
  end if;

  select id into v_encontro from celula_encontros where celula = v_celula and data = p_data;
  if v_encontro is null then
    insert into celula_encontros (celula, data, origem) values (v_celula, p_data, 'link')
      returning id into v_encontro;
  end if;

  -- Só entram pessoas ativas da própria célula: um id de fora é ignorado.
  insert into presencas_celula (encontro_id, member_id, presente)
    select v_encontro, m.id, m.id = any(coalesce(p_presentes, '{}'::uuid[]))
      from members m
     where m.celula = v_celula and m.active
  on conflict (encontro_id, member_id)
    do update set presente = excluded.presente, updated_at = now();

  select count(*), count(*) filter (where presente) into v_total, v_presentes
    from presencas_celula where encontro_id = v_encontro;

  return jsonb_build_object('ok', true, 'celula', v_celula, 'total', v_total, 'presentes', v_presentes);
end;
$$;

grant execute on function frequencia_publica_salvar(text, date, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Visitante lançado pelo link (entra como Visitante daquela célula)
-- ---------------------------------------------------------------------
create or replace function frequencia_publica_visitante(p_token text, p_nome text, p_tel text, p_data date)
returns uuid
language plpgsql security definer as $$
declare
  v_celula text;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_id uuid;
begin
  select celula into v_celula from celula_hierarquia where token_frequencia = p_token;
  if v_celula is null then
    raise exception 'Link inválido ou desativado.';
  end if;
  if v_nome = '' then
    raise exception 'Digite o nome do visitante.';
  end if;

  insert into members (nome, tipo, celula, posicao, status_pessoa, tel, primeira_visita)
    values (v_nome, 'Adultos', v_celula, 'Visitante', 'Visitante', nullif(btrim(coalesce(p_tel, '')), ''), p_data)
    returning id into v_id;
  return v_id;
end;
$$;

grant execute on function frequencia_publica_visitante(text, text, text, date) to anon, authenticated;
