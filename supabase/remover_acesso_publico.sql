-- Tira o acesso sem login à lista de pessoas.
--
-- Antes, quem abrisse o endereço do sistema sem entrar via o Cadastro de
-- Membros numa versão limitada, que lia a view `members_publico` — e
-- qualquer um podia consultar essa view direto pela API, não só pela tela.
-- Agora a tela do sistema sempre pede login, e a view deixa de existir.
--
-- O que continua sem login (de propósito, cada um com a sua tela):
--   - o cadastro de visitante (index.html?cadastro, o QR code da entrada);
--   - o "Já sou líder", que só CRIA um pedido de acesso;
--   - o lançamento de frequência pelo link da célula (?frequencia=CODIGO).
--
-- Para o "Já sou líder" continuar funcionando sem expor a lista de
-- pessoas, entram duas funções no lugar da view:
--   - liderancas_publicas(): só quem é Discipulador, Obreiro, Pastor de
--     Rede ou Pastor (a lista em que a pessoa toca no próprio nome);
--   - lider_ja_cadastrado(nome): confere um nome de líder e devolve só
--     aquela pessoa, sem listar ninguém.
--
-- Rode uma vez no SQL Editor do Supabase.

drop view if exists members_publico;

-- Compara nomes sem acento e sem diferenciar maiúsculas (mesma regra que
-- o app usa na tela).
create or replace function normaliza_nome(p_nome text) returns text
language sql immutable as $$
  select lower(translate(trim(coalesce(p_nome, '')),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))
$$;

create or replace function liderancas_publicas()
returns table (id uuid, nome text, posicao text)
language sql security definer stable as $$
  select m.id, m.nome, m.posicao
    from members m
   where m.active
     and m.posicao in ('Discipulador', 'Obreiro', 'Pastor de Rede', 'Pastor')
   order by m.nome
$$;

create or replace function lider_ja_cadastrado(p_nome text)
returns table (id uuid, nome text, celula text)
language sql security definer stable as $$
  select m.id, m.nome, m.celula
    from members m
   where m.active
     and m.posicao = 'Líder'
     and normaliza_nome(m.nome) = normaliza_nome(p_nome)
   limit 1
$$;

revoke all on function liderancas_publicas() from public;
revoke all on function lider_ja_cadastrado(text) from public;
grant execute on function liderancas_publicas() to anon, authenticated;
grant execute on function lider_ja_cadastrado(text) to anon, authenticated;

-- Conferência: a view não existe mais e as funções respondem.
-- select * from liderancas_publicas();
-- select * from lider_ja_cadastrado('nome de teste');
