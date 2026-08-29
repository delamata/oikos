-- =============================================================================
-- Chicão Car — dados de demonstração (OPCIONAL)
--
-- Use apenas em ambiente de desenvolvimento. Nunca execute em produção:
-- o script APAGA o conteúdo das tabelas operacionais antes de recriar.
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
-- =============================================================================

begin;

truncate table
  public.audit_logs,
  public.inventory_movements,
  public.payments,
  public.revenues,
  public.expenses,
  public.work_order_products,
  public.work_order_services,
  public.work_orders,
  public.products,
  public.services,
  public.vehicles,
  public.customers,
  public.suppliers,
  public.profiles
restart identity cascade;

-- ------------------------------------------------------------------ equipe --
insert into public.profiles (name, email, role, phone) values
  ('Francisco "Chicão" Amaral', 'chicao@chicaocar.com.br',  'admin',     '11987650001'),
  ('Marina Prado',              'marina@chicaocar.com.br',  'manager',   '11987650002'),
  ('Jorge Bastos',              'jorge@chicaocar.com.br',   'mechanic',  '11987650003'),
  ('Ronaldo Lima',              'ronaldo@chicaocar.com.br', 'mechanic',  '11987650004'),
  ('Cláudia Neves',             'claudia@chicaocar.com.br', 'financial', '11987650005');

-- ------------------------------------------------------------ fornecedores --
insert into public.suppliers (company_name, trade_name, document, contact_name, phone, city, state) values
  ('Auto Peças União Ltda',        'União Peças',  '12.345.678/0001-01', 'Paulo Vieira',  '1133330001', 'São Caetano do Sul', 'SP'),
  ('Distribuidora Lubrimax',       'Lubrimax',     '22.345.678/0001-02', 'Sandra Rocha',  '1133330002', 'Santo André',        'SP'),
  ('Freios & Cia Comércio',        'Freios & Cia', '32.345.678/0001-03', 'Marcos Duarte', '1133330003', 'São Bernardo',       'SP'),
  ('Pneus ABC Distribuidora',      'Pneus ABC',    '42.345.678/0001-04', 'Rita Campos',   '1133330004', 'São Paulo',          'SP'),
  ('Elétrica Bosch Center',        'Bosch Center', '52.345.678/0001-05', 'Sérgio Alves',  '1133330005', 'Diadema',            'SP');

-- ---------------------------------------------------------------- catálogo --
insert into public.services (name, category, default_price, estimated_minutes) values
  ('Troca de óleo e filtro',            'Manutenção preventiva',        180,  40),
  ('Alinhamento de direção',            'Alinhamento e balanceamento',  120,  45),
  ('Balanceamento (4 rodas)',           'Alinhamento e balanceamento',   90,  40),
  ('Troca de pastilhas de freio',       'Freios',                       240,  90),
  ('Troca de discos de freio',          'Freios',                       320, 120),
  ('Revisão completa',                  'Manutenção preventiva',        450, 180),
  ('Troca de amortecedores (par)',      'Suspensão',                    380, 150),
  ('Troca de correia dentada',          'Motor',                        690, 240),
  ('Diagnóstico eletrônico (scanner)',  'Diagnóstico',                  150,  60),
  ('Higienização do ar-condicionado',   'Ar-condicionado',              200,  70),
  ('Recarga de ar-condicionado',        'Ar-condicionado',              280,  90),
  ('Troca de bateria',                  'Elétrica',                     110,  25),
  ('Troca de velas de ignição',         'Motor',                        160,  60),
  ('Troca de embreagem',                'Motor',                        980, 360),
  ('Troca de fluido de freio',          'Freios',                       140,  45);

insert into public.products (sku, name, category, cost_price, sale_price, stock_quantity, minimum_stock, supplier_id)
select
  'CC-' || (1000 + row_number() over ())::text,
  item.name,
  item.category,
  item.cost,
  item.sale,
  (5 + (random() * 25))::int,
  4,
  (select id from public.suppliers order by random() limit 1)
from (values
  ('Óleo motor 5W30 sintético (litro)', 'Lubrificantes',  32.0,  62.0),
  ('Filtro de óleo',                    'Filtros',        22.0,  45.0),
  ('Filtro de ar do motor',             'Filtros',        28.0,  58.0),
  ('Filtro de combustível',             'Filtros',        34.0,  70.0),
  ('Filtro de cabine (antipólen)',      'Filtros',        30.0,  65.0),
  ('Pastilha de freio dianteira',       'Freios',         88.0, 175.0),
  ('Disco de freio ventilado (par)',    'Freios',        210.0, 390.0),
  ('Amortecedor dianteiro',             'Suspensão',     175.0, 330.0),
  ('Kit correia dentada',               'Motor',         260.0, 480.0),
  ('Vela de ignição',                   'Motor',          18.0,  39.0),
  ('Bateria 60Ah',                      'Elétrica',      320.0, 520.0),
  ('Pneu aro 15 185/65',                'Pneus',         265.0, 430.0),
  ('Fluido de freio DOT4',              'Lubrificantes',  19.0,  42.0),
  ('Aditivo de radiador (litro)',       'Lubrificantes',  16.0,  36.0),
  ('Palheta limpador (par)',            'Acessórios',     24.0,  55.0)
) as item(name, category, cost, sale);

