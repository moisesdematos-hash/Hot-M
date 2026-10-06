# RELATÓRIO DE FASE — PHASE 19: SUPPORT TICKETS & DISPUTE RESOLUTION

## 1. Objective
Implementar a infraestrutura completa de atendimento ao cliente, mensagens internas em chamados e resolução de disputas financeiras da plataforma HOT-M conforme a Seção 75:
- **Central de Atendimento & Disputas**: Gestão estruturada de chamados com categorização temática (`GENERAL`, `PAYMENT`, `ACCESS`, `REFUND`, `AFFILIATE`, `TECHNICAL`) e priorização operacional (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Vinculação Canónica de Pedidos (Dispute Linkage)**: Capacidade de atrelar chamados diretamente ao identificador do pedido (`order_id`) com verificação rigorosa de titularidade contra ataques de IDOR.
- **Histórico de Conversação em Tempo Real (In-Ticket Messaging)**: Tabela dedicada de mensagens de suporte com identificação explícita de remetente (Cliente vs. Equipa de Suporte).
- **Máquina de Estados de Chamados**: Transições automáticas de status conforme o fluxo de diálogo:
  - Resposta do suporte $\to$ `WAITING_CUSTOMER`.
  - Resposta do cliente $\to$ `IN_PROGRESS`.
  - Finalização $\to$ `RESOLVED` / `CLOSED`.
- **Notificações Integradas de Atendimento**: Envio automático de alertas in-app para o cliente quando o suporte responde ao chamado.

## 2. Implementation
- **Migração do Banco de Dados (`supabase/migrations/20260308000000_support_and_disputes.sql`):**
  - Expansão de `public.support_tickets` com colunas `order_id`, `priority` e `category`.
  - Criação de `public.support_ticket_messages` com chave estrangeira em cascata e campo `is_staff`.
  - Políticas de RLS reforçadas para `support_tickets` e `support_ticket_messages` garantindo isolamento entre utilizadores e acesso irrestrito para perfis `SUPPORT`, `ADMIN` e `SUPER_ADMIN`.
  - Índices `idx_support_tickets_user_status` e `idx_ticket_messages_ticket_created`.
- **Serviço de Suporte (`src/modules/support/support-service.ts`):**
  - `createTicket`: validação de assunto/descrição, validação de propriedade do pedido atrelado e inicialização da thread.
  - `getTickets`: listagem filtrada para utilizadores ou visão global para a equipa de atendimento.
  - `getTicketDetails`: busca protegida por IDOR com agregação de todas as mensagens ordenadas cronologicamente.
  - `addMessage`: inserção atômica de réplica, cálculo de transição de estado e emissão de notificação in-app.
  - `updateTicketStatus`: restrição de privilégios para encerramento de chamados.
- **Rotas de API HTTP REST:**
  - `GET /api/v1/support/tickets`: Listagem de chamados do utilizador autenticado ou fila geral do suporte.
  - `POST /api/v1/support/tickets`: Abertura de chamado ou contestação de compra.
  - `GET /api/v1/support/tickets/[id]`: Consulta detalhada de chamado e thread de respostas.
  - `POST /api/v1/support/tickets/[id]/messages`: Envio de nova resposta na thread.
  - `PATCH /api/v1/support/tickets/[id]/status`: Atualização do ciclo de vida do ticket.
- **Interfaces do Usuário (UI):**
  - **Painel Geral de Chamados (`src/app/dashboard/support/page.tsx`):**
    - Listagem de tickets com pills de status e prioridade, filtros rápidos e modal intuitivo de abertura de chamado.
  - **Página de Discussão do Chamado (`src/app/dashboard/support/[id]/page.tsx`):**
    - Thread visual com distinção gráfica entre mensagens da equipa de suporte e do cliente, formulário de resposta rápida e botão de resolução de chamado.
  - **Acesso Rápido na Navegação (`src/app/dashboard/finance/page.tsx`):**
    - Botão `🎧 Suporte` adicionado à barra de ferramentas do dashboard.

## 3. Files Changed / Created
- `supabase/migrations/20260308000000_support_and_disputes.sql`
- `src/modules/support/support-service.ts`
- `src/app/api/v1/support/tickets/route.ts`
- `src/app/api/v1/support/tickets/[id]/route.ts`
- `src/app/api/v1/support/tickets/[id]/messages/route.ts`
- `src/app/api/v1/support/tickets/[id]/status/route.ts`
- `src/app/dashboard/support/page.tsx`
- `src/app/dashboard/support/[id]/page.tsx`
- `src/app/dashboard/finance/page.tsx`
- `src/tests/unit/support-service.test.ts`
- `src/tests/integration/support-dispute-lifecycle.test.ts`
- `docs/phases/PHASE_19.md`

## 4. Tests & Quality Gates
- **Unit Tests:** 110 testes aprovados em 26 arquivos (`npm run test`).
- **Integration Tests:** 37 testes aprovados em 20 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros com TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 erros e 0 warnings no Next.js ESLint (`npm run lint`).
- **Build:** 44 rotas estáticas e dinâmicas compiladas com sucesso sem erros (`npm run build`).

## 5. Invariant Compliance
- **INV-010 (Defesa RBAC & IDOR):** Nenhum cliente consegue visualizar, responder ou alterar o estado de tickets de terceiros.
- **INV-006 (Ledger Auditability):** As disputas abertas mantêm correlação direta com ordens do sistema sem violar o histórico imutável das transações contábeis.
