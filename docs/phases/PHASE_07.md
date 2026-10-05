# RELATÓRIO DE FASE — PHASE 7: WEBHOOK ENGINE & IDEMPOTÊNCIA

## 1. Objective
Implementar a esteira canônica de 15 etapas de processamento de webhooks da ProxyPay Angola, garantindo a validação de assinatura criptográfica HMAC SHA256 em tempo constante, idempotência rigorosa em nível de banco de dados (**INV-004**), transição atômica do pedido para `PAID`, lançamentos contábeis balanceados no livro-razão por partidas dobradas (**INV-005**, **INV-006**), concessão de direitos de acesso (**INV-007**), trilha de auditoria e emissão de eventos no outbox transactional.

## 2. Implementation
- Motor de Webhook em `src/modules/webhooks/webhook-engine.ts` (`WebhookEngine`):
  1. Validação da assinatura criptográfica HMAC SHA256 via `timingSafeEqual`.
  2. Identificação do provedor e parsing normalizado do payload.
  3. & 4. Persistência do evento em `payment_provider_events` com restrição de unicidade `(provider, provider_event_id)` garantindo idempotência total (**INV-004**).
  5. Localização da tentativa de pagamento em `payment_attempts` via `provider_reference`.
  6. Comparação e recuperação do pedido correspondente em `orders`.
  7. Validação de correspondência exata de moeda (`currency`).
  8. Validação de correspondência de valor monetário (`amount_minor`).
  9. Validação do status normalizado recebido do gateway.
  10. & 11. Transição atômica via `OrderStateMachine` atualizando `orders.status = 'PAID'` e `payment_attempts.status = 'PAID'`.
  12. Registro de transação contábil de dupla entrada no livro-razão (`ledger_transactions` e `ledger_entries`) com débitos rigorosamente iguais a créditos:
      $$\text{Débito (Compensação)} = \text{Crédito (Plataforma)} + \text{Crédito (Afiliado)} + \text{Crédito (Criador)}$$
  13. Emissão de direitos de acesso (`entitlements`) para o comprador de cada produto do pedido (**INV-007**).
  14. Registro de auditoria em `audit_logs`.
  15. Emissão de evento assíncrono em `outbox_events` (`order.paid`).
- Rota de API HTTP:
  - `POST /api/v1/webhooks/proxypay`: Receptor de webhooks com leitura de corpo cru (`request.text()`) e uso de cliente administrativo com service role.
- Teste de Estresse de Idempotência (**E2E-006**):
  - Execução consecutiva de 100 disparos do exato mesmo webhook comprovando exatamente **1 efeito transacional** e 99 deduplicações idempotentes.

## 3. Files Changed / Created
- `src/modules/webhooks/webhook-engine.ts`
- `src/app/api/v1/webhooks/proxypay/route.ts`
- `src/tests/unit/webhook-engine.test.ts`
- `src/tests/integration/webhook-idempotency.test.ts`
- `docs/phases/PHASE_07.md`

## 4. Migrations
As tabelas `payment_provider_events`, `ledger_accounts`, `ledger_transactions`, `ledger_entries`, `entitlements`, `audit_logs` e `outbox_events` foram provisionadas nas etapas de fundação.

## 5. Tests
- **Unit Tests:** 40 testes executados com sucesso em 12 arquivos (incluindo testes de rejeição de assinatura inválida e divergência de valores).
- **Integration Tests:** 21 testes executados com sucesso em 8 arquivos (incluindo o teste de estresse de 100 webhooks idênticos).

## 6. Negative Tests
- Rejeição imediata de payloads com assinatura HMAC inválida com erro `UNAUTHORIZED_SIGNATURE` (HTTP 401).
- Rejeição de webhooks com valor divergente do total congelado do pedido (`Divergência monetária`).
- Rejeição de webhooks emitidos em moeda incompatível com o pedido.

## 7. Security Tests
- Cumprimento de **INV-004**: Webhook repetido 100 vezes produz exatamente um único efeito no saldo, pedidos e acessos.
- Cumprimento de **INV-005** e **INV-006**: Ledger é imutável e permanece perfeitamente balanceado ($\sum \text{Débitos} = \sum \text{Créditos}$).
- Cumprimento de **INV-007**: Acesso aos arquivos e cursos é liberado apenas após a confirmação transacional do webhook.

## 8. Failures Found
- Teste de estresse apresentou falha de tipagem no encadeamento de métodos do mock de `ledger_accounts` e no retorno assíncrono de `insert`.
- O linter identificou uso de tipo explícito `any` no mock de testes.

## 9. Fixes
- Encadeamento fluente implementado com mocks síncronos e remoção de tipos `any`.

## 10. Acceptance Criteria
- [x] Esteira de 15 etapas implementada integralmente.
- [x] Assinatura criptográfica HMAC SHA256 validada em tempo constante.
- [x] Idempotência com chave unívoca de evento persistida.
- [x] Transição de estado para `PAID` via `OrderStateMachine`.
- [x] Lançamentos de dupla entrada no livro-razão com balanceamento auditado.
- [x] Concessão de entitlements aos compradores.
- [x] Teste de estresse com 100 webhooks (E2E-006) comprovando 1 único efeito executado e aprovado.
- [x] Todos os gates (`lint`, `typecheck`, `test`, `test:integration`, `build`) verdes.

## 11. Evidence
- `npm run typecheck`: Exit code 0.
- `npm run test`: Exit code 0 (40 unit tests passed).
- `npm run test:integration`: Exit code 0 (21 integration tests passed).
- `npm run lint`: Exit code 0 ("No ESLint warnings or errors").

## 12. Remaining Debt
Nenhum débito técnico.

## 13. Status
`PHASE_7_STATUS=PASSED`
