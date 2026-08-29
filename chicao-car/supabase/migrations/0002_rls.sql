-- =============================================================================
-- Chicão Car — Row Level Security
-- Nenhuma tabela é acessível sem um perfil ativo. A chave `service_role` nunca
-- é usada pelo frontend: quem decide o que cada pessoa pode fazer é o Postgres.
-- =============================================================================

-- ------------------------------------------------- funções de identificação --
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
    from public.profiles
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     and active
   limit 1;
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() is not null;
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'admin';
$$;

-- gerência operacional: abre e fecha cadastros e o catálogo
create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() in ('admin', 'manager');
$$;

-- quem pode mexer em dinheiro
create or replace function public.is_financial() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() in ('admin', 'manager', 'financial');
$$;

-- ------------------------------------------------------------ habilita RLS --
alter table public.profiles            enable row level security;
alter table public.customers           enable row level security;
alter table public.vehicles            enable row level security;
alter table public.suppliers           enable row level security;
alter table public.services            enable row level security;
alter table public.products            enable row level security;
alter table public.work_orders         enable row level security;
alter table public.work_order_services enable row level security;
alter table public.work_order_products enable row level security;
alter table public.revenues            enable row level security;
alter table public.expenses            enable row level security;
alter table public.payments            enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.workshop_settings   enable row level security;

-- ------------------------------------------------------------------ perfis --
create policy "perfis visíveis para a equipe"
  on public.profiles for select using (public.is_staff());
create policy "somente o admin gerencia perfis"
  on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- clientes --
create policy "clientes visíveis para a equipe"
  on public.customers for select using (public.is_staff());
create policy "gerência mantém clientes"
  on public.customers for insert with check (public.is_manager());
create policy "gerência atualiza clientes"
  on public.customers for update using (public.is_manager()) with check (public.is_manager());
create policy "somente o admin remove clientes"
  on public.customers for delete using (public.is_admin());

-- ---------------------------------------------------------------- veículos --
-- o mecânico precisa atualizar a quilometragem durante o atendimento
create policy "veículos visíveis para a equipe"
  on public.vehicles for select using (public.is_staff());
create policy "equipe cadastra veículos"
  on public.vehicles for insert with check (public.is_staff());
create policy "equipe atualiza veículos"
  on public.vehicles for update using (public.is_staff()) with check (public.is_staff());
create policy "somente o admin remove veículos"
  on public.vehicles for delete using (public.is_admin());

-- ------------------------------------------------------------ fornecedores --
create policy "fornecedores visíveis para a equipe"
  on public.suppliers for select using (public.is_staff());
create policy "financeiro mantém fornecedores"
  on public.suppliers for all using (public.is_financial()) with check (public.is_financial());

-- ---------------------------------------------------------------- catálogo --
create policy "serviços visíveis para a equipe"
  on public.services for select using (public.is_staff());
create policy "gerência mantém serviços"
  on public.services for all using (public.is_manager()) with check (public.is_manager());

create policy "produtos visíveis para a equipe"
  on public.products for select using (public.is_staff());
create policy "gerência mantém produtos"
  on public.products for all using (public.is_manager()) with check (public.is_manager());

-- --------------------------------------------------------------------- OS ---
create policy "OS visíveis para a equipe"
  on public.work_orders for select using (public.is_staff());
create policy "equipe abre OS"
  on public.work_orders for insert with check (public.is_staff());
create policy "equipe atualiza OS"
  on public.work_orders for update using (public.is_staff()) with check (public.is_staff());
create policy "somente o admin remove OS"
  on public.work_orders for delete using (public.is_admin());

create policy "itens de serviço visíveis para a equipe"
  on public.work_order_services for select using (public.is_staff());
create policy "equipe mantém itens de serviço"
  on public.work_order_services for all using (public.is_staff()) with check (public.is_staff());

create policy "itens de peça visíveis para a equipe"
  on public.work_order_products for select using (public.is_staff());
create policy "equipe mantém itens de peça"
  on public.work_order_products for all using (public.is_staff()) with check (public.is_staff());

-- --------------------------------------------------------------- financeiro --
create policy "receitas restritas ao financeiro"
  on public.revenues for select using (public.is_financial());
create policy "financeiro mantém receitas"
  on public.revenues for all using (public.is_financial()) with check (public.is_financial());

create policy "despesas restritas ao financeiro"
  on public.expenses for select using (public.is_financial());
create policy "financeiro mantém despesas"
  on public.expenses for all using (public.is_financial()) with check (public.is_financial());

create policy "baixas restritas ao financeiro"
  on public.payments for select using (public.is_financial());
create policy "financeiro registra baixas"
  on public.payments for all using (public.is_financial()) with check (public.is_financial());

-- ------------------------------------------------------------------ estoque --
create policy "movimentações visíveis para a equipe"
  on public.inventory_movements for select using (public.is_staff());
create policy "equipe registra movimentações"
  on public.inventory_movements for insert with check (public.is_staff());
create policy "gerência corrige movimentações"
  on public.inventory_movements for update using (public.is_manager()) with check (public.is_manager());
create policy "somente o admin remove movimentações"
  on public.inventory_movements for delete using (public.is_admin());

-- ---------------------------------------------------------------- auditoria --
-- o log é somente-anexar: ninguém edita nem apaga o histórico
create policy "auditoria visível para gestão e financeiro"
  on public.audit_logs for select using (public.is_financial());
create policy "equipe registra auditoria"
  on public.audit_logs for insert with check (public.is_staff());

-- ------------------------------------------------------------ configurações --
create policy "configurações visíveis para a equipe"
  on public.workshop_settings for select using (public.is_staff());
create policy "gerência altera configurações"
  on public.workshop_settings for all using (public.is_manager()) with check (public.is_manager());
