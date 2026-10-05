# RELATÓRIO DE FASE — PHASE 11: REFUNDS & DISPUTE ENGINE (REEMBOLSOS & ESTORNOS)

## 1. Objective
Implementar a governança integral de solicitações e moderação de reembolsos na plataforma HOT-M, com validação do prazo de garantia legal de 7 dias para infoprodutos, desmonte proporcional de comissões e receitas no livro-razão por partidas dobradas (**INV-005**, **INV-006**), revogação atômica e instantânea de direitos de acesso digitais (**INV-007**), e emissão de eventos assíncronos no transactional outbox.

## 2. Implementation
- **Serviço de Reembolsos (`src/modules/refunds/refund-service.ts`):**
  - **Solicitação do Comprador (`requestRefund`):**
    - Defesa contra IDOR: Apenas o comprador legítimo (`buyer_id = session.id`) pode solicitar reembolso para o pedido.
    - Validação de Janela de Garantia: Bloqueia automaticamente pedidos com mais de 7 dias de criação/pagamento (`WARRANTY_EXPIRED`).
    - Prevenção de duplicidade: Rejeita com erro se já existir solicitação pendente em análise (`REFUND_ALREADY_REQUESTED`).
    - Transição de status do pedido para `REFUND_REQUESTED` via `OrderStateMachine`.
  - **Aprovação Financeira de Reembolso (`approveRefund`):**
    - Transição determinística de estado: `REFUND_REQUESTED` $\to$ `REFUND_PROCESSING` $\to$ `REFUNDED`.
    - Registro oficial do reembolso na tabela `refunds` com status `COMPLETED`.
    - **Desmonte Contábil Reverso no Livro-Razão (Double-Entry Ledger):**
      - Débito na conta do Criador (`SELLER_RECEIVABLE`): estorno da receita líquida do produtor.
      - Débito na conta do Afiliado (`SELLER_RECEIVABLE`): estorno da comissão de 20% atribuída.
      - Débito na conta da Plataforma (`PLATFORM_REVENUE`): estorno da taxa de serviço de 10%.
      - Crédito na conta de Compensação (`CLEARING_PAYMENT`): liquidação do montante total ao comprador.
      - Equilíbrio contábil garantido: $\sum \text{Débitos} = \text{Total Reembolsado} = \sum \text{Créditos}$ (**INV-006**).
    - **Revogação Instantânea de Entitlements (**INV-007**):**
      - Todos os acessos vinculados ao `order_id` têm `is_active: false`, `revoked_at: NOW()` e motivo gravados.
      - Tentativas subsequentes de download de arquivos ou aulas são sumariamente bloqueadas.
    - **Outbox Event (`order.refunded`):** Emissão de evento para disparo de notificações e e-mails de estorno.
  - **Rejeição de Reembolso (`rejectRefund`):**
    - Atualização da solicitação para `REJECTED` com justificativa do moderador.
    - Reversão segura do status do pedido de volta para `PAID`.
- **Rotas de API HTTP:**
  - `POST /api/v1/orders/[id]/refund`: Solicitação de reembolso pelo comprador.
  - `GET /api/v1/finance/refunds`: Listagem de solicitações com filtro por status para a equipe de moderação (`SUPPORT`, `FINANCE`, `ADMIN`).
  - `POST /api/v1/finance/refunds/[id]/approve`: Aprovação com desmonte contábil restrita por RBAC (`FINANCE`, `ADMIN`, `SUPER_ADMIN`).
  - `POST /api/v1/finance/refunds/[id]/reject`: Rejeição justificada com reversão do status do pedido.
- **Interface do Usuário (`src/app/orders/[id]/page.tsx`):**
  - Botão de solicitação de reembolso acessível na tela do pedido pago.
  - Modal com justificativa e orientações sobre a política de revogação de acessos.
  - Badges visuais dinâmicos para `PAID`, `REFUND_REQUESTED` e `REFUNDED`.

## 3. Files Changed / Created
- `src/modules/refunds/refund-service.ts`
- `src/app/api/v1/orders/[id]/refund/route.ts`
- `src/app/api/v1/finance/refunds/route.ts`
- `src/app/api/v1/finance/refunds/[id]/approve/route.ts`
- `src/app/api/v1/finance/refunds/[id]/reject/route.ts`
- `src/app/orders/[id]/page.tsx`
- `src/tests/unit/refund-service.test.ts`
- `src/tests/integration/refund-lifecycle.test.ts`
- `docs/phases/PHASE_11.md`

## 4. Tests
- **Unit Tests:** 59 testes aprovados em 16 arquivos (`npm run test`).
- **Integration Tests:** 29 testes aprovados em 12 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros no TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 avisos ou erros (`next lint`).
- **Build:** 34 rotas estáticas e dinâmicas compiladas com sucesso (`next build`).

## 5. Negative & Invariant Tests
- Solicitação de reembolso de pedido de terceiro rejeitada com erro `FORBIDDEN` (IDOR).
- Solicitação após expiração da garantia de 7 dias rejeitada com erro `WARRANTY_EXPIRED`.
- Solicitação duplicada rejeitada com erro `REFUND_ALREADY_REQUESTED`.
- Solicitação em pedido já reembolsado rejeitada com erro `ORDER_ALREADY_REFUNDED`.
- **Teste de Ciclo de Vida e Revogação (INV-007):** Comprador com acesso ativo faz download normalmente; após aprovação do reembolso, o download é bloqueado imediatamente com erro `ENTITLEMENT_REVOKED`.

## 6. Acceptance Criteria
- [x] Regra canônica de janela de garantia de 7 dias implementada.
- [x] Desmonte proporcional de comissões e receitas por partidas dobradas (**INV-005**, **INV-006**).
- [x] Revogação atômica e irrevogável de entitlements no ato do reembolso (**INV-007**).
- [x] Evento transacional `order.refunded` emitido no outbox.
- [x] Proteção RBAC estrita em rotas de moderação financeira.
- [x] Interface de solicitação de reembolso no pedido `/orders/[id]` funcional.
- [x] 88 testes automatizados passando 100% verdes. Build Next.js 15 compilado com sucesso.
