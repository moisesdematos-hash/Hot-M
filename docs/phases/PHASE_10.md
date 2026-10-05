# RELATÓRIO DE FASE — PHASE 10: WITHDRAWALS ENGINE (SAQUES & CONCORRÊNCIA)

## 1. Objective
Implementar o motor transacional de saques bancários para criadores e afiliados em Angola (Multicaixa / IBAN), garantindo controle estrito de concorrência financeira pessimista (prevenção de gasto duplo / double withdrawal race conditions), máquina de estados canônica determinística (`WithdrawalStateMachine`), retenção contábil por partidas dobradas (`WITHDRAWAL_HOLD`), estorno em caso de rejeição (`WITHDRAWAL_REVERSAL`) e liquidação em caso de quitação (`WITHDRAWAL_RELEASE`), cumprindo integralmente os invariantes **INV-005** e **INV-006**.

## 2. Implementation
- **Serviço de Saques (`src/modules/withdrawals/withdrawal-service.ts`):**
  - **Travamento de Concorrência Pessimista (`withUserLock`):** Serialização de requisições de saque por usuário impedindo que requisições concorrentes ultrapassem o saldo disponível.
  - Validação de piso mínimo de saque por moeda: 5.000,00 AOA (`MINIMUM_WITHDRAWAL_MINOR = 500000n`).
  - Validação estrita de titularidade do método de saque cadastrado.
  - Cálculo do saldo disponível em tempo real diretamente do livro-razão imutável antes da autorização.
  - Lançamento de Retenção Contábil (`WITHDRAWAL_HOLD`):
    - Débito na conta `SELLER_RECEIVABLE` do usuário (reduzindo imediatamente o saldo disponível).
    - Crédito na conta `WITHDRAWAL_ESCROW` da plataforma.
    - Débitos rigorosamente iguais a créditos ($\sum \text{Débitos} = \sum \text{Créditos}$).
  - Aprovação Financeira (`approveWithdrawal`):
    - Transição de estado: `REQUESTED` $\to$ `APPROVED`.
    - Registro de auditoria (`WITHDRAWAL_APPROVED`) com operador financeiro.
  - Rejeição e Estorno Contábil (`rejectWithdrawal`):
    - Transição de estado: `REQUESTED` / `UNDER_REVIEW` $\to$ `REJECTED`.
    - Reversão contábil no livro-razão (`WITHDRAWAL_REVERSAL`): Débito em `WITHDRAWAL_ESCROW` e Crédito em `SELLER_RECEIVABLE`, restaurando integralmente os fundos na carteira do usuário.
  - Liquidação Bancária (`finalizePaidWithdrawal`):
    - Transição: `APPROVED` $\to$ `PROCESSING` $\to$ `PAID`.
    - Lançamento de liberação (`WITHDRAWAL_RELEASE`): Débito em `WITHDRAWAL_ESCROW` e Crédito em `CASH_SETTLEMENT`.
- **Máquina de Estados Canônica (`src/core/fintech/state-machines.ts`):**
  - `WithdrawalStateMachine` com validações determinísticas de transição: `REQUESTED` $\to$ `APPROVED` $\to$ `PROCESSING` $\to$ `PAID` (ou `REJECTED`).
- **Rotas de API HTTP:**
  - `GET /api/v1/finance/withdrawals`: Listagem do histórico de saques do usuário.
  - `POST /api/v1/finance/withdrawals`: Solicitação de novo saque com trava de concorrência e retenção no ledger.
  - `GET /api/v1/finance/withdrawal-methods`: Listagem de contas bancárias e IBANs cadastrados.
  - `POST /api/v1/finance/withdrawal-methods`: Cadastro de novas contas bancárias angolanas.
  - `POST /api/v1/finance/withdrawals/[id]/approve`: Aprovação de saque protegida por RBAC (`FINANCE`, `ADMIN`).
  - `POST /api/v1/finance/withdrawals/[id]/reject`: Rejeição com estorno automático protegida por RBAC.
- **Interface de Solicitação de Saque (`src/app/dashboard/finance/withdraw/page.tsx`):**
  - Exibição em tempo real do saldo disponível.
  - Formulário de saque com seletor de contas e botão "Usar Saldo Total".
  - Modal para cadastro rápido de novas contas bancárias / IBAN Angola (BAI, BFA, Atlântico, BIC, etc.).
  - Tabela de histórico de solicitações com badges de status (`REQUESTED`, `APPROVED`, `PAID`, `REJECTED`).

## 3. Files Changed / Created
- `src/core/fintech/state-machines.ts`
- `src/modules/withdrawals/withdrawal-service.ts`
- `src/app/api/v1/finance/withdrawals/route.ts`
- `src/app/api/v1/finance/withdrawals/[id]/approve/route.ts`
- `src/app/api/v1/finance/withdrawals/[id]/reject/route.ts`
- `src/app/api/v1/finance/withdrawal-methods/route.ts`
- `src/app/dashboard/finance/withdraw/page.tsx`
- `src/tests/unit/withdrawal-service.test.ts`
- `src/tests/integration/withdrawal-concurrency.test.ts`
- `docs/phases/PHASE_10.md`

## 4. Tests
- **Unit Tests:** 54 testes aprovados em 15 arquivos (`npm run test`).
- **Integration Tests:** 28 testes aprovados em 11 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros com TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 avisos ou erros (`next lint`).
- **Build:** 31 rotas estáticas e dinâmicas compiladas com sucesso (`next build`).

## 5. Negative & Invariant Tests
- Solicitação de saque abaixo de 5.000,00 AOA rejeitada com erro `MINIMUM_WITHDRAWAL_NOT_MET`.
- Solicitação com saldo insuficiente rejeitada com HTTP 422 `INSUFFICIENT_FUNDS`.
- Tentativa de usar método de saque pertencente a outro usuário rejeitada com erro `METHOD_NOT_FOUND`.
- **Teste de Estresse de Concorrência (Race Condition):** Usuário com saldo de 10.000,00 AOA dispara duas requisições simultâneas de 8.000,00 AOA. Estritamente apenas 1 é aprovada (`REQUESTED`), enquanto a segunda é sumariamente rejeitada por insuficiência de fundos, comprovando a impossibilidade de saldo negativo.
- Rejeição de saque reverte e devolve o montante ao saldo disponível do usuário no ledger.

## 6. Acceptance Criteria
- [x] Prevenção absoluta de gastos duplos / double-withdrawal race conditions.
- [x] Máquina de estados `WithdrawalStateMachine` determinística.
- [x] Retenção contábil (`WITHDRAWAL_HOLD`) e reversão (`WITHDRAWAL_REVERSAL`) em partidas dobradas.
- [x] Gestão de métodos de saque bancários (IBAN Angola).
- [x] Endpoints protegidos por RBAC (`FINANCE`, `ADMIN`).
- [x] Interface `/dashboard/finance/withdraw` funcional.
- [x] Todos os 82 testes automatizados passando. Build Next.js 15 100% verde.
