# Chicão Car — sistema de gestão para oficina mecânica

Sistema web para a operação diária de uma oficina: o cliente chega, o veículo é
localizado pela placa, a OS é aberta, o orçamento vai pelo WhatsApp, o cliente
aprova, o serviço é executado, as peças saem do estoque, o pagamento entra no
caixa, o veículo é entregue e tudo fica no histórico — com o resultado aparecendo
no painel.

Feito para ser usado **no balcão e no celular**: layout responsivo, botões
grandes, tabelas que viram cards no mobile e busca global por nome, telefone,
CPF/CNPJ, placa ou número da OS.

## Módulos

| Área | O que faz |
| --- | --- |
| **Painel** | Faturamento do dia e do mês, despesas, resultado, contas a pagar/receber, OS abertas, veículos no pátio, alertas e gráficos dos últimos 12 meses. |
| **Ordens de serviço** | Fluxo completo: rascunho → orçamento → aprovação → execução → conclusão → pagamento → entrega, com timeline visual, itens de serviço e peça (catálogo ou avulsos) e desconto. |
| **Orçamentos e documentos** | Orçamento, OS e recibo em layout A4 próprio: visualizar, imprimir, gerar PDF, enviar por e-mail e compartilhar no WhatsApp com mensagem pronta. |
| **Clientes e veículos** | Cadastro com máscaras brasileiras, histórico do cliente (gasto, visitas, pendências) e prontuário do veículo (serviços, peças, quilometragem e próximas manutenções). |
| **Serviços, produtos e fornecedores** | Catálogo com preço e tempo estimado, estoque com mínimo e movimentações (entrada, saída, ajuste, devolução). |
| **Financeiro** | Receitas, despesas, contas a receber e a pagar com baixa parcial, além de fluxo de caixa por dia, semana ou mês com saldo acumulado. |
| **Relatórios** | 20 relatórios financeiros, comerciais, de oficina e de fornecedores, com filtros, impressão, PDF e compartilhamento. |
| **Usuários e configurações** | Perfis de acesso (admin, gerente, mecânico, financeiro), dados da oficina, textos padrão dos documentos e registro de auditoria. |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Radix UI · Lucide · React Hook Form + Zod · Recharts · date-fns · jsPDF ·
Supabase (Postgres + Auth + RLS).

## Como os dados são acessados

O app conversa com um **backend intercambiável** (`src/lib/data/`):

- **`supabase`** — usado quando `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão definidas. As permissões reais são as
  políticas de RLS do Postgres; a chave `service_role` nunca é usada no frontend.
- **`local`** — usado quando não há credenciais. Os dados ficam no
  `localStorage` do navegador, já com um conjunto de demonstração, para que o
  sistema inteiro possa ser avaliado sem configurar nada. Nunca se mistura com
  a base de produção.

O conjunto de dados da oficina é carregado uma vez e mantido em memória
(volume compatível com uma oficina), o que deixa a busca do balcão, o painel e
os relatórios instantâneos. As telas nunca falam com o backend diretamente:
usam o `DataProvider`.

## Instalação

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra <http://localhost:3000>. Sem credenciais do Supabase o sistema entra em
modo demonstração: escolha um dos perfis na tela de login para explorar com as
permissões correspondentes.

## Configuração do Supabase

1. Crie um projeto em <https://supabase.com/dashboard>.
2. No **SQL Editor**, execute na ordem:
   - `supabase/migrations/0001_schema.sql` — tabelas, tipos e índices;
   - `supabase/migrations/0002_rls.sql` — Row Level Security e funções de papel.
3. (Opcional, só em desenvolvimento) execute `supabase/seed.sql` para popular a
   base com dados de exemplo. **Não rode em produção — ele limpa as tabelas.**
4. Em **Settings → API**, copie a URL e a chave `anon` para o `.env.local`.
5. Em **Authentication → Users**, convide os e-mails da equipe. Cada e-mail
   precisa ter uma linha correspondente em `public.profiles` (cadastrada na tela
   **Usuários**); é ela que define o papel da pessoa.

### Variáveis de ambiente

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | para produção | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | para produção | Chave pública; a segurança vem do RLS |
| `RESEND_API_KEY` | não | Envio de e-mail pelo servidor; sem ela o sistema abre o app de e-mail do usuário |
| `EMAIL_FROM` | não | Remetente usado no envio |

Nunca coloque a chave `service_role` em variáveis `NEXT_PUBLIC_*`.

## Perfis de acesso

| Perfil | Acesso |
| --- | --- |
| **Admin** | Tudo, inclusive usuários e exclusões. |
| **Gerente** | Operação da oficina, cadastros, financeiro e relatórios. |
| **Mecânico** | Ordens de serviço e consulta de clientes, veículos e catálogo. |
| **Financeiro** | Receitas, despesas, baixas, fornecedores e relatórios. |

As regras ficam em `src/lib/permissions/` (interface) e nas políticas de RLS
(banco). Novas permissões são acrescentadas em um único lugar e usadas via
`can(role, "recurso:ação")`.

## Integrações

- **WhatsApp** — primeira versão por link `wa.me` com mensagem pré-preenchida
  (orçamento, aviso de serviço pronto, cobrança). A camada
  `src/services/whatsapp/` já está preparada para plugar a WhatsApp Business API
  no lugar, sem mexer nas telas.
- **E-mail** — abstração em `src/services/email/` com a rota `/api/email`
  (Resend). Sem credenciais, cai no fallback `mailto:`.
- **PDF** — geração em `src/services/pdf/` (jsPDF + autotable) para orçamento,
  OS, recibo e relatórios; as telas de `/imprimir/*` oferecem o mesmo documento
  em A4 para impressão direta.

## Comandos

```bash
npm run dev     # desenvolvimento
npm run lint    # ESLint
npm run build   # build de produção
npm start       # servir o build
```

## Deploy

O projeto é uma aplicação Next.js padrão. Na Vercel: importe o repositório,
defina o diretório raiz como `chicao-car`, configure as variáveis de ambiente e
faça o deploy. Qualquer plataforma com suporte a Node 20+ também funciona
(`npm run build && npm start`).

## Estrutura

```text
src/
  app/               rotas (App Router) — painel, cadastros, financeiro, relatórios, impressão
  components/        UI compartilhada: ui/, layout/, forms/, tables/, dashboard/, print/
  features/          regras por domínio: work-orders/, customers/, financial/, reports/…
  lib/
    data/            backends (supabase | local), snapshot e DataProvider
    domain/          regras de negócio puras: OS, financeiro, alertas, busca, manutenção
    permissions/     matriz de permissões por papel
    validations/     esquemas Zod
    utils/           formatação e máscaras brasileiras
  services/          email/, whatsapp/, pdf/
  types/             modelo de domínio (espelha as colunas do Postgres)
supabase/
  migrations/        0001_schema.sql, 0002_rls.sql
  seed.sql           dados de demonstração (somente desenvolvimento)
```
