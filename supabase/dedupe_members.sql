-- Remove duplicatas em members criadas por ter rodado seed.sql mais de
-- uma vez. Mantém, para cada grupo de linhas com o mesmo
-- nome + célula + nascimento + telefone, apenas a de menor id — o resto
-- é apagado.
--
-- Rode uma vez no SQL Editor do Supabase. É seguro rodar de novo depois:
-- se não houver duplicatas, o comando simplesmente não apaga nada.

delete from members a
using members b
where a.id > b.id
  and a.nome = b.nome
  and a.celula = b.celula
  and coalesce(a.nasc::text, '') = coalesce(b.nasc::text, '')
  and coalesce(a.tel, '') = coalesce(b.tel, '');

-- Confira o resultado (deve voltar a mostrar 67, ou o total esperado):
select count(*) as total_membros from members;

-- Opcional, mas recomendado: impede que isso se repita no futuro (por
-- exemplo, se alguém rodar seed.sql de novo por engano). Com este índice,
-- uma nova tentativa de inserir a mesma pessoa dá erro em vez de duplicar
-- silenciosamente.
create unique index if not exists members_dedupe_idx
  on members (nome, celula, (coalesce(nasc::text, '')), (coalesce(tel, '')));
