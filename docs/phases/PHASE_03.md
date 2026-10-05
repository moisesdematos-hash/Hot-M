# RELATÓRIO DE FASE — PHASE 3: PRICING ENGINE

## 1. Objective
Implementar o motor de precificação e cálculo de cotações (`PricingEngine`) estritamente server-side, garantindo a separação absoluta entre Produto e Oferta (`Product` $\to$ `Offer` $\to$ `Price`), com suporte a moedas locais e globais (`AOA`, `USD`, `EUR`), cupons de desconto (percentuais e de valor fixo), múltiplos order bumps, expiração controlada e imposição intransponível do invariante **INV-001** (o navegador nunca define nem valida o preço final).

## 2. Implementation
- Migração SQL `supabase/migrations/20260303000000_coupons_and_quotes.sql`:
  - Tabela `coupons`: Cadastro de cupons de desconto com restrição de validade temporal (`valid_until`), limite de usos (`max_uses`), tipos (`PERCENTAGE` ou `FIXED_AMOUNT`) e moeda.
  - Tabela `pricing_quotes`: Armazenamento de cotações com `expires_at` (janela efêmera de 15 minutos) e snapshots de valores em unidades inteiras menores (`minor units`).
- Esquemas de validação Zod em `src/modules/pricing/schemas.ts`:
  - `quoteRequestSchema`: Requisição de cotação com `offerId`, `currency`, `couponCode` e `orderBumpOfferIds`.
  - `createOfferSchema`: Cadastro de ofertas vinculadas a produtos com matriz de preços por moeda.
  - `createCouponSchema`: Criação de cupons com regras de limites e validade.
- Núcleo de cálculo financeiro em `src/modules/pricing/pricing-engine.ts` (`PricingEngine`):
  - Consulta o preço base no banco de dados com base na moeda solicitada (nunca confia no cliente).
  - Valida cupom: checa se está ativo, dentro da validade, limite de usos não esgotado e compatibilidade de moeda/produto.
  - Adiciona preços oficiais de cada order bump.
  - Calcula o valor total com precisão de inteiros (*minor units*):
    $$\text{Total} = \max(\text{Base} - \text{Desconto}, 0) + \text{Bumps}$$
  - Persiste a cotação no banco gerando `quote_id` único e data de expiração (`expires_at`).
  - Método `getValidQuote`: Recupera cotação persistida e rejeita requisições expiradas com erro `QUOTE_EXPIRED`.
- Rotas de API HTTP:
  - `POST /api/v1/pricing/quote`: Gera cotação e retorna `quote_id`.
  - `GET /api/v1/pricing/quote/[id]`: Consulta cotação ativa ou acusa expiração.
  - `POST /api/v1/pricing/offers`: Criação de ofertas e preços pelo criador.

## 3. Files Changed / Created
- `supabase/migrations/20260303000000_coupons_and_quotes.sql`
- `src/modules/pricing/schemas.ts`
- `src/modules/pricing/pricing-engine.ts`
- `src/app/api/v1/pricing/quote/route.ts`
- `src/app/api/v1/pricing/quote/[id]/route.ts`
- `src/app/api/v1/pricing/offers/route.ts`
- `src/tests/unit/pricing-engine.test.ts`
- `src/tests/integration/pricing-security.test.ts`
- `docs/phases/PHASE_03.md`

## 4. Migrations
- `20260303000000_coupons_and_quotes.sql`: Criadas tabelas `coupons` e `pricing_quotes` com Row Level Security.

## 5. Tests
- **Unit Tests:** 35 testes no total (2 novos testes de cálculo exato de cotações, descontos percentuais e múltiplos order bumps em minor units).
- **Integration Tests:** 16 testes no total (3 novos testes de segurança verificando rejeição de cupons expirados, bloqueio de cupom com limite excedido e invalidação de cotações vencidas).

## 6. Negative Tests
- Rejeição de cupom com data vencida (`Cupom expirado`).
- Rejeição de cupom que ultrapassou o número máximo de usos permitidos (`Cupom atingiu o limite máximo de utilização`).
- Rejeição de cotação vencida além da janela de 15 minutos (`QUOTE_EXPIRED`).
- Rejeição de cupons de valor fixo emitidos em moeda incompatível com o pedido.

## 7. Security Tests
- Cumprimento de **INV-001**: O cliente jamais envia valores monetários nem calcula totais; o servidor busca dados do banco e gera o `quote_id`.
- Impossibilidade de gerar total negativo mesmo com cupons de 100% de desconto.
- Valores manipulados via payload são descartados pelo esquema Zod restrito.

## 8. Failures Found
- Detecção no teste unitário de parâmetro `col` não utilizado no mock `mockImplementation`.

## 9. Fixes
- Renomeado parâmetro para `_col` em conformidade com as regras estritas do linter e do compilador TypeScript.

## 10. Acceptance Criteria
- [x] Produto separado de Oferta (`Product` $\to$ `Offer` $\to$ `Price`).
- [x] Base price em unidades inteiras menores (`AOA`, `USD`, `EUR`).
- [x] Cupons de desconto percentuais e de valor fixo com travas de segurança.
- [x] Múltiplos order bumps calculados e incorporados à cotação.
- [x] Cotação efêmera gerada com `quote_id` e janela de validade (`expires_at`).
- [x] Todos os gates (`lint`, `typecheck`, `test`, `test:integration`, `build`) verdes.

## 11. Evidence
- `npm run typecheck`: Exit code 0.
- `npm run test`: Exit code 0 (35 unit tests passed).
- `npm run test:integration`: Exit code 0 (16 integration tests passed).
- `npm run lint`: Exit code 0 ("No ESLint warnings or errors").

## 12. Remaining Debt
Nenhum débito técnico.

## 13. Status
`PHASE_3_STATUS=PASSED`
