# RELATÓRIO DE AUDITORIA ADVERSARIAL DEFENSIVA — MÓDULO C (F20–F25)

**Projeto:** HOT-M — Infraestrutura de Comércio Digital de Infoprodutos (Angola)  
**Data da Auditoria:** 2026-10-29  
**Branch:** `audit-saas-master-360`  
**Commit de Referência:** `5f6bfdf`  
**Status do Gate C (F25):** **APROVADO (PASS)**  
**Bloqueadores P0 / P1 Ativos:** **0**

---

## 1. Metodologia

A auditoria adversarial foi executada com dois níveis de análise:

1. **Análise estática** — leitura completa de todos os módulos de segurança (`rbac.ts`, `entitlement-service.ts`, `order-service.ts`, `webhook-engine.ts`, `pricing-engine.ts`, `payment-service.ts`, `proxypay.ts`) para mapear vectores de ataque reais.
2. **Teste dinâmico com contas sintéticas** — suíte de 31 testes adversariais executada com identidades fictícias (Alice / Bob), nunca com dados reais de utilizadores.

---

## 2. Resultados por Fase

### F20 — Superfície de Ataque: Mapeamento de Permissões RBAC

| Cenário de Ataque | Vetor | Resultado |
| :--- | :--- | :---: |
| BUYER tenta usar permissões de produto | `product:publish`, `product:create`, `kyc:approve` | 🛡️ BLOQUEADO |
| CREATOR tenta aceder ao ledger da plataforma | `finance:view_platform_ledger`, `finance:approve_withdrawal` | 🛡️ BLOQUEADO |
| AFFILIATE tenta criar/publicar produtos | `product:create`, `product:publish` | 🛡️ BLOQUEADO |
| SUPPORT tenta fazer saques | `finance:request_withdrawal`, `finance:view_own_balance` | 🛡️ BLOQUEADO |
| FINANCE tenta publicar produtos | `product:publish`, `admin:manage_roles` | 🛡️ BLOQUEADO |
| ADMIN usa `assertPermission` para permissão ausente | Retorna boolean sem crash | ✅ PASS |

**Resumo F20:** 6/6 cenários PASS. A matriz de permissões RBAC está correcta e alinhada com o princípio de menor privilégio.

---

### F21 — IDOR: Isolamento de Conta entre Alice e Bob

| ID | Cenário | Vector de Ataque | Defesa Verificada | Resultado |
| :--- | :--- | :--- | :--- | :---: |
| IDOR-001 | Alice acede entitlement de Bob | `getSignedDownloadUrl(aliceId, bobEntitlementId)` | `buyer_id !== requestorId` → lança `FORBIDDEN` | 🛡️ BLOQUEADO |
| IDOR-002 | Bob acede entitlement de Alice | `getSignedDownloadUrl(bobId, aliceEntitlementId)` | `buyer_id !== requestorId` → lança `FORBIDDEN` | 🛡️ BLOQUEADO |
| IDOR-003 | Alice vê pedido de Bob (BUYER) | `getOrderById(bobOrderId, actorId=aliceId, roles=['BUYER'])` | RBAC `order:read_any` ausente → lança `FORBIDDEN` | 🛡️ BLOQUEADO |
| IDOR-004 | ADMIN vê qualquer pedido | `getOrderById(bobOrderId, actorId=admin, roles=['ADMIN'])` | RBAC `order:read_any` presente → sucesso | ✅ PERMITIDO |

**Resumo F21:** 4/4 cenários PASS. Zero IDOR confirmado em pedidos e downloads.

---

### F22 — Abusos de Input: Preços, Cupons e Valores Extremos

| ID | Cenário | Resultado |
| :--- | :--- | :---: |
| COUPON-001 | Cupom com `times_used >= max_uses` | 🛡️ BLOQUEADO (`limite máximo de utilização`) |
| COUPON-002 | Cupom com `is_active: false` (retorna null da DB) | 🛡️ BLOQUEADO (`não encontrado ou inativo`) |
| **BUG-ADV-001** | **Cupom com `discount_type` desconhecido aceite silenciosamente** | **🔴 BUG REAL ENCONTRADO E CORRIGIDO** |
| ENT-001 | Download de entitlement revogado (`is_active: false`) | 🛡️ BLOQUEADO (`ENTITLEMENT_REVOKED`) |
| ENT-002 | Download de produto do tipo COURSE via endpoint de ficheiro | 🛡️ BLOQUEADO (`INVALID_PRODUCT_TYPE`) |
| WEBHOOK-SIG-001 | Assinatura inválida no webhook ProxyPay | 🛡️ BLOQUEADO (`UNAUTHORIZED_SIGNATURE`) |
| WEBHOOK-SIG-002 | Header de assinatura ausente | 🛡️ BLOQUEADO (`false` em `verifyWebhook`) |

#### BUG-ADV-001 — Tipo de Desconto Inválido Aceite Silenciosamente (P2 — CORRIGIDO)

**Sintoma:** `PricingEngine.calculateQuote()` aceitava cupons com `discount_type` diferente de `'PERCENTAGE'` ou `'FIXED_AMOUNT'` sem lançar erro — aplicava desconto zero e criava a quote com o cupom "aplicado" mas sem benefício real.

**Risco:** Não era um risco financeiro directo (nenhum desconto era concedido), mas criava inconsistência no estado: a quote ficava registada com um cupom "aplicado" de tipo inválido, o que poderia confundir relatórios e permitir bypass de validação em casos extremos.

**Correcção:**
```typescript
// src/modules/pricing/pricing-engine.ts — linha 71
} else {
  // BUG-ADV-001 (P2): Unknown discount_type must be rejected, not silently ignored.
  throw new Error(`Cupom '${couponCode}' tem tipo de desconto inválido: ${coupon.discount_type}`);
}
```

