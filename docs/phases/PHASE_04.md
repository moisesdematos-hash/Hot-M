# RELATÓRIO DE FASE — PHASE 4: ORDERS

## 1. Objective
Implementar o pipeline contratual de criação de pedidos (`Order`), consumindo estritamente cotações válidas e não expiradas do `PricingEngine`, congelando de forma imutável a moeda e os valores totais (**INV-002**, **INV-012**), garantindo o congelamento da afiliação (**INV-013**), proibindo compras por usuários anônimos em operações financeiras (Seção 24) e estabelecendo o estado `PENDING_PAYMENT` antes de qualquer interação com gateways de pagamento.

## 2. Implementation
- Esquemas de validação Zod em `src/modules/orders/schemas.ts`:
  - `createOrderSchema`: Valida `quoteId` e `affiliateCode` opcional.
- Serviço de pedidos em `src/modules/orders/order-service.ts` (`OrderService`):
  - Etapa 1: Autenticação do comprador verificada.
  - Etapa 2: Validação da cotação ativa via `PricingEngine.getValidQuote(quoteId)`.
  - Etapa 3: Verificação de que o produto associado à oferta encontra-se publicado (`status = 'PUBLISHED'`).
  - Etapa 4: Resolução e congelamento da atribuição de afiliado ativo (`affiliate_links` $\to$ `affiliate_id`).
  - Etapa 5: Criação do pedido com status `PENDING_PAYMENT`, moeda e total imutáveis (`total_amount_minor`).
  - Etapa 6: Criação dos itens do pedido (`order_items`) com quantidade e valores congelados.
  - Etapa 7: Registro automático de auditoria em `audit_logs`.
  - Etapa 8: Emissão do UUID do pedido e retorno dos dados.
  - Consultas protegidas com barreira IDOR (`getOrderById` e `listBuyerOrders`).
- Rotas de API HTTP:
  - `POST /api/v1/orders`: Criação atômica do pedido a partir do `quoteId`.
  - `GET /api/v1/orders`: Listagem de compras do comprador autenticado.
  - `GET /api/v1/orders/[id]`: Consulta individual de pedido com autorização de propriedade.
- Interfaces de usuário (UI):
  - `/checkout/[quoteId]`: Tela de checkout que consome a cotação oficial, exibe o resumo financeiro dos itens e submete para criação de pedido.
  - `/orders/[id]`: Tela de confirmação e resumo de pedido com status `PENDING_PAYMENT` pronto para pagamento.

## 3. Files Changed / Created
- `src/modules/orders/schemas.ts`
- `src/modules/orders/order-service.ts`
- `src/app/api/v1/orders/route.ts`
- `src/app/api/v1/orders/[id]/route.ts`
- `src/app/checkout/[quoteId]/page.tsx`
- `src/app/orders/[id]/page.tsx`
- `src/tests/unit/order-service.test.ts`
- `src/tests/integration/order-lifecycle.test.ts`
- `docs/phases/PHASE_04.md`

## 4. Migrations
As tabelas `orders`, `order_items`, `affiliate_links` e suas políticas RLS foram criadas no banco de dados nas etapas de fundação.

## 5. Tests
- **Unit Tests:** 36 testes executados com sucesso em 10 arquivos (incluindo testes de criação de pedido a partir de cotação válida, valores congelados e afiliação).
- **Integration Tests:** 18 testes executados com sucesso em 6 arquivos (incluindo testes de rejeição para produtos não publicados e proteção contra IDOR).

## 6. Negative Tests
- Rejeição de compra para produtos ainda em `DRAFT` ou `SUSPENDED` (`PRODUTO_INDISPONIVEL`).
- Rejeição de criação de pedido caso a cotação esteja vencida além de 15 minutos (`QUOTE_EXPIRED`).
- Bloqueio imediato de criação de pedido sem autenticação real (`SECURITY_VIOLATION: Guest mode proibido`).

## 7. Security Tests
- Cumprimento de **INV-002**: O pedido sempre existe no banco com status `PENDING_PAYMENT` antes de qualquer chamada a provedor financeiro.
- Cumprimento de **INV-012**: Total e moeda tornam-se imutáveis no momento da gravação do pedido.
- Cumprimento de **INV-013**: Afiliação válida é congelada no pedido e imune a alterações posteriores de links.
- Proteção contra IDOR: Usuários não autorizados são bloqueados de inspecionar pedidos de terceiros (`ACCESS_DENIED`).

## 8. Failures Found
Nenhuma falha detectada.

## 9. Fixes
Nenhuma correção necessária.

## 10. Acceptance Criteria
- [x] O servidor autentica o comprador (convidados rejeitados em transações).
- [x] Cotação validada contra o banco de dados.
- [x] Oferta e produto validados (apenas produtos publicados).
- [x] Pedido registrado no banco em `PENDING_PAYMENT`.
- [x] Itens do pedido registrados com valores e quantidades.
- [x] Moeda e total congelados de forma imutável.
- [x] UUID gerado e retornado.
- [x] Todos os gates (`lint`, `typecheck`, `test`, `test:integration`, `build`) verdes.

## 11. Evidence
- `npm run typecheck`: Exit code 0.
- `npm run test`: Exit code 0 (36 unit tests passed).
- `npm run test:integration`: Exit code 0 (18 integration tests passed).
- `npm run lint`: Exit code 0 ("No ESLint warnings or errors").

## 12. Remaining Debt
Nenhum débito técnico.

## 13. Status
`PHASE_4_STATUS=PASSED`
