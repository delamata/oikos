-- Número de matrícula sequencial e único para cada membro. Gerado
-- automaticamente pelo Postgres a cada novo cadastro — nunca é
-- reaproveitado, mesmo que um registro seja excluído depois (é uma
-- sequence, só anda pra frente). Rode uma vez no SQL Editor do Supabase.

alter table members add column if not exists numero integer;

-- Preenche quem já está cadastrado, na ordem em que foi criado (quem
-- está há mais tempo recebe o número mais baixo).
with numerados as (
  select id, row_number() over (order by created_at, id) as rn
  from members
  where numero is null
)
update members set numero = numerados.rn
from numerados
where members.id = numerados.id;

-- Sequence para os próximos cadastros, continuando de onde o backfill parou.
create sequence if not exists members_numero_seq;
select setval('members_numero_seq', coalesce((select max(numero) from members), 0) + 1, false);

alter table members alter column numero set default nextval('members_numero_seq');
alter table members alter column numero set not null;
alter sequence members_numero_seq owned by members.numero;

alter table members drop constraint if exists members_numero_unique;
alter table members add constraint members_numero_unique unique (numero);

create index if not exists members_numero_idx on members (numero);
