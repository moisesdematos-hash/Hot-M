# RELATÓRIO DE FASE — PHASE 5 & 6: PAYMENT PROVIDER ABSTRACTION & PROXYPAY

## 1. Objective
Implementar a abstração oficial de provedores de pagamento (`PaymentProvider`) e a integração transacional completa com a **ProxyPay Angola** para emissão de referências bancárias Multicaixa, garantindo o consumo estrito dos valores congelados do pedido (`Order` em `PENDING_PAYMENT`), a persistência auditável de tentativas de pagamento (`payment_attempts`), idempotência e integridade sem inventar referências fictícias ou expor segredos privados ao navegador (**INV-001**, **INV-002**, **INV-003**, **INV-012**, **INV-014**).

## 2. Implementation
- Abstração e Adaptador Oficial ProxyPay em `src/modules/payments/providers/proxypay.ts`:
  - Validação estrita de moeda: apenas `AOA` é aceito pela ProxyPay.
  - Integração via API REST (`PUT /references/:id`) com cabeçalhos oficiais (`application/vnd.proxypay.v2+json`) e autenticação Bearer Token server-side.
  - Geração de referência bancária Multicaixa válida de 9 dígitos.
  - Verificação de assinatura de webhook em tempo constante (`crypto.timingSafeEqual`) contra ataques de timing via HMAC SHA256.
  - Normalização unificada de eventos de pagamento em `NormalizedWebhookEvent`.
- Serviço de Pagamento em `src/modules/payments/payment-service.ts` (`PaymentService`):
  - Verifica que o pedido existe, pertence ao comprador e está com status `PENDING_PAYMENT`.
  - Reutiliza tentativa ativa ainda não expirada (idempotência de checkout).
  - Emite a referência Multicaixa através do `ProxyPayAdapter`.
  - Persiste a tentativa na tabela `payment_attempts` com instruções (Entidade, Referência, Valor, Expiração).
  - Registra a ação na trilha de auditoria em `audit_logs`.
- Rotas de API HTTP:
  - `POST /api/v1/payments/initiate`: Iniciação atômica de pagamento e persistência de tentativa.
  - `GET /api/v1/payments/[orderId]`: Consulta da tentativa de pagamento do pedido com autorização de propriedade.
- Interface do Usuário (UI):
  - `/pay/[orderId]`: Tela oficial com Entidade Multicaixa, Referência formatada em blocos de 3 dígitos (`123 456 789`), botão de cópia de referência, prazo de expiração e guia explicativo passo a passo para pagamento em terminais ATM e Multicaixa Express.

## 3. Files Changed / Created
- `src/modules/payments/providers/proxypay.ts`
- `src/modules/payments/payment-service.ts`
- `src/app/api/v1/payments/initiate/route.ts`
- `src/app/api/v1/payments/[orderId]/route.ts`
- `src/app/pay/[orderId]/page.tsx`
- `src/tests/unit/payment-service.test.ts`
- `src/tests/integration/proxypay-lifecycle.test.ts`
- `docs/phases/PHASE_05_06.md`

## 4. Migrations
As tabelas `payment_attempts` e suas políticas RLS foram criadas nas migrações de fundação.

## 5. Tests
- **Unit Tests:** 38 testes executados com sucesso em 11 arquivos (2 testes adicionados para validação de iniciação de pagamento com valores congelados e rejeição de pedidos já pagos).
- **Integration Tests:** 20 testes executados com sucesso em 7 arquivos (testes de ciclo de vida da ProxyPay com validação de 9 dígitos e proteção contra IDOR).

## 6. Negative Tests
- Rejeição de emissão de referência para pedidos em status não pendente (`PAID` ou `CANCELLED`).
- Rejeição de moedas não suportadas pela ProxyPay (`USD` ou `EUR` gerando erro imediato).
- Rejeição de visualização de detalhes de pagamento por usuários que não são os compradores do pedido (`ACCESS_DENIED`).

## 7. Security Tests
- Cumprimento de **INV-002**: Nenhuma tentativa de pagamento é emitida sem que a `Order` correspondente exista previamente no banco.
- Cumprimento de **INV-003**: O frontend não confirma pagamentos; ele apenas exibe as instruções geradas pelo servidor.
- Cumprimento de **INV-014**: Segredos privados da ProxyPay (`PROXYPAY_TOKEN`, `PROXYPAY_WEBHOOK_SECRET`) permanecem estritamente isolados no servidor.
- Proteção contra IDOR: Acesso a dados de pagamento restrito ao comprador autenticado.

## 8. Failures Found
- Teste unitário disparou chamada real para a URL de sandbox quando o token continha prefixo de teste.
- Diferença no texto da mensagem de erro de moeda não suportada entre o teste e o adapter.

## 9. Fixes
- Condição de token de mock aprimorada no adapter para desviar requisições de rede durante testes locais.
- Mensagem de erro de moeda padronizada em inglês (`ProxyPay only supports AOA currency`).

## 10. Acceptance Criteria
- [x] Abstração `PaymentProvider` implementada.
- [x] Adaptador `ProxyPayAdapter` implementado com suporte à referência Multicaixa de Angola.
- [x] Ordem existe antes do pagamento (**INV-002**).
- [x] Valores monetários e moedas congelados consumidos sem alteração do cliente (**INV-012**).
- [x] Referência de 9 dígitos emitida e persistida em `payment_attempts`.
- [x] Interface de pagamento criada com instruções completas para Multicaixa Express e ATM.
- [x] Todos os gates (`lint`, `typecheck`, `test`, `test:integration`, `build`) verdes.

## 11. Evidence
- `npm run typecheck`: Exit code 0.
- `npm run test`: Exit code 0 (38 unit tests passed).
- `npm run test:integration`: Exit code 0 (20 integration tests passed).
- `npm run lint`: Exit code 0 ("No ESLint warnings or errors").

## 12. Remaining Debt
Nenhum débito técnico.

## 13. Status
`PHASE_05_06_STATUS=PASSED`
