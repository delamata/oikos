# Dashboard de Membros — Videira SCS / Rede Oikos

App para cadastro de membros, presença no culto e movimentações da rede,
usado pelos líderes de célula. Front-end estático (HTML/JS puro, sem
build step) com [Supabase](https://supabase.com) como backend (banco de
dados + autenticação).

## Abas

- **Cadastro de Membros** — lista, filtros, KPIs e gráficos dos membros da rede. Posições: Visitante → Frequentador Assíduo (após 4 células seguidas) → Membro (após Encontro com Deus + batismo) → Líder em Treinamento, Anfitrião, Anjo da Guarda, Líder, Discipulador, Obreiro, Pastor de Rede, Pastor. A promoção é manual (o líder muda a posição no cadastro; fica registrado em Movimentações).
- **Presença por Célula** — lida de uma planilha Google (formulário que os líderes já preenchem), somente leitura.
- **Presença no Culto** — check-in pessoa por pessoa, por culto/data.
- **Trilho do Vencedor** — acompanhamento dos cursos (Ceifeiros, Maturidade, CTL, Seminário Pastoral).
- **Movimentações** — histórico de mudanças de célula/posição/batismo/encontro/situação por pessoa, mais notas manuais, e o relatório de **Perdidos por Célula** (conta só quem saiu como "Perdido"; transferidos não entram nessa contagem).
- **+ Novo Cadastro** — formulário de criação e edição de membros.

## Configuração inicial (uma vez só)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) (cria as tabelas e as políticas de acesso).
3. Ainda no SQL Editor, rode [`supabase/seed.sql`](supabase/seed.sql) **uma única vez** para importar os membros já cadastrados anteriormente — rodar de novo duplica todo mundo (se isso acontecer, rode [`supabase/dedupe_members.sql`](supabase/dedupe_members.sql) para corrigir). Depois rode [`supabase/migrate_posicoes.sql`](supabase/migrate_posicoes.sql) uma vez para atualizar os cadastros importados para o novo modelo de posições.
   - Se o seu projeto Supabase já existia **antes** do campo "Situação" (transferência/perdido) ser adicionado, rode também [`supabase/add_situacao_saida.sql`](supabase/add_situacao_saida.sql) uma vez — projetos novos já recebem isso direto do `schema.sql`.
4. Em **Authentication → Users → Invite user**, crie um login (e-mail/senha) para cada líder que vai usar o app. Não há tela pública de cadastro — os acessos são só os que você criar aqui.
5. Em **Settings → API**, copie a **Project URL** e a **anon public key** e cole em [`config.js`](config.js):
   ```js
   window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
   window.SUPABASE_ANON_KEY = 'sua-anon-key';
   ```
   Esses valores são públicos por design do Supabase — a segurança dos dados vem das políticas de RLS em `schema.sql`, não do sigilo dessas strings.

## Rodando localmente

```bash
python -m http.server 8080
```
depois abra `http://localhost:8080`.

## Publicando (GitHub Pages)

O app é 100% estático, então pode ser hospedado direto pelo GitHub Pages:
**Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
Isso exige que o repositório seja público (dado pessoal não fica mais no
Git — só no Supabase, atrás de login).
