# PLANO DE ROLLBACK E RESPOSTA A INCIDENTES — HOT-M

**Destinatário:** Equipa Técnica / SRE / Suporte Operacional  
**Plataforma:** HOT-M  
**Versão:** 1.0  
**Data:** 2026-10-29

---

## 1. Critérios de Acionamento de Rollback

O rollback imediato para a versão anterior ou ativação do modo de manutenção deve ser acionado se qualquer uma das seguintes condições for atendida durante ou após o deployment:

1. **Falha Crítica de Pagamentos:** Mais de 2 falhas consecutivas de comunicação com o ProxyPay não relacionadas a saldo insuficiente do comprador.
2. **Inconsistência Financeira:** Violação do invariante contábil de partidas dobradas ($\Sigma \text{Débitos} \neq \Sigma \text{Créditos}$).
3. **Falha de Liberação:** Pedidos pagos onde o comprador não recebe acesso após 60 segundos do processamento do webhook.
4. **Erro 500 no Checkout:** Taxa de erro em `/checkout/[quoteId]` superior a 1% das sessões.
5. **Vazamento de Dados / IDOR:** Qualquer relato de acesso indevido a pedidos ou downloads entre compradores diferentes.

---

## 2. Procedimento de Rollback Imediato (Frontend / SSR)

### Opção A: Plataforma Vercel / Cloudflare
1. Acesse o painel do projeto em **Deployments**.
2. Localize o último deployment estável anterior.
3. Clique em **Instant Rollback**. O tráfego será redirecionado em menos de 10 segundos para a versão anterior.

### Opção B: Servidor Node / Git / Docker
1. Retorne a tag ou commit estável anterior:
   ```bash
   git checkout [COMMIT_ESTAVEL_ANTERIOR]
   npm ci
   npm run build
   pm2 restart hot-m-server
   ```
2. Ou via Docker:
   ```bash
   docker stop hot-m-current
   docker run -d --name hot-m-rollback -p 3000:3000 --env-file .env.production hot-m-previous:stable
   ```

---

## 3. Rollback de Migrações de Banco de Dados

Caso a migração `20260310000000_affiliate_and_coproduction_rls.sql` precise ser revertida por incompatibilidade:

```sql
-- SCRIPT DE REVERSÃO EM CASO DE EMERGÊNCIA
-- Apenas executar em caso de falha comprovada de acesso autorizados

DROP INDEX IF EXISTS public.idx_revenue_shares_product;
DROP INDEX IF EXISTS public.idx_affiliate_commissions_affiliate_status;
DROP INDEX IF EXISTS public.idx_affiliate_attributions_affiliate;
DROP INDEX IF EXISTS public.idx_affiliate_links_affiliate;

-- Reversão de políticas específicas de afiliados se causarem bloqueio indevido:
DROP POLICY IF EXISTS "affiliate_links_select_policy" ON public.affiliate_links;
DROP POLICY IF EXISTS "affiliate_attributions_select_policy" ON public.affiliate_attributions;
DROP POLICY IF EXISTS "affiliate_commissions_select_policy" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "revenue_shares_select_policy" ON public.revenue_shares;
```

---

## 4. Preservação de Dados Transacionais Durante Incidentes

**REGRA DE OURO:** Sob nenhuma circunstância apague a tabela `orders`, `payment_attempts`, `ledger_entries` ou `entitlements` durante um incidente.
- Todas as transações no HOT-M são imutáveis e auditáveis via log.
- Se um pagamento for confirmado pelo banco durante uma indisponibilidade da aplicação, o evento de webhook da ProxyPay pode ser reprocessado via endpoint `/api/v1/cron/outbox-worker` ou reenvio manual a partir do painel da ProxyPay. O sistema foi auditado e comprovado como **100% idempotente** — reprocessamentos nunca geram duplicidade contábil.