-- ------------------------------------------------------ clientes e veículos --
insert into public.customers (name, document, phone, whatsapp, email, city, state)
select
  nome,
  lpad((100000000 + (random() * 899999999)::bigint)::text, 11, '0'),
  '11' || lpad((30000000 + (random() * 9999999)::int)::text, 8, '0'),
  '119' || lpad((10000000 + (random() * 89999999)::int)::text, 8, '0'),
  lower(replace(nome, ' ', '.')) || '@email.com',
  'São Caetano do Sul',
  'SP'
from unnest(array[
  'Ana Barbosa', 'Bruno Ribeiro', 'Carlos Nunes', 'Daniela Martins', 'Eduardo Gomes',
  'Fernanda Costa', 'Gustavo Almeida', 'Helena Ferreira', 'Igor Carvalho', 'Juliana Moreira',
  'Leandro Souza', 'Mariana Oliveira', 'Nelson Pereira', 'Patrícia Silva', 'Rafael Araújo',
  'Simone Rodrigues', 'Tiago Barbosa', 'Vanessa Nunes'
]) as nome;

insert into public.vehicles (customer_id, plate, brand, model, version, year, model_year, color, fuel_type, mileage)
select
  c.id,
  chr(65 + (random() * 25)::int) || chr(65 + (random() * 25)::int) || chr(65 + (random() * 25)::int)
    || (random() * 9)::int::text || chr(65 + (random() * 25)::int)
    || (random() * 9)::int::text || (random() * 9)::int::text,
  v.brand, v.model, v.version,
  2015 + (random() * 9)::int,
  2016 + (random() * 9)::int,
  (array['Branco', 'Prata', 'Preto', 'Cinza', 'Vermelho'])[1 + (random() * 4)::int],
  'flex'::public.fuel_type,
  (20000 + random() * 150000)::int
from public.customers c
cross join lateral (
  select * from (values
    ('Fiat', 'Argo', '1.0 Drive'),
    ('Volkswagen', 'Gol', '1.6 MSI'),
    ('Chevrolet', 'Onix', '1.0 LT'),
    ('Hyundai', 'HB20', '1.0 Comfort'),
    ('Toyota', 'Corolla', '2.0 XEi'),
    ('Honda', 'Civic', '2.0 EXL'),
    ('Renault', 'Kwid', '1.0 Zen'),
    ('Jeep', 'Renegade', '1.8 Longitude')
  ) as t(brand, model, version)
  order by random() limit 1
) v;

-- ------------------------------------------------------- ordens de serviço --
-- 6 meses de histórico: uma OS entregue por veículo por mês, com itens
with base as (
  select
    v.id                                             as vehicle_id,
    v.customer_id,
    (date_trunc('month', now()) - (m || ' month')::interval
       + ((random() * 26)::int || ' day')::interval)  as opened_at,
    m
  from public.vehicles v
  cross join generate_series(0, 5) as m
  where random() < 0.55
),
numbered as (
  select base.*, 1000 + row_number() over (order by opened_at) as order_number
  from base
)
insert into public.work_orders (
  order_number, customer_id, vehicle_id, mechanic_id, status,
  opened_at, approved_at, completed_at, delivered_at,
  current_mileage, customer_complaint, diagnosis, payment_status
)
select
  n.order_number,
  n.customer_id,
  n.vehicle_id,
  (select id from public.profiles where role = 'mechanic' order by random() limit 1),
  case when n.m = 0 and random() < 0.5
       then (array['approved', 'in_progress', 'awaiting_approval', 'completed'])[1 + (random() * 3)::int]::public.work_order_status
       else 'delivered'::public.work_order_status end,
  n.opened_at,
  n.opened_at + interval '1 day',
  n.opened_at + interval '2 day',
  case when n.m = 0 then null else n.opened_at + interval '3 day' end,
  (select mileage from public.vehicles where id = n.vehicle_id),
  (array[
    'Barulho na suspensão ao passar em lombadas.',
    'Freio com ruído e pedal baixo.',
    'Luz de injeção acesa no painel.',
    'Ar-condicionado não gela como antes.',
    'Revisão preventiva programada.'
  ])[1 + (random() * 4)::int],
  'Itens verificados e substituídos conforme recomendação do fabricante.',
  case when n.m = 0 then 'unpaid'::public.order_payment_status
       else 'paid'::public.order_payment_status end
