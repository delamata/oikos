-- Solicitações de acesso de liderança, feitas pela tela pública ("Já sou
-- líder"), sem login.
--
-- Por que uma solicitação e não um cadastro direto: no Oikos o nível de
-- acesso vem da função da pessoa (um Pastor enxerga tudo). Se a tela
-- pública gravasse direto em members com função de liderança, qualquer
-- pessoa poderia se declarar Pastor. Aqui ela só DEIXA O PEDIDO; quem
-- decide e libera é o administrador, em Administração → Solicitações.
--
-- Quem não tem login consegue apenas INSERIR um pedido pendente — não
-- lê a tabela, não altera, não aprova.
--
-- Rode uma vez no SQL Editor do Supabase.

create table if not exists solicitacoes_lideranca (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 3 and 120),
  funcao text not null check (funcao in ('Líder', 'Discipulador', 'Obreiro', 'Pastor')),
  celula text,                                   -- só para Líder: a célula que ele lidera
  telefone text check (telefone is null or length(telefone) <= 30),
  member_id uuid references members(id) on delete set null,  -- quando a pessoa se achou na lista
  ja_cadastrado boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por uuid references auth.users
);

create index if not exists solicitacoes_lideranca_status_idx on solicitacoes_lideranca (status, criado_em desc);

alter table solicitacoes_lideranca enable row level security;

-- Tela pública: só cria pedido pendente, sem marcar como resolvido.
drop policy if exists "solicitacoes_insert_publico" on solicitacoes_lideranca;
create policy "solicitacoes_insert_publico" on solicitacoes_lideranca
  for insert to anon, authenticated
  with check (status = 'pendente' and resolvido_em is null and resolvido_por is null);

-- Ver e resolver: só acesso total (Pastor, Pastor de Rede, admin).
drop policy if exists "solicitacoes_select_full" on solicitacoes_lideranca;
create policy "solicitacoes_select_full" on solicitacoes_lideranca
  for select to authenticated using ((select is_full from meu_perfil()));

drop policy if exists "solicitacoes_update_full" on solicitacoes_lideranca;
create policy "solicitacoes_update_full" on solicitacoes_lideranca
  for update to authenticated
  using ((select is_full from meu_perfil()))
  with check ((select is_full from meu_perfil()));

grant insert on solicitacoes_lideranca to anon;
grant select, insert, update on solicitacoes_lideranca to authenticated;
