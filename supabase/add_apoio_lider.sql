-- Área de Apoio ao Líder: Mural de Avisos (QG), Palavras do Culto
-- (esboços em PDF) e Encontro com Deus. Rode uma vez no SQL Editor do
-- Supabase, depois do add_rbac.sql (usa profiles e members).
--
-- Regra de quem publica/apaga:
--   - Mural: Pastor (o cargo "Pastor", não "Pastor de Rede") ou Admin.
--   - Palavras do Culto e Encontro com Deus (upload/exclusão de
--     arquivo): só Admin do sistema (profiles.is_admin).
-- Qualquer autenticado pode ler as três áreas (é conteúdo para a
-- liderança em geral, não só acesso total).

-- ---------------------------------------------------------------------
-- Funções de escopo (security definer, como meu_perfil() em add_rbac.sql)
-- ---------------------------------------------------------------------
create or replace function sou_admin_sistema() returns boolean
language sql security definer stable as $$
  select coalesce(is_admin, false) from profiles where user_id = auth.uid()
$$;

create or replace function sou_pastor_ou_admin() returns boolean
language sql security definer stable as $$
  select coalesce(p.is_admin, false) or m.posicao = 'Pastor'
  from profiles p join members m on m.id = p.member_id
  where p.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Mural de Avisos (QG)
-- ---------------------------------------------------------------------
create table if not exists mural_posts (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  autor_user_id uuid references auth.users(id) on delete set null,
  autor_nome text not null,
  autor_cargo text not null,
  texto text not null check (char_length(texto) between 1 and 280),
  curtidas integer not null default 0
);

-- Última leitura do mural por usuário — o indicador de "não lido" no
-- menu compara mural_posts.criado_em com lido_em desta linha.
create table if not exists mural_leituras (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lido_em timestamptz not null default now()
);

alter table mural_posts enable row level security;
alter table mural_leituras enable row level security;

drop policy if exists "mural_posts_select" on mural_posts;
create policy "mural_posts_select" on mural_posts
  for select to authenticated using (true);

drop policy if exists "mural_posts_insert" on mural_posts;
create policy "mural_posts_insert" on mural_posts
  for insert to authenticated
  with check (sou_pastor_ou_admin() and autor_user_id = auth.uid());

drop policy if exists "mural_posts_delete" on mural_posts;
create policy "mural_posts_delete" on mural_posts
  for delete to authenticated using (sou_pastor_ou_admin());

-- Curtir é liberado a qualquer autenticado, mas só via function (não dá
-- pra reescrever texto/autor direto na tabela).
create or replace function curtir_mural_post(post_id uuid) returns void
language sql security definer as $$
  update mural_posts set curtidas = curtidas + 1 where id = post_id
$$;
grant execute on function curtir_mural_post(uuid) to authenticated;

drop policy if exists "mural_leituras_select_own" on mural_leituras;
create policy "mural_leituras_select_own" on mural_leituras
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "mural_leituras_insert_own" on mural_leituras;
create policy "mural_leituras_insert_own" on mural_leituras
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "mural_leituras_update_own" on mural_leituras;
create policy "mural_leituras_update_own" on mural_leituras
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Palavras do Culto — repositório de esboços em PDF (a mesma palavra
-- usada no culto e na célula)
-- ---------------------------------------------------------------------
create table if not exists esbocos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data_culto date not null,
  arquivo_path text not null,
  arquivo_nome text not null,
  autor_user_id uuid references auth.users(id) on delete set null,
  autor_nome text not null,
  criado_em timestamptz not null default now()
);

alter table esbocos enable row level security;

drop policy if exists "esbocos_select" on esbocos;
create policy "esbocos_select" on esbocos for select to authenticated using (true);

drop policy if exists "esbocos_insert" on esbocos;
create policy "esbocos_insert" on esbocos
  for insert to authenticated with check (sou_admin_sistema());

drop policy if exists "esbocos_delete" on esbocos;
create policy "esbocos_delete" on esbocos
  for delete to authenticated using (sou_admin_sistema());

-- ---------------------------------------------------------------------
-- Encontro com Deus — palavras agrupadas por edição
-- ---------------------------------------------------------------------
create table if not exists encontro_edicoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  periodo text not null,
  cor text not null default '#149C88',
  criado_em timestamptz not null default now()
);

create table if not exists encontro_palavras (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references encontro_edicoes(id) on delete cascade,
  titulo text not null,
  data_palavra date,
  arquivo_path text not null,
  arquivo_nome text not null,
  autor_user_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table encontro_edicoes enable row level security;
alter table encontro_palavras enable row level security;

drop policy if exists "encontro_edicoes_select" on encontro_edicoes;
create policy "encontro_edicoes_select" on encontro_edicoes for select to authenticated using (true);

drop policy if exists "encontro_edicoes_insert" on encontro_edicoes;
create policy "encontro_edicoes_insert" on encontro_edicoes
  for insert to authenticated with check (sou_admin_sistema());

drop policy if exists "encontro_edicoes_delete" on encontro_edicoes;
create policy "encontro_edicoes_delete" on encontro_edicoes
  for delete to authenticated using (sou_admin_sistema());

drop policy if exists "encontro_palavras_select" on encontro_palavras;
create policy "encontro_palavras_select" on encontro_palavras for select to authenticated using (true);

drop policy if exists "encontro_palavras_insert" on encontro_palavras;
create policy "encontro_palavras_insert" on encontro_palavras
  for insert to authenticated with check (sou_admin_sistema());

drop policy if exists "encontro_palavras_delete" on encontro_palavras;
create policy "encontro_palavras_delete" on encontro_palavras
  for delete to authenticated using (sou_admin_sistema());

-- ---------------------------------------------------------------------
-- Storage: bucket privado para os PDFs de Palavras do Culto e Encontro
-- com Deus. Leitura para qualquer autenticado; upload/exclusão só Admin.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('apoio-lider', 'apoio-lider', false)
on conflict (id) do nothing;

drop policy if exists "apoio_lider_select" on storage.objects;
create policy "apoio_lider_select" on storage.objects
  for select to authenticated using (bucket_id = 'apoio-lider');

drop policy if exists "apoio_lider_insert" on storage.objects;
create policy "apoio_lider_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'apoio-lider' and sou_admin_sistema());

drop policy if exists "apoio_lider_delete" on storage.objects;
create policy "apoio_lider_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'apoio-lider' and sou_admin_sistema());
