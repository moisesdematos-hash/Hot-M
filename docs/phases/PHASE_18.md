# RELATÓRIO DE FASE — PHASE 18: NOTIFICATION ENGINE & OUTBOX WORKER

## 1. Objective
Implementar a infraestrutura completa de mensageria assíncrona, notificações in-app e worker transacional de outbox da plataforma HOT-M conforme a Seção 75:
- **Padrão Transactional Outbox**: Publicação atômica de eventos de domínio (`order.paid`, `withdrawal.requested`, `withdrawal.approved`, `withdrawal.rejected`, `refund.approved`, `affiliate.sale`) na tabela `outbox_events` para garantir que falhas de rede ou lentidão em gateways externos nunca abortem transações financeiras no banco.
- **Worker Assíncrono com Políticas de Retry**: Processador de lotes (`OutboxService`) com controle de tentativas, registro de erros (`error_message`) e transição para estado terminal `FAILED` após 3 tentativas com backoff.
- **Gateway de Email Transacional (Resend)**: Serviço unificado com modo de simulação automático em ambiente de desenvolvimento/testes e templates HTML responsivos profissionais:
  - Confirmação de pedido e entrega de acessos com link direto à biblioteca (`/library`).
  - Alerta de aprovação ou rejeição de levantamento bancário.
  - Notificação de venda com cálculo de comissões para produtores e afiliados.
- **Central de Notificações In-App**: Sistema de notificações para o utilizador com controle de lidas/não lidas, contagem viva de unread badges e proteção estrita contra adulteração entre utilizadores.

## 2. Implementation
- **Migração do Banco de Dados (`supabase/migrations/20260307000000_notifications_and_outbox.sql`):**
  - Expansão da tabela `notifications` com colunas `link` e `type`.
  - Expansão da tabela `outbox_events` com colunas `error_message` e `processed_at`.
  - Políticas de RLS para isolamento de notificações de cada utilizador e proteção das mensagens de outbox.
  - Criação de índices de alta performance: `idx_notifications_user_unread` e `idx_outbox_events_status_created`.
- **Serviço de Email Transacional (`src/modules/notifications/email-service.ts`):**
  - Integração com API da Resend (`https://api.resend.com/emails`).
  - Fallback transparente e determinístico em ambiente local/sandbox.
  - Templates com design canónico da HOT-M: `createOrderPaidEmail`, `createWithdrawalStatusEmail` e `createSaleAlertEmail`.
- **Serviço de Notificações In-App (`src/modules/notifications/notification-service.ts`):**
  - `getUserNotifications`: listagem paginada e contagem exata de não lidas.
  - `createNotification`: gravação com tipagem rica (`INFO`, `SUCCESS`, `WARNING`, `ALERT`, `SALE`).
  - `markAsRead`: marcação individual protegida por titularidade (`user_id`).
  - `markAllAsRead`: marcação em massa de todas as notificações pendentes.
- **Outbox Service & Worker (`src/modules/notifications/outbox-service.ts`):**
  - `enqueueEvent`: enfileiramento de eventos com status `PENDING`.
  - `processPendingEvents`: execução de lotes com tratamento de exceções, despacho para notificações e emails e controle de estado `SENT` / `FAILED`.
- **Rotas de API HTTP REST:**
  - `GET /api/v1/notifications`: Listagem de notificações do utilizador autenticado.
  - `PATCH /api/v1/notifications/[id]/read`: Marcação de notificação específica como lida.
  - `POST /api/v1/notifications/mark-all-read`: Marcação de todas como lidas.
  - `POST /api/v1/cron/outbox-worker`: Endpoint agendado/cron para processamento periódico de lotes.
- **Interface do Usuário (UI):**
  - **Página de Notificações (`src/app/dashboard/notifications/page.tsx`):**
    - Abas "Todas" e "Não Lidas", badges dinâmicos, ações de leitura e links diretos para biblioteca ou financeiro.
  - **Acesso Rápido na Carteira (`src/app/dashboard/finance/page.tsx`):**
    - Botão `🔔 Notificações` adicionado ao header financeiro.

## 3. Files Changed / Created
- `supabase/migrations/20260307000000_notifications_and_outbox.sql`
- `src/modules/notifications/email-service.ts`
- `src/modules/notifications/notification-service.ts`
- `src/modules/notifications/outbox-service.ts`
- `src/app/api/v1/notifications/route.ts`
- `src/app/api/v1/notifications/[id]/read/route.ts`
- `src/app/api/v1/notifications/mark-all-read/route.ts`
- `src/app/api/v1/cron/outbox-worker/route.ts`
- `src/app/dashboard/notifications/page.tsx`
- `src/app/dashboard/finance/page.tsx`
- `src/tests/unit/notification-service.test.ts`
- `src/tests/unit/email-service.test.ts`
- `src/tests/unit/outbox-service.test.ts`
- `src/tests/integration/notification-outbox-lifecycle.test.ts`
- `docs/phases/PHASE_18.md`

## 4. Tests & Quality Gates
- **Unit Tests:** 104 testes aprovados em 25 arquivos (`npm run test`).
- **Integration Tests:** 36 testes aprovados em 19 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros com TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 erros e 0 warnings no Next.js ESLint (`npm run lint`).
- **Build:** 42 rotas estáticas e dinâmicas compiladas com sucesso sem erros de hidratação ou SSG (`npm run build`).

## 5. Invariant Compliance
- **INV-004 (Idempotência & Isolamento):** Falhas em canais de notificação externa não revertem transações financeiras do ledger graças ao desacoplamento no outbox.
- **INV-010 (RBAC & Defesa em Profundidade):** RLS e checagem de propriedade impedem que utilizadores acessem ou modifiquem notificações de terceiros.
