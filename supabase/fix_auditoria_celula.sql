-- Corrige o erro 'record "new" has no field "id"' ao alterar uma célula.
--
-- O gatilho de auditoria montava o identificador do registro com
-- `new.id`, e a tabela celula_hierarquia não tem coluna id — a chave
-- dela é o nome da célula. Mesmo dentro de um CASE que nunca chegaria
-- ali, o Postgres precisa resolver `new.id` ao preparar a expressão, e
-- aí estoura. Resultado: qualquer UPDATE em celula_hierarquia falhava
-- (trocar discipulador/obreiro, e gerar o link de frequência).
--
-- A função agora lê os campos por JSON (to_jsonb), onde um campo que não
-- existe vira nulo em vez de erro, e cada gatilho informa qual é a sua
-- coluna-chave. Nada do que já está em `auditoria` é alterado.
--
-- Rode uma vez no SQL Editor do Supabase.

create or replace function auditar_mudancas() returns trigger
language plpgsql security definer as $$
declare
  v_campos text[] := tg_argv[0]::text[];
  v_chave text := coalesce(nullif(tg_argv[1], ''), 'id');
  v_novo jsonb := coalesce(to_jsonb(new), '{}'::jsonb);
  v_velho jsonb := coalesce(to_jsonb(old), '{}'::jsonb);
  v_id text := coalesce(v_novo ->> v_chave, v_velho ->> v_chave);
  v_campo text;
begin
  foreach v_campo in array v_campos loop
    if (v_velho ->> v_campo) is distinct from (v_novo ->> v_campo) then
      insert into auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, operacao, user_id)
        values (tg_table_name, v_id, v_campo, v_velho ->> v_campo, v_novo ->> v_campo, tg_op, auth.uid());
    end if;
  end loop;
  return new;
end;
$$;

-- Recria os gatilhos informando a coluna-chave de cada tabela.
drop trigger if exists members_auditoria on members;
create trigger members_auditoria
  after update on members
  for each row execute function auditar_mudancas(
    '{posicao,funcao,status_pessoa,celula,supervisor_id,active,situacao_saida,conjuge_id}', 'id');

drop trigger if exists hierarquia_auditoria on celula_hierarquia;
create trigger hierarquia_auditoria
  after update on celula_hierarquia
  for each row execute function auditar_mudancas(
    '{celula,discipulador_id,obreiro_id}', 'celula');

drop trigger if exists presencas_celula_auditoria on presencas_celula;
create trigger presencas_celula_auditoria
  after update on presencas_celula
  for each row execute function auditar_mudancas('{presente}', 'id');

drop trigger if exists presencas_culto_auditoria on presencas_culto;
create trigger presencas_culto_auditoria
  after update on presencas_culto
  for each row execute function auditar_mudancas('{presente}', 'id');
