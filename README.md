# Dashboard de Membros — Videira SCS / Rede Oikos

App para cadastro de membros, presença no culto e movimentações da rede,
usado pelos líderes de célula. Front-end estático (HTML/JS puro, sem
build step) com [Supabase](https://supabase.com) como backend (banco de
dados + autenticação).

## Abas

- **Cadastro de Membros** — lista, filtros, KPIs e gráficos dos membros da rede. Posições: Visitante → Frequentador Assíduo (após 4 células seguidas) → Membro (após Encontro com Deus + batismo) → Líder em Treinamento, Anfitrião, Anjo da Guarda, Líder, Discipulador, Obreiro, Pastor de Rede, Pastor. A promoção é manual (o líder muda a posição no cadastro; fica registrado em Movimentações). Cada pessoa recebe um **Nº de matrícula** sequencial e único, atribuído automaticamente pelo banco de dados no momento do cadastro (inclusive pelo cadastro público) — nunca é reaproveitado, mesmo que o registro seja excluído depois.
- **Presença por Célula** — lida de uma planilha Google (formulário que os líderes já preenchem), somente leitura.
- **Presença no Culto** — check-in pessoa por pessoa, por culto/data.
- **Trilho do Vencedor** — acompanhamento dos cursos (Ceifeiros, Maturidade, CTL, Seminário Pastoral).
- **Movimentações** — histórico de mudanças de célula/posição/batismo/encontro/situação por pessoa, mais notas manuais, e o relatório de **Perdidos por Célula** (conta só quem saiu como "Perdido"; transferidos não entram nessa contagem).
- **+ Novo Cadastro** — formulário de criação e edição de membros.
- **Administração** — só aparece para quem tem acesso total (Pastor/Pastor de Rede/admin). Cadastra novas células e nova liderança (Pastor, Obreiro, Discipulador, Líder), com opção de já criar o login da pessoa; e define qual discipulador e qual obreiro são responsáveis por cada célula — isso controla o que cada líder enxerga (veja "Acesso por nível" abaixo). Detalhes em "Administração: novas células e liderança".

## Cadastro público (sem login)

Um visitante pode se cadastrar sozinho, sem precisar de login: link "Sou
visitante, quero me cadastrar" na tela de entrada, ou direto pela URL
`index.html?cadastro` (bom para colocar num QR code na entrada). O
formulário é simplificado (nome, tipo, célula, nascimento, telefone) e
sempre grava a pessoa como "Visitante" — o RLS no banco garante isso
mesmo que alguém tente forçar outro valor.

## Acesso por nível de liderança

Cada login vê nos relatórios só o que está no seu escopo, decidido pela
**posição e célula do próprio cadastro da pessoa** (sem tabela de papéis
separada):

- **Pastor, Pastor de Rede, ou marcado como admin** — vê e edita tudo.
- **Obreiro** — vê os discipuladores abaixo dele e todas as células/membros
  na linha desses discipuladores.
- **Discipulador** — vê os líderes/células diretamente abaixo dele.
- **Qualquer outra posição (Líder, Anfitrião, Membro, etc.)** — vê só a
  própria célula.

Isso é reforçado por Row Level Security no Postgres (não é só escondido
na tela) — veja `supabase/add_rbac.sql`. "Presença por Célula" (planilha
Google) e "Presença no Culto" continuam abertos a qualquer líder logado,
independente do nível — só o Cadastro/Trilho/Movimentações seguem a
hierarquia.

Como cada login descobre quem é: no primeiro acesso, aparece uma tela
"Qual desses é você?" — o próprio líder busca e seleciona seu nome no
cadastro, uma vez só.

## Administração: novas células e liderança

Na aba **Administração** (só acesso total):

- **Nova Célula** — cadastra uma célula nova (nome + discipulador/obreiro
  responsável, opcional na hora de criar). A partir daí ela já aparece em
  todos os seletores de célula do app, inclusive no cadastro público.
- **Nova Liderança** — cadastra um novo Pastor, Obreiro, Discipulador ou
  Líder, escolhendo entre criar a pessoa do zero ou vincular a acesso a
  alguém já cadastrado. Regras aplicadas:
  - Discipulador, Obreiro, Pastor e Pastor de Rede **não têm** célula.
  - Líder **precisa** de uma célula, e essa célula precisa já ter um
    discipulador responsável definido (em Nova Célula ou na tabela mais
    abaixo) — é assim que todo líder fica vinculado a um discipulador.
  - Uma célula pode ter 0, 1 ou 2 líderes (normalmente um casal) — não é
    um campo separado, é só "quem tem posição Líder está com essa célula".
  - Tem a opção de já criar o **login** da pessoa (e-mail + senha
    inicial) na mesma tela, em vez de convidar depois pelo painel.

### Criar login com senha inicial (Edge Function)

