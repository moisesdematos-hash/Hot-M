# RELATÓRIO DE FASE — PHASE 13: COPRODUCTION ENGINE & REVENUE SPLIT

## 1. Objective
Implementar o motor de coprodução e divisão automática de receita (*Revenue Split*) na plataforma HOT-M conforme a Seção 75 e as regras financeiras invariantes da arquitetura:
- **INV-005: Conservation of money** (conservação absoluta de fundos entre debito clearing e créditos rateados).
- **INV-006: Balanced ledger transactions** ($\sum \text{Debits} = \sum \text{Credits}$ em todas as transações de venda).
- Divisão de percentual com teto rigoroso ($\sum \text{co-producers} < 100\%$), onde o remanescente é alocado estritamente ao criador primário do produto.
- Liquidação automática e atômica de múltiplos créditos no livro-razão no processamento de webhook de pagamento confirmado (`WebhookEngine`).
- Painel visual do produtor para gerenciar coprodutores, alocações percentuais e visualização gráfica de barra de distribuição.

## 2. Implementation
- **Serviço de Coprodução (`src/modules/coproduction/coproduction-service.ts`):**
  - **Consulta de Coprodutores (`getCoProducers`):**
    - Defesa contra IDOR: verificação de titularidade do produto pelo criador logado.
    - Cálculo de total alocado e percentual restante do criador primário.
  - **Adição / Convite de Coprodutor (`addCoProducer`):**
    - Validação de e-mail do parceiro e identificação do usuário existente.
    - Proibição de auto-coprodução: criador não pode adicionar a si mesmo (`SELF_COPRODUCTION_PROHIBITED`).
    - Validação percentual: limites individuais e teto global (`TOTAL_SHARE_EXCEEDS_MAXIMUM` se a soma de parceiros atingir ou ultrapassar 100%).
    - Inserção na tabela `revenue_shares`.
  - **Remoção de Coprodutor (`removeCoProducer`):**
    - Remoção controlada pelo criador dono do produto.
  - **Listagem de Parcerias (`getUserCoProductions`):**
    - Consulta de todos os produtos onde o usuário autenticado participa como coprodutor.
  - **Cálculo Determinístico de Split (`calculateSplit`):**
    - Cálculo com precisão inteira (`BigInt` / minor units) para cada coprodutor ativo.
    - Alocação do remanescente exato para o criador primário sem perda de arredondamento monetário.
- **Integração no Motor de Webhook (`src/modules/webhooks/webhook-engine.ts`):**
  - No método `recordLedgerDistribution`, consulta atômica a `revenue_shares` para o produto vendido.
  - Se houver parceiros cadastrados, a receita líquida do criador (após taxa da plataforma e comissão de afiliado) é particionada em sub-créditos individuais no livro-razão:
    - Conta `CREATOR_BALANCE` de cada coprodutor creditada com sua cota inteira.
    - Conta `CREATOR_BALANCE` do produtor primário creditada com o remanescente exato.
  - Garantia de que todos os débitos e créditos somam exatamente o montante total da venda (`LedgerValidator.validate`), respeitando INV-006.
- **Rotas de API HTTP:**
  - `GET /api/v1/products/[id]/coproduction`: Listagem de parceiros e percentuais alocados.
  - `POST /api/v1/products/[id]/coproduction`: Cadastro de novo coprodutor por e-mail e percentual.
  - `DELETE /api/v1/products/[id]/coproduction?shareId=...`: Desvinculação de parceiro.
  - `GET /api/v1/coproduction/my-partnerships`: Consulta das coproduções do usuário conectado.
- **Interface do Criador (`src/app/dashboard/products/[id]/coproduction/page.tsx`):**
  - Visualização gráfica em barra de progresso multicor da distribuição percentual (Criador Primário vs Coprodutores).
  - Formulário para convidar/adicionar parceiro com validação de percentual restante em tempo real.
  - Tabela de coprodutores ativos com data de vínculo, percentual e ação de remoção.
  - Cards de resumo: Criador Primário (%), Coprodutores (%), Total Distribuído (%).

## 3. Files Changed / Created
- `src/modules/coproduction/coproduction-service.ts`
- `src/modules/webhooks/webhook-engine.ts`
- `src/app/api/v1/products/[id]/coproduction/route.ts`
- `src/app/api/v1/coproduction/my-partnerships/route.ts`
- `src/app/dashboard/products/[id]/coproduction/page.tsx`
- `src/tests/unit/coproduction-service.test.ts`
- `src/tests/integration/coproduction-lifecycle.test.ts`
- `docs/phases/PHASE_13.md`

## 4. Tests
- **Unit Tests:** 68 testes aprovados em 18 arquivos (`npm run test`).
- **Integration Tests:** 31 testes aprovados em 14 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros no TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 avisos ou erros (`next lint`).
- **Build:** 37 rotas estáticas e dinâmicas compiladas com sucesso (`next build`).

## 5. Negative & Invariant Tests
- **Auto-coprodução Rejeitada:** Produtor tentando se cadastrar como coprodutor do próprio produto rejeitado com `SELF_COPRODUCTION_PROHIBITED`.
- **Teto Percentual Ultrapassado:** Adição de coprodutores cuja soma com os já existentes ultrapasse ou iguale 100% rejeitada com `TOTAL_SHARE_EXCEEDS_MAXIMUM`.
- **Defesa IDOR:** Tentativa de listar ou gerenciar coprodutores de produto de terceiros rejeitada com `FORBIDDEN`.
- **Parceiro Inexistente:** Tentativa de convidar e-mail não cadastrado na plataforma rejeitada com `USER_NOT_FOUND`.
- **Equilíbrio Contábil Multicrédito (INV-005, INV-006):** Teste de integração ponta a ponta simulando pagamento via webhook ProxyPay com 10.000,00 AOA, taxa da plataforma 10%, coprodutor 30% do líquido (2.700,00 AOA) e criador 70% do líquido (6.300,00 AOA): soma dos créditos rigorosamente idêntica a 10.000,00 AOA.

## 6. Acceptance Criteria
- [x] Serviço de coprodução com regras de negócio e cálculo em minor units (`CoproductionService`).
- [x] Validação contra auto-coprodução e teto estrito (< 100%).
- [x] Divisão automática de receita no processamento de webhooks de pagamento.
- [x] Lançamentos contábeis balanceados com múltiplos créditos e um débito de clearing.
- [x] Endpoints HTTP REST autenticados com proteção contra IDOR.
- [x] Página no dashboard do criador com barra visual e controle de parceiros.
- [x] 100% dos testes unitários e de integração verdes.
- [x] Typecheck e build de produção Next.js 15 validados.
