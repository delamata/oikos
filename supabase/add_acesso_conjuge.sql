-- Espelha o acesso de um cadastro no cônjuge dele.
--
-- A posição já é copiada pelo próprio app (é uma coluna de members), mas
-- o "Admin" mora em profiles.is_admin, e nenhuma policy deixa o cliente
-- mexer nisso — de propósito, senão qualquer um se promoveria a admin.
-- Por isso a cópia acontece aqui, numa função que roda com privilégio
-- próprio e só faz alguma coisa se quem chamou já tem acesso total.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_conjuge.sql.

create or replace function sincronizar_acesso_conjuge(p_member_id uuid) returns boolean
language plpgsql security definer as $$
declare
  v_conjuge_id uuid;
  v_is_admin boolean;
begin
  -- Só quem tem acesso total pode propagar acesso.
  if not coalesce((select is_full from meu_perfil()), false) then
    return false;
  end if;

  select conjuge_id into v_conjuge_id from members where id = p_member_id;
  if v_conjuge_id is null then return false; end if;

  -- Se a pessoa nem tem login, não há admin nenhum pra copiar: vale false.
  select coalesce(bool_or(is_admin), false) into v_is_admin
    from profiles where member_id = p_member_id;

  -- Sem login do cônjuge, isso não afeta nenhuma linha — e é só isso
  -- mesmo: quando ele ganhar acesso, é só salvar o casal de novo.
  update profiles set is_admin = v_is_admin where member_id = v_conjuge_id;

  return true;
end;
$$;
