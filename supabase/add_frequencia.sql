-- Módulo de Frequência das células: o líder lança, por encontro, quem
-- esteve na célula e quem esteve no culto da semana.
--
-- Presença no CULTO não ganha tabela nova: continua em cultos /
-- presencas_culto, que já existem e alimentam a tela "Presença no
-- Culto". Aqui entram só o encontro da célula e a presença nele.
--
-- Rode uma vez no SQL Editor do Supabase, depois de
-- add_hierarquia_status.sql.

-- ---------------------------------------------------------------------
-- 1. Visitante: quem convidou e quando visitou pela primeira vez
-- ---------------------------------------------------------------------
alter table members add column if not exists convidado_por_id uuid references members(id) on delete set null;
alter table members add column if not exists primeira_visita date;

create index if not exists members_convidado_por_idx on members (convidado_por_id);

-- ---------------------------------------------------------------------
-- 2. Encontro da célula (uma linha por célula/data)
-- ---------------------------------------------------------------------
create table if not exists celula_encontros (
  id uuid primary key default gen_random_uuid(),
  celula text not null references celula_hierarquia(celula),
  data date not null,
  lider_id uuid references members(id) on delete set null,
  culto_id uuid references cultos(id) on delete set null,
  observacao text,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (celula, data)
);

create index if not exists celula_encontros_celula_idx on celula_encontros (celula);
create index if not exists celula_encontros_data_idx on celula_encontros (data desc);
create index if not exists celula_encontros_celula_data_idx on celula_encontros (celula, data desc);

