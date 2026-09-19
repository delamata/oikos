# Sistema OIKOS — Videira SCS / Rede Oikos

App para cadastro de membros, presença no culto e movimentações da rede,
usado pelos líderes de célula. Front-end estático (HTML/JS puro, sem
build step) com [Supabase](https://supabase.com) como backend (banco de
dados + autenticação).

## Abas

- **Início** — tela que abre ao entrar: um resumo da rede de quem está logado (pessoas ativas, células, líderes, KPIs de Total de Membros (com a quebra por adultos, jovens e kids)/Frequentadores/Visitantes/Jovens/Kids, Batismo e Encontro, composição por posição, estado civil, um cartão por célula e os aniversariantes do mês). O recorte depende de quem entra:
  - **Admin, Pastor e Pastor de Rede** veem toda a rede e podem filtrar por **Obreiro** e por **Discipulador** (o filtro de discipulador só lista quem está sob o obreiro escolhido). Os filtros seguem a regra do casal: escolher a Simone mostra as células em que o André é o discipulador, e vice-versa; nos cartões o casal aparece junto ("André & Simone"). Veem também a **Rede por discipulador** — clicar num nome filtra por ele.
  - **Discipulador** vê só as células em que é o discipulador responsável; **Obreiro**, as células em que é o obreiro responsável; **Líder** e demais, a própria célula. Isso vem da tabela de Administração — se ninguém definiu a hierarquia, a tela avisa em vez de mostrar números vazios.
  - Clicar num cartão de célula abre o Cadastro de Membros já filtrado por ela.
- **Cadastro de Membros** — lista, filtros, KPIs e gráficos dos membros da rede. **Tipo** de cadastro: Adultos, Jovens ou Kids e Juvenis — cada tipo é contado pelo próprio nome nos indicadores; Jovens entram no Trilho do Vencedor junto com Adultos e podem ser vinculados como cônjuge. Posições: Visitante → Frequentador Assíduo (após 4 células seguidas) → Membro (após Encontro com Deus + batismo) → Líder em Treinamento, Anfitrião, Anjo da Guarda, Líder, Discipulador, Obreiro, Pastor de Rede, Pastor. A promoção é manual (o líder muda a posição no cadastro; fica registrado em Movimentações). Cada pessoa recebe um **Nº de matrícula** sequencial e único, atribuído automaticamente pelo banco de dados no momento do cadastro (inclusive pelo cadastro público) — nunca é reaproveitado, mesmo que o registro seja excluído depois.
- **Frequência** — lançamento semanal, pensado para o celular. Como a célula e o culto acontecem em **dias diferentes**, são **dois lançamentos separados**, cada um com a sua data: a chave no topo alterna entre **Encontro da célula** e **Culto**. O líder abre e já encontra a própria célula selecionada (quando só tem uma, ela fica fixa), a data de hoje para a célula e o domingo mais recente para o culto; marca os presentes e salva. Dá para **apagar um lançamento** (apaga o encontro da célula, ou a presença daquela célula naquele culto — o culto em si continua, porque é da igreja toda). Dá para adicionar um **visitante na hora** (nome, telefone, quem convidou), que entra no cadastro como Visitante daquela célula já marcado como presente — se o nome já existir, o sistema avisa e oferece usar o cadastro que já está lá, em vez de duplicar. Quem não quer entrar no sistema pode lançar pelo **link da célula** (veja "Frequência por link" abaixo). Três abas: **Lançar**, **Histórico** (duas listas — encontros de célula e cultos — com filtro por período/célula/discipulador/rede, mais o histórico de presença de uma pessoa) e **Painel** (presentes, ausentes, % de presença na célula e no culto, visitantes, FAs, membros, e quais células ainda não lançaram a semana). Nada é sobrescrito: corrigir um encontro atualiza a linha daquele encontro e a mudança fica registrada na auditoria.
- **Oikos IA** — só para Pastor, Pastor de Rede e administradores. Perguntas em português sobre os dados do Oikos ("quais células estão com queda de frequência?", "quantos visitantes tivemos neste mês?"), com sugestões clicáveis na tela. Veja "Oikos IA" abaixo.
- **Trilho do Vencedor** — acompanhamento dos cursos (Ceifeiros, Maturidade, CTL, Seminário Pastoral).
- **Movimentações** — histórico de mudanças de célula/posição/batismo/encontro/situação por pessoa, mais notas manuais, e os relatórios de **Perdidos por Célula** (conta só quem saiu como "Perdido"; inativos e transferidos não entram nessa contagem), **Fora da contagem** (transferidos e perdidos) e **Inativos**. Nas duas últimas listas, clicar numa linha abre a ficha da pessoa — dá pra editar o cadastro dali, inclusive reativar quem voltou.
- **+ Novo Cadastro** — formulário de criação e edição de membros.
- **Administração** — só aparece para quem tem acesso total (Pastor/Pastor de Rede/admin). Cadastra novas células e nova liderança (Pastor, Obreiro, Discipulador, Líder), com opção de já criar o login da pessoa; e define qual discipulador e qual obreiro são responsáveis por cada célula — isso controla o que cada líder enxerga (veja "Acesso por nível" abaixo). Detalhes em "Administração: novas células e liderança".

