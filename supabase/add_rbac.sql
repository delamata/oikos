-- Acesso por nível de liderança (Pastor/Admin, Obreiro, Discipulador,
-- Líder) + cadastro público sem login. Rode uma vez no SQL Editor do
-- Supabase, depois de add_situacao_saida.sql. Veja o passo a passo em
-- README.md.

-- ---------------------------------------------------------------------
-- profiles: liga cada login (auth.users) ao próprio cadastro em members.
-- Cada usuário só mexe na própria linha (self-link no primeiro acesso).
-- ---------------------------------------------------------------------
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- celula_hierarquia: quem disciplina/supervisiona cada célula.
-- Preenchido pela tela de administração (Pastor/Admin).
-- ---------------------------------------------------------------------
create table if not exists celula_hierarquia (
  celula text primary key,
  discipulador_id uuid references members(id),
  obreiro_id uuid references members(id)
);
insert into celula_hierarquia (celula) values
  ('Otavio e Jô'), ('Claudio e Renata'), ('Pr.Paulo'),
  ('Josivan e Celia'), ('Janaina'), ('Discipulador')
on conflict (celula) do nothing;

-- ---------------------------------------------------------------------
-- members_directory: nome + célula só (sem telefone/nascimento), usada
-- na tela "qual desses é você" antes de existir profile.
-- ---------------------------------------------------------------------
drop view if exists members_directory;
create view members_directory as select id, nome, celula from members;
grant select on members_directory to authenticated;

-- ---------------------------------------------------------------------
-- Funções de escopo (security definer: rodam com privilégio próprio
-- para poder ler profiles/members sem depender da RLS de quem chamou).
-- ---------------------------------------------------------------------
create or replace function meu_perfil()
returns table(is_full boolean, celula text, posicao text, member_id uuid)
language sql security definer stable as $$
  select
    coalesce(p.is_admin, false) or m.posicao in ('Pastor', 'Pastor de Rede'),
    m.celula, m.posicao, m.id
  from profiles p
  join members m on m.id = p.member_id
  where p.user_id = auth.uid()
$$;

create or replace function pode_ver_celula(alvo text) returns boolean
language plpgsql security definer stable as $$
declare r record;
begin
  select * into r from meu_perfil();
  if r is null then return false; end if;
  if r.is_full then return true; end if;
  if r.posicao = 'Obreiro' then
    return exists (select 1 from celula_hierarquia where celula = alvo and obreiro_id = r.member_id);
  end if;
  if r.posicao = 'Discipulador' then
    return exists (select 1 from celula_hierarquia where celula = alvo and discipulador_id = r.member_id);
  end if;
  return alvo = r.celula;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS: members
-- ---------------------------------------------------------------------
drop policy if exists "authenticated_all" on members;

create policy "members_select_scope" on members
  for select using (pode_ver_celula(celula));

create policy "members_insert_scope" on members
  for insert to authenticated with check (pode_ver_celula(celula));

create policy "members_update_scope" on members
  for update using (pode_ver_celula(celula)) with check (pode_ver_celula(celula));

create policy "members_delete_scope" on members
  for delete using (pode_ver_celula(celula));

-- Cadastro público (sem login): só pode inserir Visitante ativo.
create policy "members_public_self_register" on members
  for insert to anon
  with check (posicao = 'Visitante' and situacao_saida = 'ativo' and active = true);

-- ---------------------------------------------------------------------
-- RLS: movimentacoes (segue o escopo da célula da pessoa referenciada)
-- ---------------------------------------------------------------------
drop policy if exists "authenticated_all" on movimentacoes;

create policy "mov_select_scope" on movimentacoes
  for select using (pode_ver_celula((select celula from members where id = movimentacoes.member_id)));

create policy "mov_insert_scope" on movimentacoes
  for insert to authenticated
  with check (pode_ver_celula((select celula from members where id = movimentacoes.member_id)));

-- ---------------------------------------------------------------------
-- cultos / presencas_culto: sem mudança de escopo — continuam abertos a
-- qualquer autenticado (evento da igreja como um todo, não por célula).
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- RLS: profiles (cada um só mexe no próprio vínculo; is_admin só via
-- SQL Editor, não é editável pelo próprio usuário)
-- ---------------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (user_id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (user_id = auth.uid() and is_admin = false);

create policy "profiles_update_own" on profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_admin = (select is_admin from profiles where user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- RLS: celula_hierarquia (todo autenticado lê; só quem tem acesso
-- total edita)
-- ---------------------------------------------------------------------
alter table celula_hierarquia enable row level security;

create policy "hierarquia_select_all" on celula_hierarquia
  for select to authenticated using (true);

create policy "hierarquia_write_full" on celula_hierarquia
  for all using ((select is_full from meu_perfil()))
  with check ((select is_full from meu_perfil()));
