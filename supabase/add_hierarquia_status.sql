-- Hierarquia do Oikos: separa a JORNADA da pessoa (Visitante → FA →
-- Membro) da FUNÇÃO ministerial (Anfitrião, Líder, Discipulador,
-- Obreiro/Pastor de Rede, Pastor), e registra quem supervisiona quem.
--
-- Nada é apagado e nada quebra: a coluna `posicao`, usada hoje por todas
-- as telas, gráficos e regras de acesso, continua existindo e passa a
-- ser preenchida sozinha (a função quando houver; senão o status).
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_admin_area.sql.

-- ---------------------------------------------------------------------
-- 1. Catálogo de funções e status — deixa a hierarquia explícita no
--    banco (e permite acrescentar níveis depois sem mexer no código).
-- ---------------------------------------------------------------------
create table if not exists funcoes (
  nome text primary key,
  categoria text not null check (categoria in ('jornada', 'ministerial')),
  nivel int not null,              -- 1 = Pastor (topo) … 9 = Visitante
  exige_celula boolean not null default true,
  ativa boolean not null default true
);

insert into funcoes (nome, categoria, nivel, exige_celula) values
  ('Pastor',                'ministerial', 1, false),
  ('Pastor de Rede',        'ministerial', 2, false),
  ('Obreiro',               'ministerial', 2, false),
  ('Discipulador',          'ministerial', 3, false),
  ('Líder',                 'ministerial', 4, true),
  ('Líder em Treinamento',  'ministerial', 5, true),
  ('Anfitrião',             'ministerial', 5, true),
  ('Anjo da Guarda',        'ministerial', 5, true),
  ('Membro',                'jornada',     6, true),
  ('Frequentador Assíduo',  'jornada',     7, true),
  ('Visitante',             'jornada',     8, true)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- 2. Colunas novas em members
-- ---------------------------------------------------------------------
alter table members add column if not exists status_pessoa text;
alter table members add column if not exists funcao text;
alter table members add column if not exists supervisor_id uuid references members(id) on delete set null;

-- Backfill a partir do que já existe em `posicao` — ninguém perde nada:
-- quem é Visitante/FA continua assim; qualquer outra posição é alguém
-- que já é Membro e, se for função ministerial, ela vai para `funcao`.
update members set
  status_pessoa = coalesce(status_pessoa, case
    when posicao in ('Visitante', 'Frequentador Assíduo') then posicao
    else 'Membro' end),
  funcao = coalesce(funcao, case
    when posicao in ('Visitante', 'Frequentador Assíduo', 'Membro') then null
    else posicao end);

alter table members alter column status_pessoa set default 'Visitante';
alter table members alter column status_pessoa set not null;

alter table members drop constraint if exists members_status_pessoa_check;
alter table members add constraint members_status_pessoa_check
  check (status_pessoa in ('Visitante', 'Frequentador Assíduo', 'Membro'));

alter table members drop constraint if exists members_funcao_fkey;
alter table members add constraint members_funcao_fkey
  foreign key (funcao) references funcoes(nome);

-- Anfitrião é sempre um Membro com célula (a célula já é exigida pelo
-- members_celula_required_check criado em add_admin_area.sql).
alter table members drop constraint if exists members_anfitriao_membro_check;
alter table members add constraint members_anfitriao_membro_check
  check (funcao is distinct from 'Anfitrião' or status_pessoa = 'Membro');

create index if not exists members_status_pessoa_idx on members (status_pessoa);
create index if not exists members_funcao_idx on members (funcao);
create index if not exists members_supervisor_idx on members (supervisor_id);

-- ---------------------------------------------------------------------
-- 3. `posicao` passa a ser derivada (função quando existe, senão
--    status). Mantém funcionando tudo que já lê essa coluna: RLS,
--    meu_perfil(), gráficos, filtros, relatórios.
-- ---------------------------------------------------------------------
create or replace function members_sincronizar_posicao() returns trigger
language plpgsql as $$
begin
  -- Quem ainda grava só `posicao` (telas antigas) continua funcionando:
  -- traduz a posição recebida para status/função.
  if tg_op = 'UPDATE' and new.posicao is distinct from old.posicao
     and new.funcao is not distinct from old.funcao
     and new.status_pessoa is not distinct from old.status_pessoa then
    if new.posicao in ('Visitante', 'Frequentador Assíduo') then
      new.status_pessoa := new.posicao;
      new.funcao := null;
    elsif new.posicao = 'Membro' then
      new.status_pessoa := 'Membro';
      new.funcao := null;
    else
      new.status_pessoa := 'Membro';
      new.funcao := new.posicao;
    end if;
  end if;

  if new.status_pessoa is null then
    new.status_pessoa := case
      when new.posicao in ('Visitante', 'Frequentador Assíduo') then new.posicao
      else 'Membro' end;
  end if;
  if tg_op = 'INSERT' and new.funcao is null
     and new.posicao is not null
     and new.posicao not in ('Visitante', 'Frequentador Assíduo', 'Membro') then
    new.funcao := new.posicao;
  end if;

  new.posicao := coalesce(new.funcao, new.status_pessoa);
  return new;