**Teste de regressão:** `ATTACK SCENARIO: Cupom com tipo de desconto desconhecido deve ser rejeitado (BUG-ADV-001 fix)` — ✅ PASS.

---

### F23 — Webhooks: Replay, Montante Errado e Eventos Fora de Ordem

| ID | Cenário | Defesa Verificada | Resultado |
| :--- | :--- | :--- | :---: |
| REPLAY-001 | Evento duplicado reentregue pelo ProxyPay | Tabela `payment_provider_events` com chave de idempotência — retorna `IDEMPOTENCY_OK` | 🛡️ BLOQUEADO |
| AMOUNT-001 | Pagamento com montante menor que o pedido | `paidMinor !== orderTotalMinor` → lança `Divergência monetária` | 🛡️ BLOQUEADO |
| AMOUNT-002 | Pagamento em moeda errada (USD em vez de AOA) | `paidCurrency !== order.currency` → lança `Divergência de moeda` | 🛡️ BLOQUEADO |
| SIGNATURE-001 | Assinatura forjada no header do webhook | `verifyWebhook()` HMAC-SHA256 retorna `false` → `UNAUTHORIZED_SIGNATURE` | 🛡️ BLOQUEADO |

---

### F24 — Falhas Controladas: Comportamento Defensivo em Indisponibilidade

| ID | Falha Simulada | Comportamento Esperado | Resultado |
| :--- | :--- | :--- | :---: |
| DB-001 | Supabase retorna erro de conexão em `getUserEntitlements` | Retorna `[]` sem crash | ✅ PASS (fail-safe) |
| DB-002 | Entitlement não existe na base de dados | Lança `ENTITLEMENT_NOT_FOUND` | ✅ PASS |
| DB-003 | Timeout na verificação de acesso | `verifyAccess()` retorna `false` (deny by default) | ✅ PASS (fail-safe) |
| WEBHOOK-001 | Referência Multicaixa não existe na base de dados | Lança erro sem corromper estado transaccional | ✅ PASS |

---

### F25 — Gate Adversarial: Consolidação e Verificação de Patches

| ID | Cenário de Verificação | Resultado |
| :--- | :--- | :---: |
| PATCH-001 | `verifyAccess` com entitlement revogado (`is_active: false`) | `false` (acesso negado) ✅ |
| PATCH-002 | ProxyPay rejeita pagamento em moeda diferente de AOA | Lança `AOA currency` ✅ |
| PATCH-003 | Produto sem `asset_file_url` configurado — sem download | Lança `ASSET_NOT_CONFIGURED` ✅ |
| PRIV-001 | BUYER usa `assertPermission` para 5 permissões admin | Todas lançam `ACCESS_DENIED` ✅ |
| PRIV-002 | Guest (`isGuest: true`) detectado antes de operação financeira | Flag verificado ✅ |
| SUMMARY | Consolidação de 15 vectores de ataque mapeados | Todos com defesa documentada ✅ |

---

## 3. Resumo Final de Vectores Auditados

| Vector | Defesa | Severity | Status |
| :--- | :--- | :---: | :---: |
| IDOR — Pedidos | `buyer_id` check + RBAC `order:read_any` | P0 | 🛡️ PROTEGIDO |
| IDOR — Downloads | `buyer_id` check em `getSignedDownloadUrl` | P0 | 🛡️ PROTEGIDO |
| Entitlement revogado | `is_active` check antes do URL assinado | P0 | 🛡️ PROTEGIDO |
| Replay de Webhook | Tabela `payment_provider_events` + chave única | P0 | 🛡️ PROTEGIDO |
| Assinatura Webhook | HMAC-SHA256 `timingSafeEqual` | P0 | 🛡️ PROTEGIDO |
| Montante errado em Webhook | `paidMinor !== orderTotalMinor` | P0 | 🛡️ PROTEGIDO |
| Moeda errada em Webhook | `paidCurrency !== order.currency` | P0 | 🛡️ PROTEGIDO |
| Cupom expirado | `valid_until` check | P1 | 🛡️ PROTEGIDO |
| Cupom esgotado | `times_used >= max_uses` | P1 | 🛡️ PROTEGIDO |
| Cupom inativo | `.eq('is_active', true)` na query | P1 | 🛡️ PROTEGIDO |
| **Tipo desconto inválido** | **Validação explícita — CORRIGIDA (BUG-ADV-001)** | **P2** | **✅ CORRIGIDO** |
| Escalada de privilégio | `RBACManager.hasPermission` + `assertPermission` | P0 | 🛡️ PROTEGIDO |
| Guest em operação financeira | `assertNotGuestForFinancialOperation` | P1 | 🛡️ PROTEGIDO |
| Curso via endpoint de download | `product_type === 'DIGITAL_DOWNLOAD'` gate | P1 | 🛡️ PROTEGIDO |
| Falha silenciosa de DB | Fail-safe: `[]` ou `false` em erro | P2 | 🛡️ PROTEGIDO |

---

## 4. Decisão do Gate Adversarial (F25)

- **Bloqueadores P0:** 0
- **Bloqueadores P1:** 0
- **Bug P2 encontrado e corrigido:** BUG-ADV-001 — tipo de desconto inválido em cupom
- **Testes adversariais:** 31/31 PASS
- **Regressão completa:** 190/190 PASS (51 ficheiros)
- **Commit:** `5f6bfdf`

**DECISÃO: APROVADO (GATE C PASS)**. A plataforma avança para o **Módulo D — GO-LIVE Master Check (F26–F31)**.
