-- Atualiza o cadastro existente para o novo modelo de posições (11 níveis).
-- As demais posições antigas (Membro, Anfitrião, Discipulador,
-- Frequentador Assíduo, Visitante) já têm o mesmo nome no modelo novo —
-- só "Líder de Célula" precisa ser renomeado para "Líder".
--
-- Rode uma vez no SQL Editor do Supabase.

update members set posicao = 'Líder' where posicao = 'Líder de Célula';

-- Confira: nenhuma linha deve aparecer aqui (posição fora da lista nova).
select id, nome, posicao from members
where posicao not in (
  'Visitante', 'Frequentador Assíduo', 'Membro', 'Líder em Treinamento',
  'Anfitrião', 'Anjo da Guarda', 'Líder', 'Discipulador', 'Obreiro',
  'Pastor de Rede', 'Pastor'
);
