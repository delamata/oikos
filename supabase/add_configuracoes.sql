-- Configurações editáveis pelo administrador.
--
-- Por enquanto só o subtítulo que aparece embaixo do logo no menu
-- lateral (hoje fixo como "Videira SCS" no código). Uma linha só
-- (id = 1), editável em Administração por quem tem acesso total —
-- mesma regra de celula_hierarquia.
--
-- Rode uma vez no SQL Editor do Supabase.

create table if not exists configuracoes (
  id int primary key default 1,
  subtitulo text not null default 'Videira Igreja em Células',
  constraint configuracoes_singleton check (id = 1)
);

insert into configuracoes (id) values (1) on conflict (id) do nothing;

alter table configuracoes enable row level security;

create policy "configuracoes_select_all" on configuracoes
  for select to authenticated using (true);

create policy "configuracoes_write_full" on configuracoes
  for update using ((select is_full from meu_perfil()))
  with check ((select is_full from meu_perfil()));
