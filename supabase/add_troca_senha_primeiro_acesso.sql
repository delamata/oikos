-- Troca de senha no primeiro acesso.
--
-- Quem recebe um login criado pelo administrador entra com uma senha
-- inicial que o administrador escolheu — ou seja, uma senha que outra
-- pessoa conhece. No primeiro acesso o sistema agora pede que ela crie
-- a própria senha antes de abrir qualquer tela.
--
-- Vale só para quem entra com e-mail e senha. Quem entra com Google não
-- tem senha no Oikos (quem cuida disso é a conta Google), então nunca vê
-- essa tela.
--
-- A marca fica em profiles.senha_trocada: nasce `false` (precisa trocar)
-- e vira `true` assim que a pessoa cria a senha dela.
--
-- Rode uma vez no SQL Editor do Supabase.

alter table profiles add column if not exists senha_trocada boolean not null default false;

comment on column profiles.senha_trocada is
  'false = ainda está com a senha inicial criada pelo admin; a tela de troca aparece no próximo login por e-mail/senha.';

-- Quem já usa o sistema hoje não é incomodado: só os logins criados
-- daqui para frente começam com a troca pendente.
update profiles set senha_trocada = true where senha_trocada = false;

-- Se você quiser forçar a troca para alguém específico (ex: acabou de
-- redefinir a senha dessa pessoa na mão), rode:
-- update profiles set senha_trocada = false where member_id = '<id da pessoa>';
