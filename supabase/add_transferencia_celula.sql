-- Transferir membro entre células: quem já tem acesso à célula ATUAL da
-- pessoa (líder, discipulador, obreiro ou acesso total) passa a poder
-- movê-la para qualquer célula cadastrada, mesmo uma fora da própria
-- rede — sem precisar também ter acesso à célula de destino.
--
-- Antes disso, trocar a célula de alguém exigia acesso às DUAS pontas
-- (origem e destino), porque a policy de update verificava a nova
-- célula também. Isso bloqueava uma transferência legítima sempre que
-- o destino não era da rede de quem editou — ex: "new row violates row-
-- level security policy for table members" ao tentar mudar a célula.
--
-- Continua exigindo acesso à célula ATUAL (quem não gerencia a pessoa
-- não pode mexer nela de jeito nenhum) — só o destino deixou de ser
-- restrito. Inserção de cadastro novo (members_insert_scope) não muda:
-- pra cadastrar alguém direto numa célula ainda é preciso ter acesso a
-- ela.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_rbac.sql.

drop policy if exists "members_update_scope" on members;
create policy "members_update_scope" on members
  for update using (pode_ver_celula(celula)) with check (true);
