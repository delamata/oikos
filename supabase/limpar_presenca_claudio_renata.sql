-- Apaga os lançamentos de presença da célula "Claudio e Renata".
--
-- ATENÇÃO: isto apaga dados de verdade, sem volta. Rode o passo 1
-- primeiro e confira na tela se é isso mesmo que você quer remover.
-- Os CADASTROS das pessoas não são tocados — só os lançamentos de
-- presença. Depois disso a célula volta a aparecer como "sem
-- lançamento", e é só lançar de novo pela aba Frequência.
--
-- Se a célula tiver outro nome no seu banco (acentos, grafia), ajuste a
-- linha abaixo. Para conferir os nomes exatos:
--     select celula from celula_hierarquia order by celula;

-- ---------------------------------------------------------------------
-- 1. CONFERIR — o que existe hoje
-- ---------------------------------------------------------------------
select e.data,
       count(p.*)                            as pessoas_lancadas,
       count(p.*) filter (where p.presente)  as presentes
  from celula_encontros e
  left join presencas_celula p on p.encontro_id = e.id
 where e.celula = 'Claudio e Renata'
 group by e.data
 order by e.data desc;

-- Presenças de culto lançadas junto com esses encontros (modelo antigo,
-- quando célula e culto iam na mesma tela):
select c.data as data_do_culto, count(*) as presencas
  from presencas_culto pc
  join cultos c on c.id = pc.culto_id
  join members m on m.id = pc.member_id
 where m.celula = 'Claudio e Renata'
   and c.id in (select culto_id from celula_encontros where celula = 'Claudio e Renata' and culto_id is not null)
 group by c.data
 order by c.data desc;

-- ---------------------------------------------------------------------
-- 2. APAGAR — rode só depois de conferir o passo 1
-- ---------------------------------------------------------------------
-- Presenças de culto que vieram daquele lançamento conjunto:
delete from presencas_culto pc
 using members m
 where pc.member_id = m.id
   and m.celula = 'Claudio e Renata'
   and pc.culto_id in (
     select culto_id from celula_encontros
      where celula = 'Claudio e Renata' and culto_id is not null
   );

-- Os encontros da célula (presencas_celula sai junto, por cascata):
delete from celula_encontros where celula = 'Claudio e Renata';
