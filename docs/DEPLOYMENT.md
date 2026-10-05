# GUIA DE DEPLOYMENT E AMBIENTES — HOT-M

## 1. Ambientes Obrigatórios (Seção 14)
1. **Local (Development):**
   - Execução local com Next.js dev server (`npm run dev`).
   - Conexão com instância Supabase Local / Projeto de Dev.
   - Sandbox da ProxyPay (`api.sandbox.proxypay.co.ao`).

2. **Staging (Preview Deployments via Vercel):**
   - Branch `develop` no GitHub dispara deploy automático na Vercel para ambiente de Staging.
   - Banco de dados Supabase Staging estritamente isolado da produção.
   - Simulação completa de webhooks e testes E2E antes de qualquer merge em `main`.

3. **Production (Vercel + Supabase Prod):**
   - Branch `main` com regras de proteção de branch (requer CI verde e aprovação).
   - Credenciais de produção ativadas apenas nas variáveis de ambiente da Vercel.
   - Monitoramento de erros em tempo real (Sentry).
   - É proibido testar alterações financeiras diretamente em produção.

## 2. Pipeline de CI/CD
Toda alteração de código deve cumprir a esteira do GitHub Actions:
`INSTALL` -> `LINT` -> `TYPECHECK` -> `UNIT` -> `INTEGRATION` -> `BUILD`.
Se qualquer etapa falhar, o deploy é bloqueado.
