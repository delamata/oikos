-- Preenche o e-mail no cadastro de quem o sistema já conhece.
--
-- O campo members.email (add_email_membro.sql) nasce vazio para todo
-- mundo. Mas muita gente já tem e-mail guardado em outro lugar:
--   1. quem tem login            → auth.users, pelo vínculo em profiles;
--   2. quem foi convidado por e-mail e ainda não entrou → member_invites;
--   3. quem pediu acesso pelo "Já sou líder" e foi aprovado
--                                → solicitacoes_lideranca.
--
-- Só preenche quem está SEM e-mail no cadastro: nada que já foi digitado
-- na ficha é sobrescrito. Rodar duas vezes não muda nada.
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_email_membro.sql.

-- ---------------------------------------------------------------------
-- Antes (opcional): veja quem vai receber e-mail e de onde ele vem.
-- ---------------------------------------------------------------------
-- select m.nome, m.posicao,
--        lower(btrim(u.email))  as do_login,
--        lower(btrim(i.email))  as do_convite,
--        lower(btrim(s.email))  as do_pedido
--   from members m
--   left join profiles p on p.member_id = m.id
--   left join auth.users u on u.id = p.user_id
--   left join member_invites i on i.member_id = m.id
--   left join lateral (
--     select email from solicitacoes_lideranca
--      where member_id = m.id and status = 'aprovada' and email is not null
--      order by resolvido_em desc nulls last, criado_em desc limit 1
--   ) s on true
--  where m.email is null
--    and coalesce(u.email, i.email, s.email) is not null
--  order by m.nome;

-- ---------------------------------------------------------------------
-- 1. Quem tem login: o e-mail com que a pessoa entra no sistema.
-- ---------------------------------------------------------------------
update members m
   set email = lower(btrim(u.email))
  from profiles p
  join auth.users u on u.id = p.user_id
 where p.member_id = m.id
   and m.email is null
   and u.email is not null
   and btrim(u.email) <> '';

-- ---------------------------------------------------------------------
-- 2. Quem foi convidado por e-mail e ainda não entrou.
-- ---------------------------------------------------------------------
update members m
   set email = lower(btrim(i.email))
  from member_invites i
 where i.member_id = m.id
   and m.email is null
   and btrim(i.email) <> '';

-- ---------------------------------------------------------------------
-- 3. Quem pediu acesso pelo "Já sou líder" e teve o pedido aprovado
--    (o e-mail informado pela própria pessoa).
-- ---------------------------------------------------------------------
update members m
   set email = lower(btrim(s.email))
  from (
    select distinct on (member_id) member_id, email
      from solicitacoes_lideranca
     where member_id is not null and status = 'aprovada'
       and email is not null and btrim(email) <> ''
     order by member_id, resolvido_em desc nulls last, criado_em desc
  ) s
 where s.member_id = m.id
   and m.email is null;

-- ---------------------------------------------------------------------
-- Conferência: quantos ficaram com e-mail, e quem ainda está sem.
-- ---------------------------------------------------------------------
-- select count(*) filter (where email is not null) as com_email,
--        count(*) filter (where email is null)     as sem_email
--   from members where active;