from numbered n;

-- itens de serviço (1 a 2 por OS)
insert into public.work_order_services (work_order_id, service_id, description, quantity, unit_price, total)
select o.id, s.id, s.name, 1, s.default_price, s.default_price
from public.work_orders o
cross join lateral (
  select * from public.services order by random() limit 1 + (random() * 1)::int
) s;

-- itens de peça (0 a 2 por OS)
insert into public.work_order_products (work_order_id, product_id, description, quantity, unit_cost, unit_price, total)
select o.id, p.id, p.name, q.qty, p.cost_price, p.sale_price, q.qty * p.sale_price
from public.work_orders o
cross join lateral (select 1 + (random() * 2)::int as qty) q
cross join lateral (
  select * from public.products order by random() limit (random() * 2)::int
) p;

-- totais consolidados
update public.work_orders o set
  subtotal_services = coalesce(s.total, 0),
  subtotal_products = coalesce(p.total, 0),
  total = coalesce(s.total, 0) + coalesce(p.total, 0)
from
  (select work_order_id, sum(total) as total from public.work_order_services group by 1) s
  full join
  (select work_order_id, sum(total) as total from public.work_order_products group by 1) p
    on p.work_order_id = s.work_order_id
where o.id = coalesce(s.work_order_id, p.work_order_id);

-- ------------------------------------------------------------- financeiro ---
insert into public.revenues (
  description, customer_id, work_order_id, category, amount, paid_amount,
  payment_method, due_date, payment_date, status
)
select
  'OS #' || o.order_number,
  o.customer_id,
  o.id,
  'Serviços',
  o.total,
  case when o.payment_status = 'paid' then o.total else 0 end,
  case when o.payment_status = 'paid'
       then (array['pix', 'credit', 'debit', 'cash'])[1 + (random() * 3)::int]::public.payment_method
       else null end,
  (o.opened_at + interval '3 day')::date,
  case when o.payment_status = 'paid' then (o.opened_at + interval '3 day')::date else null end,
  case when o.payment_status = 'paid' then 'paid'::public.entry_status else 'pending'::public.entry_status end
from public.work_orders o
where o.total > 0 and o.status not in ('draft', 'awaiting_approval', 'cancelled');

insert into public.payments (revenue_id, amount, payment_method, paid_at)
select r.id, r.paid_amount, r.payment_method, r.payment_date
from public.revenues r
where r.status = 'paid';

-- despesas fixas dos últimos 6 meses
insert into public.expenses (description, category, amount, paid_amount, due_date, payment_date, payment_method, status, recurring)
select
  f.description,
  f.category,
  round((f.base * (0.94 + random() * 0.14))::numeric, 2),
  case when m > 0 then round((f.base * (0.94 + random() * 0.14))::numeric, 2) else 0 end,
  (date_trunc('month', now()) - (m || ' month')::interval + interval '9 day')::date,
  case when m > 0 then (date_trunc('month', now()) - (m || ' month')::interval + interval '9 day')::date else null end,
  case when m > 0 then 'transfer'::public.payment_method else null end,
  case when m > 0 then 'paid'::public.entry_status else 'pending'::public.entry_status end,
  true
from generate_series(0, 5) as m
cross join (values
  ('Aluguel do galpão',    'Aluguel',   4800.0),
  ('Folha de pagamento',   'Salários', 12400.0),
  ('Energia elétrica',     'Energia',    980.0),
  ('Água',                 'Água',       210.0),
  ('Internet e telefonia', 'Internet',   320.0),
  ('Simples Nacional',     'Impostos',  2100.0)
) as f(description, category, base);

-- compras de peças
insert into public.expenses (supplier_id, description, category, amount, paid_amount, due_date, payment_date, payment_method, status)
select
  s.id,
  'Compra de peças — ' || coalesce(s.trade_name, s.company_name),
  'Peças',
  round((600 + random() * 3600)::numeric, 2),
  0,
  (date_trunc('month', now()) - (m || ' month')::interval + ((random() * 25)::int || ' day')::interval)::date,
  null, null,
  'pending'::public.entry_status
from generate_series(0, 5) as m
cross join lateral (select * from public.suppliers order by random() limit 2) s;

update public.expenses
   set paid_amount = amount,
       payment_date = due_date,
       payment_method = 'boleto',
       status = 'paid'
 where category = 'Peças' and due_date < current_date - 20;

-- ---------------------------------------------------------------- estoque ---
insert into public.inventory_movements (product_id, type, quantity, unit_cost, notes)
select id, 'entry', stock_quantity, cost_price, 'Estoque inicial'
from public.products;

commit;
