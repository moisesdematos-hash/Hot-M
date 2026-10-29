# GUIA OPERACIONAL DE DEPLOYMENT (DEPLOYMENT RUNBOOK) — HOT-M

**Destinatário:** Engenheiro de Release / SRE / Administrador Técnico  
**Plataforma:** HOT-M (Infraestrutura de Infoprodutos em Angola)  
**Versão:** Release Candidate 1.0 (Branch `audit-saas-master-360`)  
**Data:** 2026-10-29

---

## 1. Pré-Requisitos de Infraestrutura

Antes de iniciar o deployment em produção, verifique a disponibilidade e credenciais dos seguintes serviços:

1. **Conta Supabase de Produção (Região África do Sul ou Europa Ocidental):**
   - URL do projeto e Project ID
   - Chave `anon` (Pública)
   - Chave `service_role` (Privada do Servidor)
   - Database Connection String (Pooler porta 6543 ou Direct porta 5432)
2. **Conta ProxyPay de Produção (Rede EMIS / Multicaixa Angola):**
   - URL da API: `https://api.proxypay.co.ao`
   - Token de Produção
   - Entidade Multicaixa Oficial (atribuída pelo banco/EMIS)
   - Webhook Secret configurado no painel da ProxyPay apontando para: `https://[SEU_DOMINIO]/api/v1/webhooks/proxypay`
3. **Conta Resend de Produção:**
   - Chave `RESEND_API_KEY`
   - Domínio verificado com registros DNS SPF, DKIM e DMARC (`hot-m.com` ou similar)
4. **Hospedagem Frontend/SSR (Vercel, Cloudflare, ou Container Docker Node.js 20+):**
   - Domínio configurado com certificado SSL/TLS ativo.

---

## 2. Checklist de Variáveis de Ambiente de Produção

No painel de deploy (ex: Vercel Project Settings > Environment Variables), cadastre:

```bash
# CLIENT-SAFE VARIABLES (Expostas no navegador)
NEXT_PUBLIC_APP_URL="https://hot-m.com"
NEXT_PUBLIC_APP_ENV="production"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."

# SERVER-ONLY VARIABLES (Sigilo absoluto — nunca prefixar com NEXT_PUBLIC_)
SUPABASE_URL="https://[PROJECT-ID].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
SUPABASE_JWT_SECRET="[SEU-JWT-SECRET-DO-PAINEL-SUPABASE]"

# DATABASE POOLING
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# PROXYPAY PRODUÇÃO (ANGOLA MULTICAIXA)
PROXYPAY_API_URL="https://api.proxypay.co.ao"
PROXYPAY_TOKEN="[TOKEN-PRODUCAO-PROXYPAY]"
PROXYPAY_ENTITY="[ENTIDADE-OFICIAL-5-DIGITOS]"
PROXYPAY_WEBHOOK_SECRET="[HMAC-SECRET-GERADO-NO-PORTAL-PROXYPAY]"

# RESEND TRANSACIONAL
RESEND_API_KEY="re_prod_..."
EMAIL_FROM_ADDRESS="HOT-M <no-reply@hot-m.com>"
EMAIL_SUPPORT_ADDRESS="support@hot-m.com"

# CHAVE DE ENCRIPTAÇÃO AES-256 (32 BYTES HEX)
ENCRYPTION_KEY_32BYTES="[64-CARACTERES-HEXADECIMAIS-ALEATORIOS]"
```

---

## 3. Passo a Passo de Execução do Deployment

### Etapa 1: Aplicação do Banco de Dados no Supabase de Produção
1. Acesse o **SQL Editor** do projeto Supabase de produção.
2. Execute integralmente o arquivo `supabase/consolidated_schema.sql` (1182 linhas).
3. Execute o script de migração `supabase/migrations/20260310000000_affiliate_and_coproduction_rls.sql` para garantir que as 42 tabelas possuam RLS e índices analíticos ativados.
4. No menu **Storage**, crie os buckets necessários:
   - `avatars` (Público)
   - `product-covers` (Público)
   - `digital-assets` (Privado — acesso exclusivo via signed URLs temporárias)
   - `course-materials` (Privado)

### Etapa 2: Build e Verificação Local Pré-Deploy
Execute na máquina de release:
```powershell
git checkout audit-saas-master-360
npm ci
npm run lint           # Deve retornar: 0 erros, 0 avisos
npx tsc --noEmit       # Deve retornar: 0 erros
npm run test:all       # Deve retornar: 190/190 testes PASS
npm run build          # Deve gerar 56/56 rotas sem erros
```

### Etapa 3: Deploy para a Infraestrutura de Produção
1. Faça o push do branch validado:
   ```bash
   git push origin audit-saas-master-360:main
   ```
2. Caso use Vercel/Cloudflare, aguarde o build automático e confirme a geração de 56 páginas.
3. Se for servidor Docker dedicado:
   ```bash
   docker build -t hot-m-production:1.0 .
   docker run -p 3000:3000 --env-file .env.production hot-m-production:1.0
   ```

---

## 4. Testes de Smoke Pós-Deploy (Não Destrutivos)

Imediatamente após a conclusão do deploy, realize as seguintes verificações:

1. **Acesso Público:** Carregar `https://hot-m.com/` e verificar carregamento limpo da Landing Page.
2. **Marketplace:** Carregar `https://hot-m.com/marketplace` e confirmar listagem de produtos com capas lazy-loaded e badges Multicaixa.
3. **Autenticação:** Testar login e logout com uma conta de teste.
4. **Cotação de Preço:** Acessar o checkout de um produto ativo e verificar se os valores em Kwanzas são gerados sem erro.
5. **Painel do Produtor:** Acessar `/dashboard/products` e confirmar integridade dos dados.
6. **Webhook ProxyPay:** Simular requisição de teste (sandbox) no portal ProxyPay e verificar código HTTP 200 no endpoint `/api/v1/webhooks/proxypay`.
