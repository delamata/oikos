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

## Cadastro de Membros sem login (versão limitada)

Quem abre o site sem estar logado cai direto numa versão limitada do
**Cadastro de Membros** — não precisa de login pra consultar quem já
está cadastrado. Só mostra **nome, célula, posição e idade**; não
mostra telefone, data de nascimento exata, estado civil, nem abre a
ficha detalhada de cada pessoa (isso continua exigindo login). As
outras abas aparecem trancadas na barra lateral — clicar em qualquer
uma delas abre o formulário de login.

Isso é garantido por uma **view** separada no banco
(`members_publico`, ver `supabase/add_public_cadastro_view.sql`) que só
expõe essas colunas pra quem não está logado — a tabela `members`
inteira continua 100% bloqueada pra quem não tem sessão, então não dá
pra "pedir mais campos" burlando a tela: o telefone e a data de
nascimento de ninguém saem do banco sem login.

Um botão **"Entrar"** na barra lateral abre o login normal de sempre.

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

## Login com Google

A tela de entrada tem um botão **"Continuar com Google"**, além do
login por e-mail/senha de sempre. Ele funciona de dois jeitos, e a
diferença entre eles é o que mantém os dados protegidos:

- **Pessoa autorizada por um admin** — na aba Administração → Nova
  Liderança, escolha "Autorizar e-mail do Google" e informe o e-mail do
  Google dela (em vez de definir uma senha). Quando ela entrar com
  esse e-mail, o acesso é vinculado **sozinho** ao cadastro certo, sem
  precisar escolher nada.

  ⚠️ **O sistema não envia e-mail nenhum pra pessoa.** Autorizar só
  registra que aquele e-mail está liberado; quem avisa é você. Depois
  de salvar, a tela mostra uma **mensagem pronta** (com o link do site
  e o e-mail que ela precisa usar) e botões para **enviar por
  WhatsApp** ou copiar. Se ela entrar com outro e-mail Google, não
  vincula — cai como visitante novo.
- **Pessoa não convidada** (qualquer um com conta Google) — ela
  **não** consegue se vincular a um cadastro que já existe. Só pode
  criar um cadastro novo pra si mesma, sempre como "Visitante" — igual
  ao cadastro público, só que já com login. É por isso que a tela
  "Qual desses é você?" (onde dá pra escolher qualquer nome da lista)
  continua aparecendo **apenas** para quem entrou com e-mail/senha
  criada por um admin.

### Ativando o Google no Supabase (uma vez só)

Isso é configuração de painel, não código:

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   crie um **OAuth client ID** do tipo "Web application".
2. No Supabase, em **Authentication → Providers → Google**, ative o
   provedor e cole o **Client ID** e o **Client Secret**. Copie a
   *Callback URL* que o Supabase mostra ali e cole de volta no Google
   Cloud Console em "Authorized redirect URIs".
3. Em **Authentication → URL Configuration**, confira que a **Site
   URL** aponta pro endereço real onde o site está publicado (ex: a
   URL do GitHub Pages) e adicione-a também em "Redirect URLs".

Para testar depois de configurar: convide um e-mail de teste pela aba
Administração e entre com o Google desse e-mail (deve vincular
sozinho); depois entre com um Google diferente, sem convite (deve
oferecer só o formulário de cadastro novo, sem lista de nomes).

## Configuração inicial (uma vez só)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) (cria as tabelas e as políticas de acesso).
3. Ainda no SQL Editor, rode [`supabase/seed.sql`](supabase/seed.sql) **uma única vez** para importar os membros já cadastrados anteriormente — rodar de novo duplica todo mundo (se isso acontecer, rode [`supabase/dedupe_members.sql`](supabase/dedupe_members.sql) para corrigir). Depois rode [`supabase/migrate_posicoes.sql`](supabase/migrate_posicoes.sql) uma vez para atualizar os cadastros importados para o novo modelo de posições.
   - Se o seu projeto Supabase já existia **antes** do campo "Situação" (transferência/perdido) ser adicionado, rode também [`supabase/add_situacao_saida.sql`](supabase/add_situacao_saida.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
4. Rode [`supabase/add_rbac.sql`](supabase/add_rbac.sql) uma vez (acesso por nível de liderança + cadastro público — veja as seções acima).
   - Se o seu projeto já existia **antes** do número de matrícula (coluna "Nº"), rode também [`supabase/add_numero.sql`](supabase/add_numero.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
   - Se o seu projeto já existia **antes** do bloqueio de cadastro duplicado (mesmo nome + mesma data de nascimento), rode também [`supabase/add_unique_nome_nasc.sql`](supabase/add_unique_nome_nasc.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
5. Rode [`supabase/add_admin_area.sql`](supabase/add_admin_area.sql) uma vez, depois do `add_rbac.sql` (célula deixa de ser obrigatória pra liderança sênior, e vira uma tabela de verdade em vez de lista fixa — veja "Administração" acima). É um passo pra **todo mundo**, novo ou existente, não só quem já tinha o app rodando antes.
6. Rode [`supabase/add_public_cadastro_view.sql`](supabase/add_public_cadastro_view.sql) uma vez, depois do `add_admin_area.sql` (cria a view que libera o Cadastro de Membros sem login em versão limitada — veja acima). Também é um passo pra **todo mundo**.
7. Rode [`supabase/add_social_login.sql`](supabase/add_social_login.sql) uma vez, depois do `add_public_cadastro_view.sql` (convites por e-mail + auto-cadastro seguro pra quem entra com Google — veja "Login com Google" abaixo). Também é um passo pra **todo mundo**.
8. (Opcional) Ative o **login com Google** — veja "Login com Google" abaixo. Sem isso, o botão "Continuar com Google" aparece mas dá erro; o login por e-mail/senha continua funcionando normalmente.
9. (Opcional, mas recomendado) Publique a Edge Function `admin-create-user` — veja "Criar login com senha inicial" acima. Sem isso, a aba Administração continua funcionando, só sem o botão de criar senha na hora.
10. Em **Authentication → Users → Invite user**, crie um login (e-mail/senha) para cada líder que vai usar o app. Só o cadastro de uma pessoa nova é público — logins continuam sendo só os que você criar aqui (ou pela aba Administração, se configurou a Edge Function).
11. Em **Settings → API**, copie a **Project URL** e a **anon public key** e cole em [`config.js`](config.js):
    ```js
    window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
    window.SUPABASE_ANON_KEY = 'sua-anon-key';
    ```
    Esses valores são públicos por design do Supabase — a segurança dos dados vem das políticas de RLS em `schema.sql`/`add_rbac.sql`, não do sigilo dessas strings.
12. Faça login pela primeira vez (você) — a tela "Qual desses é você?" vai aparecer; selecione seu próprio cadastro.
13. Vire admin com acesso total: em **Authentication → Users**, copie o seu
    `User UID`, depois rode no SQL Editor (`auth.uid()` não funciona aqui —
    o SQL Editor não roda como um usuário logado do app):
    ```sql
    update profiles set is_admin = true where user_id = 'COLE-SEU-USER-UID-AQUI';
    ```
14. Com acesso total, abra a aba **Administração** pra cadastrar células, liderança, e definir o discipulador/obreiro de cada célula.

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
