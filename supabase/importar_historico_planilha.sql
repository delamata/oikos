-- Histórico de frequência importado da planilha Google (formulário que
-- os líderes preenchiam antes do módulo de Frequência do Oikos).
--
-- A planilha guarda TOTAIS por célula/data (quantos membros, FAs,
-- visitantes e kids estiveram), e não quem esteve presente. Por isso
-- esse histórico entra numa tabela própria, frequencia_planilha, em vez
-- de virar presença pessoa a pessoa — inventar nomes seria falsear o
-- histórico. Os lançamentos novos, feitos no Oikos, continuam pessoa a
-- pessoa em celula_encontros / presencas_celula.
--
-- Ficam DE FORA desta importação, a pedido: tudo de 2025 (52 registros)
-- e a célula "Junior e Luciana" (30 registros), que não existe mais.
--
-- Gerado de: gviz/tq?tqx=out:csv (planilha 1QgKeRK…QTnU, aba 792733803)
-- Registros: 55 (0 envio(s) repetido(s) descartado(s))
-- Período:   2026-01-15 a 2026-09-13
--   Claudio e Renata      26 registros
--   Josivan e Celia       23 registros
--   Otavio e Jô            6 registros
--
-- Pode rodar de novo quando quiser: a tabela é limpa antes de inserir,
-- então reimportar não duplica nada — e quem já tinha importado 2025 ou
-- a Junior e Luciana fica com esses registros removidos. Rode depois de
-- add_frequencia_historico.sql.

begin;

delete from frequencia_planilha;