### Hierarquia: status, função e supervisão

O cadastro separa duas coisas que antes ficavam juntas no campo Posição:

- **Status na igreja** — a jornada da pessoa: **Visitante → Frequentador
  Assíduo (FA) → Membro**. Mudar o status **não apaga nada**: célula,
  presenças, trilho e histórico continuam, e a mudança fica registrada
  em Movimentações e na auditoria.
- **Função ministerial** — Anfitrião, Líder em Treinamento, Anjo da
  Guarda, Líder, Discipulador, Obreiro, Pastor de Rede ou Pastor. É
  **uma por vez**: quando um Líder é levantado Discipulador, a função
  muda (não acumula). Quem não tem função fica só com o status.
- **Supervisor direto** — monta a corrente Pastor → Obreiro / Pastor de
  Rede → Discipulador → Líder → célula. É preenchido automaticamente na
  migração, a partir do discipulador/obreiro já cadastrado em cada
  célula, e pode ser ajustado na ficha.

Regras aplicadas: **Anfitrião é sempre Membro e tem célula**;
Discipulador, Obreiro, Pastor de Rede e Pastor não têm célula.

O campo **Posição**, usado pelas telas, gráficos e regras de acesso,
continua existindo e é preenchido sozinho pelo banco (a função quando
existe, senão o status) — por isso nada do que já funcionava mudou.

### "Já sou líder" (pedido de acesso de liderança, sem login)

Na tela de cadastro público, o link **"Já sou líder"** abre um fluxo
para a liderança se identificar:

- A pessoa informa o **nome** e a **função**.
- Em todo **cadastro novo** de liderança o **e-mail é obrigatório** — é
  com ele que o admin cria o login. Quem apenas toca no próprio nome na
  lista (já cadastrado) não precisa informar.
- **Líder de célula**: informa também **qual célula lidera**. O nome é
  conferido com o cadastro (sem diferenciar maiúsculas nem acentos). Se
  ela já existe, a tela diz que ela já está cadastrada e que deve
  procurar o administrador; se não, o pedido fica registrado e ela
  também é orientada a procurar o administrador.
- **Discipulador, Obreiro/Pastor de Rede e Pastor**: aparece a lista de
  quem já está cadastrado com aquela função, e a pessoa toca no próprio
  nome. Se não estiver na lista, preenche um cadastro curto. Nos dois
  casos a orientação é procurar o administrador para liberar o acesso à
  rede.

Nada disso dá acesso sozinho. Como no Oikos o nível de acesso vem da
função (um Pastor enxerga tudo), a tela pública **só cria um pedido** na
tabela `solicitacoes_lideranca` — quem não tem login não consegue ler
nem alterar esses pedidos (`supabase/add_solicitacoes_lideranca.sql`).

Os pedidos aparecem para Admin/Pastor em **Administração → Pedidos de
acesso**. **Liberar acesso** preenche a "Nova Liderança" logo abaixo
(pessoa já cadastrada ou nova, com a função e a célula informadas); o
admin confere, cria o login e salva — e o pedido fica aprovado sozinho.
**Recusar** encerra o pedido. O link "Já tenho acesso, quero entrar"
continua levando ao login normal.

### Frequência por link (sem login)

Cada célula pode ter um **link próprio** para o líder lançar a presença
sem entrar no sistema — do mesmo jeito que o cadastro público funciona
para visitantes. O líder abre o link no celular, marca quem veio, pode
adicionar um visitante e salva.

Para gerar: **Administração → Células cadastradas → Editar → Gerar link
de frequência**. Dali dá para enviar por WhatsApp ou copiar. O link tem
o formato `…/index.html?frequencia=CODIGO`.