drop trigger if exists celula_encontros_set_updated_at on celula_encontros;
create trigger celula_encontros_set_updated_at
  before update on celula_encontros
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Presença de cada pessoa no encontro da célula
-- ---------------------------------------------------------------------
create table if not exists presencas_celula (
  id uuid primary key default gen_random_uuid(),
  encontro_id uuid not null references celula_encontros(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  presente boolean not null default false,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  updated_at timestamptz not null default now(),
  unique (encontro_id, member_id)
);

create index if not exists presencas_celula_encontro_idx on presencas_celula (encontro_id);
create index if not exists presencas_celula_member_idx on presencas_celula (member_id);

drop trigger if exists presencas_celula_set_updated_at on presencas_celula;
create trigger presencas_celula_set_updated_at
  before update on presencas_celula
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Culto da semana do encontro — acha ou cria o culto do domingo
--    daquela semana, pra presença no culto continuar numa fonte só.
-- ---------------------------------------------------------------------
create or replace function culto_da_semana(p_data date) returns uuid
language plpgsql security definer as $$
declare
  v_domingo date := p_data - extract(dow from p_data)::int;
  v_id uuid;
begin
  if not coalesce((select member_id is not null from meu_perfil()), false) then
    raise exception 'Sem permissão para registrar presença.';
  end if;
  select id into v_id from cultos where data = v_domingo and tipo = 'Culto';
  if v_id is null then
    insert into cultos (data, tipo, created_by) values (v_domingo, 'Culto', auth.uid())
      on conflict (data, tipo) do update set data = excluded.data
      returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function culto_da_semana(date) to authenticated;

-- ---------------------------------------------------------------------
-- 5. RLS — cada líder só enxerga e lança na própria célula
-- ---------------------------------------------------------------------
alter table celula_encontros enable row level security;
alter table presencas_celula enable row level security;

drop policy if exists "encontros_scope" on celula_encontros;
create policy "encontros_scope" on celula_encontros
  for all to authenticated
  using (pode_ver_celula(celula))
  with check (pode_ver_celula(celula));

drop policy if exists "presencas_celula_scope" on presencas_celula;
create policy "presencas_celula_scope" on presencas_celula
  for all to authenticated
  using (pode_ver_celula((select celula from celula_encontros e where e.id = encontro_id)))
  with check (pode_ver_celula((select celula from celula_encontros e where e.id = encontro_id)));

-- presencas_culto estava aberta a qualquer login: passa a seguir o
-- escopo da célula da pessoa, igual a members e movimentacoes.
drop policy if exists "authenticated_all" on presencas_culto;
drop policy if exists "presencas_culto_scope" on presencas_culto;
create policy "presencas_culto_scope" on presencas_culto
  for all to authenticated
  using (pode_ver_celula((select celula from members m where m.id = member_id)))
  with check (pode_ver_celula((select celula from members m where m.id = member_id)));

-- ---------------------------------------------------------------------
-- 6. Auditoria da presença (quem alterou o quê, e quando)
-- ---------------------------------------------------------------------
drop trigger if exists presencas_celula_auditoria on presencas_celula;
create trigger presencas_celula_auditoria
  after update on presencas_celula
  for each row execute function auditar_mudancas('{presente}', 'id');

drop trigger if exists presencas_culto_auditoria on presencas_culto;
create trigger presencas_culto_auditoria
  after update on presencas_culto
  for each row execute function auditar_mudancas('{presente}', 'id');

-- ---------------------------------------------------------------------
-- 7. Resumo por encontro, para o dashboard não baixar linha por linha.
--    security_invoker: a view respeita a RLS de quem consulta.
-- ---------------------------------------------------------------------
drop view if exists frequencia_encontros;
create view frequencia_encontros with (security_invoker = true) as
  select
    e.id,
    e.celula,
    e.data,
    e.lider_id,
    e.culto_id,
    count(p.*) filter (where p.id is not null)                as pessoas,
    count(p.*) filter (where p.presente)                      as presentes,
    count(p.*) filter (where not p.presente)                  as ausentes,
    count(pc.*) filter (where pc.presente)                    as presentes_culto,
    count(m.*) filter (where m.status_pessoa = 'Visitante')   as visitantes,
    count(m.*) filter (where m.status_pessoa = 'Frequentador Assíduo') as fas,
    count(m.*) filter (where m.status_pessoa = 'Membro')      as membros
  from celula_encontros e
  left join presencas_celula p on p.encontro_id = e.id
  left join members m on m.id = p.member_id
  left join presencas_culto pc on pc.member_id = p.member_id and pc.culto_id = e.culto_id
  group by e.id, e.celula, e.data, e.lider_id, e.culto_id;

grant select on frequencia_encontros to authenticated;

-- ---------------------------------------------------------------------
-- 8. Renomear célula passa a levar os encontros junto (add_editar_celula.sql)
-- ---------------------------------------------------------------------
create or replace function editar_celula(
  p_celula text,
  p_novo_nome text,
  p_discipulador_id uuid,
  p_obreiro_id uuid
) returns text
language plpgsql security definer as $$
declare
  v_nome text := btrim(coalesce(p_novo_nome, ''));
begin
  if not coalesce((select is_full from meu_perfil()), false) then
    raise exception 'Só Pastor ou administrador pode editar células.';
  end if;
  if v_nome = '' then
    raise exception 'Digite o nome da célula.';
  end if;
  if not exists (select 1 from celula_hierarquia where celula = p_celula) then
    raise exception 'Célula não encontrada: %', p_celula;
  end if;

  if v_nome = p_celula then
    update celula_hierarquia
      set discipulador_id = p_discipulador_id, obreiro_id = p_obreiro_id
      where celula = p_celula;
    return v_nome;
  end if;

  if exists (
    select 1 from celula_hierarquia
    where lower(celula) = lower(v_nome) and celula <> p_celula
  ) then
    raise exception 'Já existe uma célula chamada "%".', v_nome;
  end if;

  insert into celula_hierarquia (celula, discipulador_id, obreiro_id)
    values (v_nome, p_discipulador_id, p_obreiro_id);
  update members set celula = v_nome where celula = p_celula;
  update celula_encontros set celula = v_nome where celula = p_celula;
  delete from celula_hierarquia where celula = p_celula;

  return v_nome;
end;
$$;
