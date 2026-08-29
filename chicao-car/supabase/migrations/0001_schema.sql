-- =============================================================================
-- Chicão Car — esquema inicial
-- Execute no SQL Editor do Supabase (ou via `supabase db push`).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------- perfis ---
create type public.user_role as enum ('admin', 'manager', 'mechanic', 'financial');

create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  role        public.user_role not null default 'mechanic',
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Pessoas com acesso ao sistema. O vínculo com o Supabase Auth é feito pelo e-mail.';

-- --------------------------------------------------------------- clientes ---
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  document    text,
  phone       text,
  whatsapp    text,
  email       text,
  birth_date  date,
  address     text,
  city        text,
  state       text,
  zip_code    text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index customers_name_idx on public.customers using gin (to_tsvector('portuguese', name));
create index customers_document_idx on public.customers (document);
create index customers_phone_idx on public.customers (phone);

-- --------------------------------------------------------------- veículos ---
create type public.fuel_type as enum
  ('flex', 'gasoline', 'ethanol', 'diesel', 'gnv', 'hybrid', 'electric');

create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  plate        text not null,
  brand        text,
  model        text,
  version      text,
  year         integer,
  model_year   integer,
  color        text,
  fuel_type    public.fuel_type,
  mileage      integer,
  chassis      text,
  renavam      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index vehicles_plate_idx on public.vehicles (upper(plate));
create index vehicles_customer_idx on public.vehicles (customer_id);

-- ----------------------------------------------------------- fornecedores ---
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null,
  trade_name    text,
  document      text,
  contact_name  text,
  phone         text,
  whatsapp      text,
  email         text,
  address       text,
  city          text,
  state         text,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- --------------------------------------------------------------- catálogo ---
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  category          text,
  default_price     numeric(12, 2) not null default 0,
  estimated_minutes integer,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  sku            text,
  name           text not null,
  description    text,
  category       text,
  supplier_id    uuid references public.suppliers (id) on delete set null,
  cost_price     numeric(12, 2) not null default 0,
  sale_price     numeric(12, 2) not null default 0,
  stock_quantity numeric(12, 2) not null default 0,
  minimum_stock  numeric(12, 2) not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_supplier_idx on public.products (supplier_id);

-- ------------------------------------------------------ ordens de serviço ---
create type public.work_order_status as enum (
  'draft', 'awaiting_approval', 'approved', 'in_progress',
  'waiting_parts', 'completed', 'delivered', 'cancelled'
);

create type public.order_payment_status as enum ('unpaid', 'partial', 'paid');

create table public.work_orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       integer not null unique,
  customer_id        uuid not null references public.customers (id) on delete restrict,
  vehicle_id         uuid not null references public.vehicles (id) on delete restrict,
  mechanic_id        uuid references public.profiles (id) on delete set null,
  status             public.work_order_status not null default 'draft',
  opened_at          timestamptz not null default now(),
  expected_at        timestamptz,
  completed_at       timestamptz,
  delivered_at       timestamptz,
  approved_at        timestamptz,
  current_mileage    integer,
  customer_complaint text,
  diagnosis          text,
  internal_notes     text,
  subtotal_services  numeric(12, 2) not null default 0,
  subtotal_products  numeric(12, 2) not null default 0,
  discount           numeric(12, 2) not null default 0,
  total              numeric(12, 2) not null default 0,
  payment_status     public.order_payment_status not null default 'unpaid',
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index work_orders_customer_idx on public.work_orders (customer_id);
create index work_orders_vehicle_idx on public.work_orders (vehicle_id);
create index work_orders_status_idx on public.work_orders (status);
create index work_orders_opened_idx on public.work_orders (opened_at desc);

create table public.work_order_services (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  service_id    uuid references public.services (id) on delete set null,
  description   text not null,
  quantity      numeric(12, 2) not null default 1,
  unit_price    numeric(12, 2) not null default 0,
  discount      numeric(12, 2) not null default 0,
  total         numeric(12, 2) not null default 0
);