insert into frequencia_planilha (celula, data, rodizio, membros, fas, visitantes, kids, enviado_em) values
  ('Claudio e Renata', '2026-01-15', false, 0, 0, 0, 0, '2026-01-15 21:01:25'),
  ('Josivan e Celia', '2026-01-16', false, 7, 0, 0, 1, '2026-01-23 10:42:39'),
  ('Claudio e Renata', '2026-02-05', false, 8, 0, 0, 0, '2026-02-06 16:21:11'),
  ('Josivan e Celia', '2026-02-05', false, 13, 1, 0, 3, '2026-02-07 17:31:33'),
  ('Josivan e Celia', '2026-02-12', true, 10, 0, 1, 2, '2026-02-25 19:43:04'),
  ('Josivan e Celia', '2026-02-20', false, 10, 1, 0, 4, '2026-02-25 19:41:25'),
  ('Josivan e Celia', '2026-02-27', false, 10, 2, 0, 3, '2026-03-04 11:48:34'),
  ('Claudio e Renata', '2026-03-05', true, 10, 0, 3, 1, '2026-04-01 20:43:43'),
  ('Josivan e Celia', '2026-03-06', true, 13, 0, 3, 12, '2026-03-14 10:02:21'),
  ('Claudio e Renata', '2026-03-12', false, 9, 0, 0, 0, '2026-04-01 20:42:47'),
  ('Josivan e Celia', '2026-03-13', false, 11, 2, 1, 4, '2026-03-14 09:57:18'),
  ('Claudio e Renata', '2026-03-19', false, 9, 1, 0, 0, '2026-04-01 20:42:07'),
  ('Josivan e Celia', '2026-03-20', false, 10, 1, 0, 3, '2026-03-30 09:47:05'),
  ('Claudio e Renata', '2026-03-26', false, 8, 0, 0, 0, '2026-04-01 20:40:37'),
  ('Otavio e Jô', '2026-03-26', true, 14, 4, 6, 3, '2026-04-09 18:52:03'),
  ('Josivan e Celia', '2026-03-27', false, 11, 1, 0, 4, '2026-03-30 09:48:26'),
  ('Josivan e Celia', '2026-04-02', false, 8, 1, 0, 3, '2026-04-20 14:23:03'),
  ('Otavio e Jô', '2026-04-02', true, 14, 3, 5, 1, '2026-04-09 18:44:49'),
  ('Claudio e Renata', '2026-04-09', false, 8, 0, 0, 0, '2026-04-20 08:59:46'),
  ('Josivan e Celia', '2026-04-10', false, 10, 1, 0, 3, '2026-04-20 14:24:27'),
  ('Claudio e Renata', '2026-04-16', false, 8, 0, 0, 0, '2026-04-20 08:59:17'),
  ('Josivan e Celia', '2026-04-16', false, 12, 0, 0, 2, '2026-04-20 14:25:28'),
  ('Otavio e Jô', '2026-04-17', false, 15, 0, 0, 1, '2026-05-14 15:01:52'),
  ('Claudio e Renata', '2026-04-23', false, 9, 0, 0, 0, '2026-05-15 08:44:14'),
  ('Otavio e Jô', '2026-04-23', false, 17, 0, 2, 1, '2026-05-14 15:06:21'),
  ('Josivan e Celia', '2026-04-24', false, 13, 1, 2, 5, '2026-04-29 20:33:27'),
  ('Claudio e Renata', '2026-04-30', false, 9, 0, 0, 0, '2026-05-15 08:44:36'),
  ('Claudio e Renata', '2026-05-07', false, 8, 1, 0, 1, '2026-05-13 21:22:59'),
  ('Otavio e Jô', '2026-05-07', false, 16, 0, 0, 1, '2026-05-14 15:08:06'),
  ('Claudio e Renata', '2026-05-14', false, 12, 0, 2, 3, '2026-05-15 08:46:01'),
  ('Claudio e Renata', '2026-05-21', false, 16, 1, 0, 2, '2026-05-22 09:02:55'),
  ('Otavio e Jô', '2026-05-21', false, 17, 2, 3, 2, '2026-05-22 14:07:03'),
  ('Josivan e Celia', '2026-05-29', false, 6, 0, 4, 1, '2026-08-21 23:18:04'),
  ('Claudio e Renata', '2026-06-04', false, 11, 0, 1, 1, '2026-06-05 07:25:49'),
  ('Josivan e Celia', '2026-06-05', false, 6, 0, 1, 2, '2026-08-21 23:18:56'),
  ('Josivan e Celia', '2026-06-12', false, 3, 0, 0, 3, '2026-08-21 23:19:59'),
  ('Josivan e Celia', '2026-06-19', false, 3, 0, 0, 2, '2026-08-21 23:22:53'),
  ('Claudio e Renata', '2026-06-25', false, 9, 0, 0, 5, '2026-07-20 09:21:26'),
  ('Claudio e Renata', '2026-07-02', false, 10, 0, 0, 5, '2026-07-20 09:22:40'),
  ('Josivan e Celia', '2026-07-03', false, 4, 0, 2, 1, '2026-08-21 23:26:26'),
  ('Claudio e Renata', '2026-07-08', false, 2, 0, 0, 0, '2026-07-20 09:23:02'),
  ('Josivan e Celia', '2026-07-10', false, 4, 0, 0, 0, '2026-08-21 23:27:40'),
  ('Claudio e Renata', '2026-07-16', false, 17, 0, 0, 6, '2026-07-20 09:24:38'),
  ('Josivan e Celia', '2026-07-17', false, 2, 0, 2, 0, '2026-08-21 23:28:28'),
  ('Claudio e Renata', '2026-07-23', false, 16, 0, 0, 8, '2026-07-24 13:36:18'),
  ('Josivan e Celia', '2026-07-24', false, 4, 0, 0, 1, '2026-08-21 23:28:50'),
  ('Josivan e Celia', '2026-08-14', false, 4, 0, 1, 2, '2026-08-21 23:20:51'),
  ('Claudio e Renata', '2026-08-20', false, 21, 0, 1, 8, '2026-08-21 08:42:39'),
  ('Josivan e Celia', '2026-08-21', false, 6, 0, 0, 1, '2026-08-21 23:20:24'),
  ('Claudio e Renata', '2026-08-27', false, 13, 3, 1, 4, '2026-08-28 08:46:52'),
  ('Claudio e Renata', '2026-08-30', false, 17, 0, 2, 4, '2026-08-05 21:02:53'),
  ('Claudio e Renata', '2026-09-06', false, 11, 0, 0, 1, '2026-09-11 08:31:53'),
  ('Claudio e Renata', '2026-09-10', false, 15, 0, 3, 4, '2026-09-11 08:33:15'),
  ('Claudio e Renata', '2026-09-12', true, 14, 1, 7, 4, '2026-09-13 19:58:49'),
  ('Claudio e Renata', '2026-09-13', false, 11, 0, 0, 2, '2026-09-13 20:00:16');

-- Confira o que entrou:
--   select celula, count(*) registros, sum(membros + fas + visitantes + kids) pessoas
--     from frequencia_planilha group by celula order by celula;

commit;
