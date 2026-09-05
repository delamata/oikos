-- Schema do app "Dashboard de Membros" (Videira SCS / Rede Oikos).
-- Rodar uma vez no SQL Editor do projeto Supabase. Depois de rodar,
-- rode também supabase/seed.sql para importar os membros já existentes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- members: cadastro de membros da rede
-- ---------------------------------------------------------------------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity unique,
  nome text not null,
  tipo text not null default 'Adultos',
  celula text not null,
  posicao text not null default 'Visitante',
  batizado text not null default 'Não',
  encontro text not null default 'Não',
  civil text not null default 'Solteiro (a)',
  nasc date,
  tel text,
  maturidade text not null default 'Não',
  ctl text not null default 'Não',
  seminario text not null default 'Não',
  ceifeiros text not null default 'Não',
  active boolean not null default true,
  situacao_saida text not null default 'ativo'
    check (situacao_saida in ('ativo', 'inativo', 'transferido_celula', 'transferido_rede', 'transferido_igreja', 'perdido')),
  saida_detalhe text,
  -- Cônjuge (opcional, só faz sentido com civil = 'Casado (a)'). O app
  -- mantém o vínculo nos dois sentidos e replica célula/situação.
  conjuge_id uuid references members(id) on delete set null,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_celula_idx on members (celula);
create index if not exists members_conjuge_idx on members (conjuge_id);
create index if not exists members_active_idx on members (active);

-- Não deixa cadastrar a mesma pessoa duas vezes (mesmo nome + mesma
-- data de nascimento) — vale até pro cadastro público sem login.
create unique index if not exists members_nome_nasc_unique
  on members (lower(btrim(nome)), nasc)
  where nasc is not null;

-- ---------------------------------------------------------------------
-- cultos: um registro por culto/data (para o check-in de presença)
-- ---------------------------------------------------------------------
create table if not exists cultos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tipo text not null default 'Culto',
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  unique (data, tipo)
);

-- ---------------------------------------------------------------------
-- presencas_culto: check-in por pessoa, por culto
-- ---------------------------------------------------------------------
create table if not exists presencas_culto (
  id uuid primary key default gen_random_uuid(),
  culto_id uuid not null references cultos(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  presente boolean not null default true,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  unique (culto_id, member_id)
);

create index if not exists presencas_culto_culto_idx on presencas_culto (culto_id);
create index if not exists presencas_culto_member_idx on presencas_culto (member_id);

-- ---------------------------------------------------------------------
-- movimentacoes: histórico de mudanças de status/célula por pessoa
-- ---------------------------------------------------------------------
create table if not exists movimentacoes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  data timestamptz not null default now(),
  campo text not null,
  valor_anterior text,
  valor_novo text,
  observacao text,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create index if not exists movimentacoes_member_idx on movimentacoes (member_id);
create index if not exists movimentacoes_data_idx on movimentacoes (data desc);

-- ---------------------------------------------------------------------
-- updated_at automático em members
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists members_set_updated_at on members;
create trigger members_set_updated_at
  before update on members
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: qualquer líder autenticado lê e escreve tudo.
-- Não há cadastro público — as contas são criadas via
-- Authentication > Users > Invite no painel do Supabase.
-- ---------------------------------------------------------------------
alter table members enable row level security;
alter table cultos enable row level security;
alter table presencas_culto enable row level security;
alter table movimentacoes enable row level security;

drop policy if exists "authenticated_all" on members;
create policy "authenticated_all" on members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all" on cultos;
create policy "authenticated_all" on cultos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all" on presencas_culto;
create policy "authenticated_all" on presencas_culto
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all" on movimentacoes;
create policy "authenticated_all" on movimentacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
