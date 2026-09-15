-- Editar célula existente (Administração → Células): nome, discipulador
-- e obreiro responsáveis.
--
-- O nome da célula é a chave de celula_hierarquia e é o que cada pessoa
-- guarda em members.celula. Por isso renomear não é um update simples:
-- esta função cria a célula com o nome novo, move todo mundo dela pra
-- lá e apaga a antiga, tudo numa transação só (ou vai tudo, ou nada).
-- Roda com privilégio próprio e só aceita quem tem acesso total.
--
-- Rode uma vez no SQL Editor do Supabase.

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

  -- Mesmo nome: só troca discipulador/obreiro.
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

  insert into celula_hierarquia (celula, discipulador_id, obreiro_id)
    values (v_nome, p_discipulador_id, p_obreiro_id);
  update members set celula = v_nome where celula = p_celula;
  delete from celula_hierarquia where celula = p_celula;

  return v_nome;
end;
$$;

grant execute on function editar_celula(text, text, uuid, uuid) to authenticated;
