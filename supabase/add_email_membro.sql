-- E-mail da pessoa no cadastro (opcional).
--
-- É só um dado de contato, como o telefone: não cria login nem vincula
-- acesso (quem faz isso é o convite por e-mail da aba Administração,
-- em member_invites). Fica em branco em todo mundo que já está
-- cadastrado, e o formulário público (sem login) não pergunta.
--
-- Rode uma vez no SQL Editor do Supabase.

alter table members add column if not exists email text;

comment on column members.email is
  'Contato, opcional. Não é o login: o acesso vem de profiles/member_invites.';

-- Guarda sempre em minúsculas e sem espaços sobrando, para não ficarem
-- dois jeitos de escrever o mesmo e-mail.
alter table members drop constraint if exists members_email_formato_check;
alter table members add constraint members_email_formato_check
  check (email is null or email = lower(trim(email)));