A chave que o site usa no navegador (anon key) não tem permissão de criar
logins — só a chave secreta do projeto (`service_role`) pode, e ela nunca
pode aparecer no navegador. Por isso, criar login com senha inicial
direto na tela de Administração depende de uma pequena Edge Function
rodando no Supabase:

1. No painel do Supabase, vá em **Edge Functions → Deploy a new function**,
   nomeie como `admin-create-user`, e cole o conteúdo de
   [`supabase/functions/admin-create-user/index.ts`](supabase/functions/admin-create-user/index.ts).
   (Alternativa via linha de comando, se preferir: instale a
   [Supabase CLI](https://supabase.com/docs/guides/cli), rode
   `supabase link --project-ref SEU-PROJETO` e depois
   `supabase functions deploy admin-create-user`.)
2. Não precisa configurar nenhuma variável de ambiente — `SUPABASE_URL`,
   `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis
   automaticamente pra toda Edge Function do projeto.
3. Pronto — a partir daí, o checkbox "Criar acesso de login agora" na
   aba Administração funciona.

Se você preferir não configurar isso, dá pra deixar o checkbox
desmarcado: a tela ainda cadastra a pessoa e a posição/célula dela
normalmente, e o login continua podendo ser criado do jeito de sempre
(**Authentication → Users → Invite user**, passo 5 abaixo).

## Configuração inicial (uma vez só)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) (cria as tabelas e as políticas de acesso).
3. Ainda no SQL Editor, rode [`supabase/seed.sql`](supabase/seed.sql) **uma única vez** para importar os membros já cadastrados anteriormente — rodar de novo duplica todo mundo (se isso acontecer, rode [`supabase/dedupe_members.sql`](supabase/dedupe_members.sql) para corrigir). Depois rode [`supabase/migrate_posicoes.sql`](supabase/migrate_posicoes.sql) uma vez para atualizar os cadastros importados para o novo modelo de posições.
   - Se o seu projeto Supabase já existia **antes** do campo "Situação" (transferência/perdido) ser adicionado, rode também [`supabase/add_situacao_saida.sql`](supabase/add_situacao_saida.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
4. Rode [`supabase/add_rbac.sql`](supabase/add_rbac.sql) uma vez (acesso por nível de liderança + cadastro público — veja as seções acima).
   - Se o seu projeto já existia **antes** do número de matrícula (coluna "Nº"), rode também [`supabase/add_numero.sql`](supabase/add_numero.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
5. Rode [`supabase/add_admin_area.sql`](supabase/add_admin_area.sql) uma vez, depois do `add_rbac.sql` (célula deixa de ser obrigatória pra liderança sênior, e vira uma tabela de verdade em vez de lista fixa — veja "Administração" acima). É um passo pra **todo mundo**, novo ou existente, não só quem já tinha o app rodando antes.
6. (Opcional, mas recomendado) Publique a Edge Function `admin-create-user` — veja "Criar login com senha inicial" acima. Sem isso, a aba Administração continua funcionando, só sem o botão de criar senha na hora.
7. Em **Authentication → Users → Invite user**, crie um login (e-mail/senha) para cada líder que vai usar o app. Só o cadastro de uma pessoa nova é público — logins continuam sendo só os que você criar aqui (ou pela aba Administração, se configurou a Edge Function).
8. Em **Settings → API**, copie a **Project URL** e a **anon public key** e cole em [`config.js`](config.js):
   ```js
   window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
   window.SUPABASE_ANON_KEY = 'sua-anon-key';
   ```
   Esses valores são públicos por design do Supabase — a segurança dos dados vem das políticas de RLS em `schema.sql`/`add_rbac.sql`, não do sigilo dessas strings.
9. Faça login pela primeira vez (você) — a tela "Qual desses é você?" vai aparecer; selecione seu próprio cadastro.
10. Vire admin com acesso total: em **Authentication → Users**, copie o seu
    `User UID`, depois rode no SQL Editor (`auth.uid()` não funciona aqui —
    o SQL Editor não roda como um usuário logado do app):
    ```sql
    update profiles set is_admin = true where user_id = 'COLE-SEU-USER-UID-AQUI';
    ```
11. Com acesso total, abra a aba **Administração** pra cadastrar células, liderança, e definir o discipulador/obreiro de cada célula.

## Rodando localmente

```bash
python -m http.server 8080
```
depois abra `http://localhost:8080`.

## Atualizando o código (`app.js`/`config.js`)

`index.html` carrega esses dois arquivos com `?v=N` no final
(`app.js?v=2`). Navegadores guardam JS em cache agressivamente; sempre
que editar `app.js` ou `config.js`, aumente esse número em
`index.html` para garantir que quem já tinha o site aberto (ou em cache)
puxe a versão nova.

## Publicando (GitHub Pages)

O app é 100% estático, então pode ser hospedado direto pelo GitHub Pages:
**Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
Isso exige que o repositório seja público (dado pessoal não fica mais no
Git — só no Supabase, atrás de login).
