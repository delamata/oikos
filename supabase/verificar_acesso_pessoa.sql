-- Verifica quais células uma pessoa enxerga no Oikos, e POR QUÊ.
--
-- Só LÊ — não altera nada. Rode no SQL Editor do Supabase.
--
-- Como usar: troque os dois textos marcados com <<< abaixo
--   1. o nome da pessoa (busca por parte do nome, sem diferenciar maiúsculas)
--   2. a célula que ela DEVERIA ver (para o resultado dizer OK ou ATENÇÃO)
--
-- A regra aplicada é a mesma de pode_ver_celula() no banco, inclusive a
-- versão instalada (com ou sem a regra do cônjuge — a consulta detecta):
--   - admin, Pastor ou Pastor de Rede ............ vê todas as células
--   - discipulador/obreiro marcado na célula ....... vê essa célula
--   - cônjuge de quem é discipulador/obreiro ....... vê a mesma rede
--   - qualquer pessoa .............................. vê a própria célula
-- Quem não tem login não acessa nada — mas a consulta mostra mesmo assim
-- o que a pessoa PASSARIA a ver quando ganhar o login, para conferir
-- antes de liberar.

with parametros as (
  select
    '%camila%'::text         as nome_pessoa,       -- <<< nome (parte do nome)
    '%thiago%camila%'::text  as celula_esperada    -- <<< célula que ela deveria ver
),
alvo as (
  select m.id, m.nome, m.posicao, m.celula, m.conjuge_id, m.active,
         p.user_id, coalesce(p.is_admin, false) as is_admin, u.email
    from members m
    left join profiles p on p.member_id = m.id
    left join auth.users u on u.id = p.user_id
   where m.nome ilike (select nome_pessoa from parametros)
),
regra as (
  -- A regra do cônjuge só existe se add_rede_conjuge.sql foi rodado.
  select position('conjuge' in pg_get_functiondef('pode_ver_celula(text)'::regprocedure)) > 0 as com_conjuge
),
acesso as (
  select a.id as pessoa_id, h.celula,
    case
      when a.is_admin or a.posicao in ('Pastor', 'Pastor de Rede') then 'acesso total'
      when r.com_conjuge and (h.discipulador_id in (a.id, a.conjuge_id) or h.obreiro_id in (a.id, a.conjuge_id)) then
        case when h.discipulador_id = a.id or h.obreiro_id = a.id
             then 'ela é responsável pela célula'
             else 'pela rede do cônjuge' end
      when not r.com_conjuge and a.posicao = 'Obreiro' and h.obreiro_id = a.id then 'ela é obreira da célula'
      when not r.com_conjuge and a.posicao = 'Discipulador' and h.discipulador_id = a.id then 'ela é discipuladora da célula'
      when (r.com_conjuge or a.posicao not in ('Obreiro', 'Discipulador')) and h.celula = a.celula then 'é a célula do cadastro dela'
    end as motivo
    from alvo a
   cross join regra r
   cross join celula_hierarquia h
)
select
  a.nome,
  coalesce(a.email, 'SEM LOGIN')                    as login,
  a.posicao,
  a.celula                                          as celula_do_cadastro,
  a.is_admin,
  cj.nome                                           as conjuge,
  cj.posicao                                        as posicao_do_conjuge,
  (select com_conjuge from regra)                   as regra_do_conjuge_instalada,
  case when a.user_id is null then 0 else count(ac.motivo) end as qtd_celulas_que_ve_hoje,
  count(ac.motivo)                                  as qtd_celulas_com_login,
  string_agg(ac.celula || ' (' || ac.motivo || ')', '; ' order by ac.celula)
    filter (where ac.motivo is not null)            as celulas_com_login,
  (select count(*) from members x
    where x.active
      and x.celula in (select celula from acesso where pessoa_id = a.id and motivo is not null)) as pessoas_que_ve,
  case
    when count(ac.motivo) = 1
     and bool_or(ac.motivo is not null and ac.celula ilike (select celula_esperada from parametros))
      then case when a.user_id is null
                then 'SEM LOGIN: hoje não acessa nada. Com login, verá SOMENTE a célula esperada.'
                else 'OK: vê somente a célula esperada' end
    when count(ac.motivo) = 0
      then case when a.user_id is null
                then 'SEM LOGIN e SEM CÉLULA: mesmo com login não veria nada — confira a célula do cadastro.'
                else 'ATENÇÃO: tem login mas não vê nenhuma célula — confira a célula do cadastro.' end
    else case when a.user_id is null
              then 'SEM LOGIN: hoje não acessa nada. ATENÇÃO: com login, veria outra célula ou mais de uma.'
              else 'ATENÇÃO: vê outra célula, ou mais de uma' end
  end                                               as resultado
  from alvo a
  left join members cj on cj.id = a.conjuge_id
  left join acesso ac on ac.pessoa_id = a.id
 group by a.id, a.nome, a.email, a.posicao, a.celula, a.is_admin, a.user_id, cj.nome, cj.posicao
 order by a.nome;
