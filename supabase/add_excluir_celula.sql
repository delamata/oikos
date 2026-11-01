-- Excluir célula (Administração → Células → Editar célula → Excluir
-- célula). Só Pastor/administrador pode, e só quando a célula está
-- vazia e sem histórico de encontros — do contrário o próprio banco
-- recusa, pra nunca apagar gente ou frequência por engano junto com a
-- célula. Quem quer excluir uma célula com gente deve primeiro
-- transferir essas pessoas para outra célula.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_frequencia.sql
-- (precisa da tabela celula_encontros para checar histórico).

create or replace function excluir_celula(p_celula text) returns void
language plpgsql security definer as $$
declare
  v_membros int;
  v_encontros int;
begin
  if not coalesce((select is_full from meu_perfil()), false) then
    raise exception 'Só Pastor ou administrador pode excluir células.';
  end if;
  if not exists (select 1 from celula_hierarquia where celula = p_celula) then
    raise exception 'Célula não encontrada: %', p_celula;
  end if;

  select count(*) into v_membros from members where celula = p_celula;
  if v_membros > 0 then
    raise exception 'Essa célula ainda tem % pessoa(s) cadastrada(s). Transfira-as para outra célula antes de excluir.', v_membros;
  end if;

  select count(*) into v_encontros from celula_encontros where celula = p_celula;
  if v_encontros > 0 then
    raise exception 'Essa célula tem % encontro(s) de frequência registrados. Não é possível excluir sem perder esse histórico.', v_encontros;
  end if;

  delete from celula_hierarquia where celula = p_celula;
end;
$$;

grant execute on function excluir_celula(text) to authenticated;