create index work_order_services_order_idx on public.work_order_services (work_order_id);

create table public.work_order_products (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  description   text not null,
  quantity      numeric(12, 2) not null default 1,
  unit_cost     numeric(12, 2) not null default 0,
  unit_price    numeric(12, 2) not null default 0,
  discount      numeric(12, 2) not null default 0,
  total         numeric(12, 2) not null default 0
);

create index work_order_products_order_idx on public.work_order_products (work_order_id);

-- ------------------------------------------------------------- financeiro ---
create type public.entry_status as enum ('pending', 'paid', 'overdue', 'cancelled');

create type public.payment_method as enum
  ('cash', 'pix', 'debit', 'credit', 'boleto', 'transfer', 'other');

create table public.revenues (
  id             uuid primary key default gen_random_uuid(),
  description    text not null,
  customer_id    uuid references public.customers (id) on delete set null,
  work_order_id  uuid references public.work_orders (id) on delete set null,
  category       text,
  amount         numeric(12, 2) not null,
  paid_amount    numeric(12, 2) not null default 0,
  payment_method public.payment_method,
  due_date       date not null,
  payment_date   date,
  status         public.entry_status not null default 'pending',
  notes          text,
  created_at     timestamptz not null default now()
);

create index revenues_due_idx on public.revenues (due_date);
create index revenues_status_idx on public.revenues (status);
create index revenues_order_idx on public.revenues (work_order_id);

create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid references public.suppliers (id) on delete set null,
  description    text not null,
  category       text,
  amount         numeric(12, 2) not null,
  paid_amount    numeric(12, 2) not null default 0,
  due_date       date not null,
  payment_date   date,
  payment_method public.payment_method,
  status         public.entry_status not null default 'pending',
  recurring      boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now()
);

create index expenses_due_idx on public.expenses (due_date);
create index expenses_status_idx on public.expenses (status);

-- baixas (permitem pagamento parcial de receitas e despesas)
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  revenue_id     uuid references public.revenues (id) on delete cascade,
  expense_id     uuid references public.expenses (id) on delete cascade,
  amount         numeric(12, 2) not null,
  payment_method public.payment_method not null,
  paid_at        date not null,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint payments_target_check check (
    (revenue_id is not null) <> (expense_id is not null)
  )
);

create index payments_revenue_idx on public.payments (revenue_id);
create index payments_expense_idx on public.payments (expense_id);

-- ---------------------------------------------------------------- estoque ---
create type public.movement_type as enum ('entry', 'exit', 'adjustment', 'return');

create table public.inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  type          public.movement_type not null,
  quantity      numeric(12, 2) not null,
  unit_cost     numeric(12, 2),
  work_order_id uuid references public.work_orders (id) on delete set null,
  supplier_id   uuid references public.suppliers (id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now()
);

create index inventory_movements_product_idx on public.inventory_movements (product_id);

-- -------------------------------------------------------------- auditoria ---
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  user_name     text,
  action        text not null,
  entity        text not null,
  entity_id     uuid,
  summary       text,
  before_values jsonb,
  after_values  jsonb,
  created_at    timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- --------------------------------------------------- configurações da OS ----
create table public.workshop_settings (
  id               uuid primary key,
  company_name     text not null default 'Chicão Car',
  document         text,
  phone            text,
  whatsapp         text,
  email            text,
  address          text,
  city             text,
  state            text,
  zip_code         text,
  logo_url         text,
  bank_details     text,
  pix_key          text,
  quote_terms      text,
  order_terms      text,
  document_footer  text,
  quote_valid_days integer not null default 7,
  updated_at       timestamptz not null default now()
);

-- linha única de configuração, com o id que o aplicativo espera
insert into public.workshop_settings (id, company_name, document_footer)
values (
  '00000000-0000-0000-0000-000000000001',
  'Chicão Car',
  'Chicão Car — Oficina Mecânica · Obrigado pela preferência!'
)
on conflict (id) do nothing;