end;
$$;

drop trigger if exists members_posicao_sync on members;
create trigger members_posicao_sync
  before insert or update on members
  for each row execute function members_sincronizar_posicao();

-- ---------------------------------------------------------------------
-- 4. Supervisor: Líder → Discipulador → Obreiro → Pastor.
--    Preenche a partir da hierarquia de células já cadastrada.
-- ---------------------------------------------------------------------
update members m set supervisor_id = h.discipulador_id
  from celula_hierarquia h
  where m.celula = h.celula
    and m.supervisor_id is null
    and h.discipulador_id is not null
    and m.funcao = 'Líder'
    and h.discipulador_id <> m.id;

update members m set supervisor_id = sub.obreiro_id
  from (
    select distinct on (discipulador_id) discipulador_id, obreiro_id
    from celula_hierarquia
    where discipulador_id is not null and obreiro_id is not null
  ) sub
  where m.id = sub.discipulador_id
    and m.supervisor_id is null
    and sub.obreiro_id <> m.id;

-- Visão pronta da corrente de liderança de cada célula.
create or replace view rede_hierarquia as
  select
    h.celula,
    h.discipulador_id,
    d.nome as discipulador_nome,
    h.obreiro_id,
    o.nome as obreiro_nome,
    o.supervisor_id as pastor_id,
    p.nome as pastor_nome,
    (select count(*) from members m where m.celula = h.celula and m.active) as pessoas_ativas
  from celula_hierarquia h
  left join members d on d.id = h.discipulador_id
  left join members o on o.id = h.obreiro_id
  left join members p on p.id = o.supervisor_id;

grant select on rede_hierarquia to authenticated;

-- ---------------------------------------------------------------------
-- 5. Auditoria: quem mudou o quê, quando, de que valor para qual.
--    Escrita por gatilho — o navegador não consegue burlar nem apagar.
-- ---------------------------------------------------------------------
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id text not null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  operacao text not null,
  user_id uuid references auth.users,
  criado_em timestamptz not null default now()
);

create index if not exists auditoria_registro_idx on auditoria (tabela, registro_id);
create index if not exists auditoria_criado_em_idx on auditoria (criado_em desc);

-- Lê os campos por JSON: cada tabela tem a sua chave (members usa id,
-- celula_hierarquia usa o nome da célula), e um campo que não existe
-- vira nulo em vez de derrubar o UPDATE.
create or replace function auditar_mudancas() returns trigger
language plpgsql security definer as $$
declare
  v_campos text[] := tg_argv[0]::text[];
  v_chave text := coalesce(nullif(tg_argv[1], ''), 'id');
  v_novo jsonb := coalesce(to_jsonb(new), '{}'::jsonb);
  v_velho jsonb := coalesce(to_jsonb(old), '{}'::jsonb);
  v_id text := coalesce(v_novo ->> v_chave, v_velho ->> v_chave);
  v_campo text;
begin
  foreach v_campo in array v_campos loop
    if (v_velho ->> v_campo) is distinct from (v_novo ->> v_campo) then
      insert into auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, operacao, user_id)
        values (tg_table_name, v_id, v_campo, v_velho ->> v_campo, v_novo ->> v_campo, tg_op, auth.uid());
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists members_auditoria on members;
create trigger members_auditoria
  after update on members
  for each row execute function auditar_mudancas(
    '{posicao,funcao,status_pessoa,celula,supervisor_id,active,situacao_saida,conjuge_id}', 'id');

drop trigger if exists hierarquia_auditoria on celula_hierarquia;
create trigger hierarquia_auditoria
  after update on celula_hierarquia
  for each row execute function auditar_mudancas(
    '{celula,discipulador_id,obreiro_id}', 'celula');

alter table auditoria enable row level security;

drop policy if exists "auditoria_select_full" on auditoria;
create policy "auditoria_select_full" on auditoria
  for select using ((select is_full from meu_perfil()));
