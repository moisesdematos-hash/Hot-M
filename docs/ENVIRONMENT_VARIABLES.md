# GUIA DE VARIÁVEIS DE AMBIENTE — HOT-M

## 1. Classificação de Segurança (Seção 13)

### 1.1 Variáveis Públicas (Client-Safe)
Estas variáveis são injetadas no bundle do navegador pelo Next.js e **não devem conter nenhum segredo**.

| Variável | Descrição | Exemplo |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | URL base da aplicação | `https://hot-m.com` ou `http://localhost:3000` |
| `NEXT_PUBLIC_APP_ENV` | Identificador do ambiente | `development`, `staging`, `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint público da API Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública e anônima do Supabase protegida por RLS | `eyJhbGci...` |

### 1.2 Variáveis Exclusivamente de Servidor (Server-Only Secrets)
**ALERTA DE SEGURANÇA (INV-014):** Nunca use o prefixo `NEXT_PUBLIC_` para as variáveis abaixo.

| Variável | Finalidade |
|---|---|
| `SUPABASE_URL` | URL direta do Supabase para chamadas do backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave administrativa com bypass de RLS para tarefas de sistema (ledger, webhook) |
| `SUPABASE_JWT_SECRET` | Chave para assinatura e validação de tokens JWT |
| `DATABASE_URL` | String de conexão PostgreSQL direta para migrations |
| `PROXYPAY_API_URL` | Endpoint base da API da ProxyPay (`https://api.sandbox.proxypay.co.ao`) |
| `PROXYPAY_TOKEN` | Token de autorização Bearer da ProxyPay |
| `PROXYPAY_ENTITY` | Entidade Multicaixa cadastrada na ProxyPay |
| `PROXYPAY_WEBHOOK_SECRET` | Segredo para cálculo e validação do HMAC SHA256 do webhook |
| `RESEND_API_KEY` | Chave de envio de emails transacionais |
| `GROQ_API_KEY` | Chave de inferência da API Groq (auxiliar de criadores) |
| `GROQ_MODEL` | Modelo padrão de IA (ex: `llama-3.3-70b-versatile`) |
| `ENCRYPTION_KEY_32BYTES` | Chave simétrica de 256 bits para criptografia de dados em repouso |

## 2. Validação Automática
Toda inicialização do servidor valida as variáveis via schema Zod definido em `src/core/config/env.ts`. Se qualquer variável obrigatória estiver faltando ou inválida, o processo falha imediatamente (*fail-fast*).
