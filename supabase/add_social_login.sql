-- Login social (Google): convite por e-mail pra quem um admin já
-- cadastrou, e auto-cadastro seguro pra visitante novo que loga com
-- Google. Rode uma vez no SQL Editor do Supabase, depois de
-- add_public_cadastro_view.sql. Passo pra todo mundo, novo ou
-- existente.

-- ---------------------------------------------------------------------
-- member_invites: um admin autoriza um e-mail específico a se vincular
-- a um cadastro específico, sem precisar de senha nenhuma.
-- ---------------------------------------------------------------------
create table if not exists member_invites (
  email text primary key,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table member_invites enable row level security;

drop policy if exists "member_invites_write_full" on member_invites;
create policy "member_invites_write_full" on member_invites
  for all using ((select is_full from meu_perfil()))
  with check ((select is_full from meu_perfil()));

-- ---------------------------------------------------------------------
-- aceitar_convite(): roda como o dono (bypassa RLS), usando o e-mail
-- JÁ VERIFICADO pelo provedor de login (Google) — não dá pra
-- falsificar via requisição direta, porque auth.jwt() vem do token
-- assinado pelo próprio Supabase Auth. Vincula e consome o convite;
-- devolve null se não achou nenhum pro e-mail de quem chamou.
-- ---------------------------------------------------------------------
create or replace function aceitar_convite() returns uuid
language plpgsql security definer as $$
declare
  v_member_id uuid;
  v_email text;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email = '' then return null; end if;

  select member_id into v_member_id from member_invites where lower(email) = v_email limit 1;
  if v_member_id is null then return null; end if;

  insert into profiles (user_id, member_id) values (auth.uid(), v_member_id)
    on conflict (user_id) do nothing;

  delete from member_invites where lower(email) = v_email;

  return v_member_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Sem isso, um login novo (sem profile ainda) não consegue nem criar o
-- PRÓPRIO cadastro de visitante — o insert autenticado hoje exige
-- pode_ver_celula(), que depende de já ter profile. Espelha a policy
-- "members_public_self_register" que já existe pro anônimo, só que
-- pra quem está logado (com Google) mas ainda sem vínculo nenhum.
-- ---------------------------------------------------------------------
drop policy if exists "members_self_register_authenticated" on members;
create policy "members_self_register_authenticated" on members
  for insert to authenticated
  with check (
    posicao = 'Visitante' and situacao_saida = 'ativo' and active = true
    and not exists (select 1 from profiles where user_id = auth.uid())
  );
