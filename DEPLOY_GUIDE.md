# 🚀 HOT-M — GUIA EXECUTIVO DE DEPLOY EM PRODUÇÃO

Este documento contém o roteiro técnico definitivo para colocar a plataforma **HOT-M** em operação na **Vercel** e **Supabase**.

---

## 📋 Sumário dos Passos
1. [Configuração do Banco de Dados no Supabase](#1-configuração-do-banco-de-dados-no-supabase)
2. [Configuração dos Buckets de Storage](#2-configuração-dos-buckets-de-storage)
3. [Configuração das Variáveis de Ambiente na Vercel](#3-configuração-das-variáveis-de-ambiente-na-vercel)
4. [Publicação e Deploy](#4-publicação-e-deploy)
5. [Configuração dos Webhooks e Crons](#5-configuração-dos-webhooks-e-crons)

---

## 1. Configuração do Banco de Dados no Supabase

1. Crie ou acerte o seu projeto de produção no [painel do Supabase](https://supabase.com/dashboard).
2. Vá até a seção **SQL Editor** (`/project/<seu-id>/sql/new`).
3. Abra e copie todo o conteúdo do arquivo consolidado:
   - Caminho local: `scripts/production_schema_consolidated.sql` (51 KB)
4. Cole no editor SQL do Supabase e clique em **Run**.
5. Todas as tabelas, tipos ENUM, triggers de auth, ledger imutável e políticas de **Row Level Security (RLS)** serão criadas em bloco.

---

## 2. Configuração dos Buckets de Storage

No painel do Supabase, aceda a **Storage** e crie os 3 buckets com as seguintes permissões:

| Nome do Bucket | Acesso Público | Finalidade |
| :--- | :--- | :--- |
| `avatars` | **Sim** (Público) | Fotos de perfil de produtores e alunos |
| `products` | **Não** (Privado) | E-books, PDFs e arquivos para download (acesso por link assinado) |
| `courses` | **Não** (Privado) | Vídeos, módulos e materiais de cursos LMS |

---

## 3. Configuração das Variáveis de Ambiente na Vercel

No painel do projeto na **Vercel** (`Settings` -> `Environment Variables`), configure as seguintes chaves para os ambientes **Production** e **Preview**:

### 🌐 Variáveis Públicas (Client-side)
```bash
NEXT_PUBLIC_APP_URL="https://seu-dominio.com"
NEXT_PUBLIC_APP_ENV="production"
NEXT_PUBLIC_SUPABASE_URL="https://<seu-projeto>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<sua-anon-key-do-supabase>"
```

### 🔒 Variáveis Privadas (Server-side & Fintech)
```bash
# Supabase Privado
SUPABASE_URL="https://<seu-projeto>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<sua-service-role-key-secreta>"

# ProxyPay Angola (EMIS / Multicaixa)
PROXYPAY_API_URL="https://api.proxypay.co.ao"
PROXYPAY_TOKEN="<seu-token-da-api-proxypay>"
PROXYPAY_ENTITY="<sua-entidade-multicaixa-5-digitos>"
PROXYPAY_WEBHOOK_SECRET="<seu-secret-de-webhook-proxypay>"

# E-mail Transacional (Resend)
RESEND_API_KEY="re_<sua-chave-resend>"
EMAIL_FROM_ADDRESS="HOT-M <noreply@seu-dominio.com>"

# Proteção de Cron Jobs
CRON_SECRET="<uma-string-secreta-aleatoria-minimo-16-chars>"
```

---

## 4. Publicação e Deploy

Com o repositório sincronizado no GitHub ou GitLab:
1. Conecte o repositório na **Vercel**.
2. Framework Preset: **Next.js**.
3. Build Command: `npm run build` (ou `next build`).
4. Output Directory: `.next`.
5. Clique em **Deploy**.

> 💡 Antes de realizar o deploy, você pode rodar a qualquer momento localmente o comando:
> ```bash
> npm run preflight:prod
> ```
> Ele informará exatamente quais variáveis estão em conformidade e se há alguma pendência crítica.

---

## 5. Configuração dos Webhooks e Crons

1. **Webhook da ProxyPay**:
   - URL do Webhook no painel da ProxyPay:
     `https://seu-dominio.com/api/v1/webhooks/proxypay`
   - O webhook processará pagamentos da EMIS com idempotência garantida e desbloqueio imediato no LMS e nas comissões.

2. **Crons Automáticos (Outbox & Expirações)**:
   - O arquivo `vercel.json` já está configurado na raiz para executar a cada 2 minutos:
     - Rota: `/api/v1/cron/outbox-worker`
     - Processa disparos de notificações em segundo plano e expiração de referências Multicaixa vencidas.

---

**Status Técnico do HOT-M:** ✅ Pronto para Go-to-Market.