Por que o link tem um código, se o cadastro público é aberto: o cadastro
público só **cria** um visitante, enquanto aqui se **escreve a
frequência de uma célula que existe**. O código limita o link a uma
única célula, e nada além da presença daquela célula pode ser feito por
ele. Se um link vazar ou o líder mudar, clique em **Gerar link novo** —
o antigo deixa de funcionar na hora.

Por dentro (`supabase/add_frequencia_link.sql`): três funções que
conferem o código e rodam com privilégio próprio — abrir (devolve só
nome e status das pessoas daquela célula), salvar (cria/atualiza o
encontro, marcado com `origem = 'link'`) e adicionar visitante. A tabela
`members` continua fechada para quem não tem login.

### Histórico da planilha antiga

Os lançamentos que os líderes faziam no formulário Google (janeiro a
setembro de 2026, 55 encontros de Claudio e Renata, Josivan e Célia e
Otávio e Jô) foram importados para a tabela
`frequencia_planilha` e aparecem na aba **Frequência**: uma tabela
própria no **Histórico** e um resumo por célula no **Painel**.

Ficam **separados** dos lançamentos novos por um motivo: a planilha
registrava só **totais** por encontro (quantos membros, FAs, visitantes
e kids), não quem esteve presente. Juntar as duas coisas exigiria
inventar nomes para completar os totais antigos. Por isso os
percentuais de presença do Painel usam só os lançamentos feitos no
Oikos, que são pessoa a pessoa, e o histórico antigo aparece ao lado,
com os números como foram coletados.

Detalhes que valem saber:

- Ficaram **de fora, a pedido**: tudo de 2025 (52 encontros) e a célula
  **"Junior e Luciana"** (30 encontros), que não existe mais.
- A importação pode ser repetida: o script limpa a tabela antes de
  inserir, então rodar de novo não duplica — e quem já tinha importado
  2025 ou a Junior e Luciana fica com esses registros removidos. Para
  atualizar com o que entrar na planilha depois, é só me pedir para
  gerar o arquivo de novo.

### Auditoria

Mudanças importantes ficam gravadas na tabela `auditoria` por gatilho no
banco (não dá para burlar pelo navegador): quem alterou, quando, qual
registro, valor anterior e novo. Cobre função, status, célula,
supervisor, situação e cônjuge de cada pessoa, a hierarquia das células
e as correções de presença (célula e culto). Só quem tem acesso total
consegue ler. O histórico por pessoa continua aparecendo na ficha, em
Movimentações.

### Situação da pessoa

O campo **Situação** no cadastro define se a pessoa entra nos totais.
Só **Ativo** conta: aparece nas listas, nos KPIs e nos totais por
célula. Todo o resto sai de todas as contagens, mas continua
cadastrado com a célula de origem preservada no histórico:

- **Inativo** — continua sendo da rede, mas não está participando agora.
- **Transferido** (outra célula / outra rede / outra igreja).
- **Perdido** — saiu e não quer mais participar de nenhuma igreja. É o
  único que entra no relatório "Perdidos por Célula".

### Cônjuge

Com estado civil **Casado(a)**, o cadastro pode (opcionalmente) apontar
o cônjuge, escolhido entre os adultos e jovens já cadastrados. O vínculo vale
nos dois sentidos: ao salvar, o cônjuge também passa a apontar de
volta.

Ao salvar, o cônjuge **herda deste cadastro a célula, a posição, a
situação e o nível de acesso** — inclusive o "Admin". Ou seja: se o
André é Admin, a Simone passa a ter exatamente o mesmo acesso e a
mesma posição. As mudanças ficam registradas em Movimentações também
na ficha do cônjuge.

Duas coisas importantes:

- **Quem manda é o cadastro que você salvou.** Se os dois estiverem
  diferentes, o que vale é o de quem você acabou de editar — inclusive
  para tirar acesso. Salvando o cadastro de alguém que não é Admin, o
  cônjuge dele também deixa de ser.
- O "Admin" só é copiado se **quem está salvando tem acesso total**, e
  só se o cônjuge já tiver login. Se ele ganhar o login depois, é só
  salvar o casal de novo pra aplicar.

Trocar o estado civil para algo diferente de Casado(a), ou clicar em
"Remover", desfaz o vínculo dos dois lados.

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
- **Cônjuge** — o casal divide a mesma rede: quem é casado com um
  discipulador ou obreiro vê as mesmas células que ele (ex: Simone
  Delamata vê a rede de discipulado do Andre Delamata), além da própria
  célula. Vale só para casais vinculados na ficha (Estado civil
  "Casado (a)" → Cônjuge) — veja `supabase/add_rede_conjuge.sql`, que
  também traz uma consulta pra achar discipuladores/obreiros ainda sem
  cônjuge vinculado.

Isso é reforçado por Row Level Security no Postgres (não é só escondido
na tela) — veja `supabase/add_rbac.sql`. Cadastro, Frequência (célula e
culto), Trilho e Movimentações seguem a hierarquia.

Como cada login descobre quem é: no primeiro acesso, aparece uma tela
"Qual desses é você?" — o próprio líder busca e seleciona seu nome no
cadastro, uma vez só.

## Administração: novas células e liderança

Na aba **Administração** (só acesso total):

- **Nova Célula** — cadastra uma célula nova (nome + discipulador/obreiro
  responsável, opcional na hora de criar). A partir daí ela já aparece em
  todos os seletores de célula do app, inclusive no cadastro público.
- **Células cadastradas** — lista cada célula com o número de pessoas,
  o discipulador e o obreiro responsáveis. O botão **Editar** abre um
  formulário para mudar o **nome** da célula e quem responde por ela.
  Renomear leva junto todas as pessoas da célula (ativas, inativas e
  transferidas) numa operação só, feita pela function `editar_celula()`
  (`supabase/add_editar_celula.sql`), que só aceita acesso total — os
  lançamentos de frequência acompanham o nome novo.
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

## Oikos IA

Aba visível só para Pastor, Pastor de Rede e administradores. O Pastor
pergunta em português ("quais células caíram de frequência nas últimas
quatro semanas?") e recebe a resposta com os números usados.

**Como a segurança funciona** (importante, e vale conferir):

1. O app manda **só a pergunta** para a Edge Function `oikos-ia`.
2. A function consulta o banco **com o token de quem perguntou**, nunca
   com a chave de administrador. Ou seja, a RLS continua valendo: a IA
   não alcança nada que a pessoa já não pudesse ver na tela.
3. A function calcula um **painel de indicadores** (números agregados e
   listas curtas) e envia **apenas esse painel** ao modelo. O banco não
   é enviado, e o modelo não escreve nem executa consultas.
4. O modelo é instruído a responder **só com esses dados**; sem dado
   suficiente, responde "Não existem informações suficientes no Oikos
   para responder essa pergunta." em vez de inventar.

### Publicar o Oikos IA (uma vez só)

**1. Criar a chave da Anthropic.** Em <https://console.anthropic.com>:
crie a conta, adicione crédito em **Billing** (é pré-pago; sem crédito a
API recusa) e vá em **Settings → API keys → Create Key**. Copie a chave
na hora — ela só aparece uma vez. Atenção: **a assinatura do Claude.ai
não vale aqui**; o uso por API é cobrado à parte, por uso.

**2. Guardar a chave no Supabase** (ela nunca vai para o navegador; não
coloque em `config.js`, que é público). No painel:
**Edge Functions → Secrets → Add new secret**, com o nome exatamente
`ANTHROPIC_API_KEY` e o valor da chave. Pela CLI seria
`supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`.

**3. Publicar a function.** **Edge Functions → Deploy a new function**,
nome exatamente `oikos-ia` (é esse nome que o app chama — nome diferente
faz a tela dizer que não encontrou a function), e cole o conteúdo de
[`supabase/functions/oikos-ia/index.ts`](supabase/functions/oikos-ia/index.ts).
Deixe **Verify JWT ligado** (padrão): é o que garante que só quem está
logado chega até ela. Pela CLI: `supabase functions deploy oikos-ia`.
Se criar o segredo depois de publicar, publique de novo para a function
enxergar a chave.

**4. Testar.** Entre como Pastor/admin, abra **Oikos IA** e clique em
"Frequência das células esta semana". Se algo faltar, a própria tela diz
o quê: chave não configurada, function não encontrada, acesso não
autorizado, ou serviço de IA indisponível (código 502 costuma ser chave
inválida ou conta sem crédito).

**Custo e modelo.** Cada pergunta envia o painel de indicadores (poucos
KB) e recebe uma resposta curta — a ordem de grandeza é de centavos por
pergunta; acompanhe em **Usage** no console da Anthropic e defina um
limite de gasto em Billing. Para usar um modelo mais barato, crie o
segredo `OIKOS_IA_MODEL` (ex: `claude-haiku-4-5-20251001`) — não precisa
mexer no código.

Enquanto isso não for feito, a aba abre normalmente e cada pergunta
responde explicando o que falta configurar — nada quebra no resto do
sistema.

## Configuração inicial (uma vez só)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) (cria as tabelas e as políticas de acesso).
3. Ainda no SQL Editor, rode [`supabase/seed.sql`](supabase/seed.sql) **uma única vez** para importar os membros já cadastrados anteriormente — rodar de novo duplica todo mundo (se isso acontecer, rode [`supabase/dedupe_members.sql`](supabase/dedupe_members.sql) para corrigir). Depois rode [`supabase/migrate_posicoes.sql`](supabase/migrate_posicoes.sql) uma vez para atualizar os cadastros importados para o novo modelo de posições.
   - Se o seu projeto Supabase já existia **antes** do campo "Situação" (transferência/perdido) ser adicionado, rode também [`supabase/add_situacao_saida.sql`](supabase/add_situacao_saida.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
4. Rode [`supabase/add_rbac.sql`](supabase/add_rbac.sql) uma vez (acesso por nível de liderança + cadastro público — veja as seções acima).
   - Se o seu projeto já existia **antes** do número de matrícula (coluna "Nº"), rode também [`supabase/add_numero.sql`](supabase/add_numero.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
   - Se o seu projeto já existia **antes** do bloqueio de cadastro duplicado (mesmo nome + mesma data de nascimento), rode também [`supabase/add_unique_nome_nasc.sql`](supabase/add_unique_nome_nasc.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
   - Se o seu projeto já existia **antes** da situação "Inativo", rode também [`supabase/add_situacao_inativo.sql`](supabase/add_situacao_inativo.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
   - Se o seu projeto já existia **antes** do vínculo de cônjuge, rode também [`supabase/add_conjuge.sql`](supabase/add_conjuge.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
   - Rode [`supabase/add_acesso_conjuge.sql`](supabase/add_acesso_conjuge.sql) uma vez, depois do `add_conjuge.sql` — é a function que copia o "Admin" para o cônjuge (o app sozinho não pode mexer nisso). Sem ela, célula/posição/situação ainda são herdadas, só o Admin que não.
   - Rode [`supabase/add_rede_conjuge.sql`](supabase/add_rede_conjuge.sql) uma vez, depois do `add_conjuge.sql` — faz o cônjuge de um discipulador/obreiro enxergar a mesma rede de discipulado.
   - Rode [`supabase/add_editar_celula.sql`](supabase/add_editar_celula.sql) uma vez, depois do `add_admin_area.sql` — permite editar (inclusive renomear) células existentes em Administração.
   - Rode [`supabase/add_hierarquia_status.sql`](supabase/add_hierarquia_status.sql) uma vez, depois do `add_admin_area.sql` — separa status (Visitante/FA/Membro) de função ministerial, cria o supervisor, o catálogo de funções e a tabela de auditoria. Não apaga nem sobrescreve nada: as colunas novas são preenchidas a partir da posição atual de cada pessoa.
   - Rode [`supabase/add_frequencia.sql`](supabase/add_frequencia.sql) uma vez, **depois** do `add_hierarquia_status.sql` — cria o módulo de Frequência (encontros e presenças por célula), fecha `presencas_culto` por escopo de célula e atualiza `editar_celula()` para levar os encontros junto ao renomear.
   - Rode [`supabase/fix_auditoria_celula.sql`](supabase/fix_auditoria_celula.sql) se você já tinha rodado o `add_hierarquia_status.sql` antes desta correção — sem ele, alterar uma célula (trocar discipulador/obreiro ou gerar o link de frequência) falha com `record "new" has no field "id"`. Em instalação nova não precisa: o `add_hierarquia_status.sql` já vem corrigido.
   - Rode [`supabase/add_solicitacoes_lideranca.sql`](supabase/add_solicitacoes_lideranca.sql) uma vez — cria a tabela de pedidos do "Já sou líder" (veja a seção acima).
   - Rode [`supabase/add_frequencia_link.sql`](supabase/add_frequencia_link.sql) uma vez, depois do `add_frequencia.sql` — permite o lançamento de frequência por link, sem login (veja "Frequência por link" acima).
   - Rode [`supabase/add_frequencia_historico.sql`](supabase/add_frequencia_historico.sql) e depois [`supabase/importar_historico_planilha.sql`](supabase/importar_historico_planilha.sql) — criam e preenchem a tabela com o histórico da planilha Google (veja "Histórico da planilha antiga" acima).
   - Rode [`supabase/add_frequencia_separada.sql`](supabase/add_frequencia_separada.sql) uma vez, depois do `add_frequencia.sql` — separa o lançamento do culto do lançamento da célula (cada um com a sua data), já que as duas coisas acontecem em dias diferentes. Nenhuma presença já lançada é apagada.
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
