# RELATÓRIO DE FASE — PHASE 0: FOUNDATION

## 1. Objective
Estabelecer a fundação canônica do HOT-M: repositório Git, stack tecnológica estrita (Next.js 15, TypeScript strict, Tailwind, Supabase/PostgreSQL), motor financeiro de ponto não-flutuante, contabilidade de dupla entrada (double-entry ledger), máquina de estados, RBAC (Least Privilege), abstração de pagamentos com adaptador inicial ProxyPay, pipeline de CI no GitHub Actions, suíte de testes com Vitest, isolamento de variáveis de ambiente e documentação completa da arquitetura.

## 2. Implementation
- Repositório Git inicializado com `.gitignore` protegendo segredos e artefatos de build.
- `package.json` com scripts obrigatórios: `dev`, `lint`, `typecheck`, `test`, `test:integration`, `build`.
- Configuração TypeScript com flags estritas (`noImplicitAny`, `strictNullChecks`, etc.) em `tsconfig.json`.
- Configuração do Next.js e Tailwind CSS com modo escuro e acessibilidade.
- Validação tipada de variáveis de ambiente em `src/core/config/env.ts` impedindo vazamento de chaves privadas para o cliente (INV-014).
- Motor financeiro `Money` em `src/core/fintech/money.ts` operando estritamente em unidades inteiras menores (*minor units*).
- Motor de livro-razão `LedgerValidator` em `src/core/fintech/ledger.ts` garantindo débitos iguais a créditos (INV-005, INV-006).
- Máquinas de estados finitos determinísticas em `src/core/fintech/state-machines.ts` para Pedidos (`OrderStateMachine`) e Saques (`WithdrawalStateMachine`).
- Gerenciador RBAC e Least Privilege em `src/core/security/rbac.ts` com proibição de auto-atribuição de privilégios (INV-010).
- Trilha de auditoria estruturada em `src/core/security/audit.ts` (Seção 58).
- Abstração de provedor de pagamentos `PaymentProvider` em `src/core/fintech/payment-provider.ts` e adaptador `ProxyPayAdapter` em `src/modules/payments/providers/proxypay.ts`.
- Pipeline de integração contínua configurado em `.github/workflows/ci.yml`.

## 3. Files Changed / Created
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `eslint.config.mjs`
- `vitest.config.ts`
- `.gitignore`
- `.env.example`
- `.github/workflows/ci.yml`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/core/config/env.ts`
- `src/core/fintech/money.ts`
- `src/core/fintech/ledger.ts`
- `src/core/fintech/state-machines.ts`
- `src/core/fintech/payment-provider.ts`
- `src/core/security/rbac.ts`
- `src/core/security/audit.ts`
- `src/modules/payments/providers/proxypay.ts`
- `src/tests/unit/money.test.ts`
- `src/tests/unit/ledger.test.ts`
- `src/tests/unit/state-machines.test.ts`
- `src/tests/unit/rbac.test.ts`
- `src/tests/integration/proxypay-adapter.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/LEDGER.md`
- `docs/PAYMENTS.md`
- `docs/PROXYPAY.md`
- `docs/RLS.md`
- `docs/SECURITY.md`
- `docs/API.md`
- `docs/WEBHOOKS.md`
- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/TESTING.md`
- `docs/BACKUP_RESTORE.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/PRODUCTION_CHECKLIST.md`
- `docs/adr/ADR-0001-CANONICAL-ARCHITECTURE.md`
- `docs/adr/ADR-0002-LEDGER-DOUBLE-ENTRY.md`
- `docs/phases/PHASE_00.md`
- `README.md`

## 4. Migrations
- `supabase/migrations/20260301000000_canonical_schema.sql`: Definição das 34 entidades canônicas do banco de dados com chaves primárias UUID e integridade referencial.
- `supabase/migrations/20260301000001_rls_policies.sql`: Políticas de Row Level Security (RLS) para todas as tabelas e funções auxiliares de verificação de permissões.

## 5. Tests
- **Unit Tests:** 17 testes executados com sucesso em 4 arquivos de teste cobrindo `Money`, `Ledger`, `StateMachines` e `RBAC`.
- **Integration Tests:** 4 testes de integração para o `ProxyPayAdapter` cobrindo geração de referência Multicaixa, validação de assinatura HMAC SHA256 e normalização de webhook.

## 6. Negative Tests
- Teste de rejeição de soma de moedas distintas (`AOA` + `USD` disparando exceção).
- Teste de rejeição de transação de ledger desbalanceada (débitos $\neq$ créditos gerando erro `LEDGER IMBALANCE`).
- Teste de rejeição de transição inválida de pedidos (ex.: `DRAFT` direto para `PAID` ou `CANCELLED` para `PAID`).
- Teste de rejeição de transição ilegal de saques (`REQUESTED` direto para `PAID`).
- Teste de rejeição de webhook com assinatura HMAC fraudulenta (`verifyWebhook` retornando `false`).
- Teste de rejeição de criação de referência ProxyPay com moeda não suportada (`USD`).

## 7. Security Tests
- Prevenção de escalada de privilégios: Testado que usuários sem papel de super-admin não podem atribuir roles elevadas a terceiros nem a si mesmos.
- Prevenção de execução acidental no navegador: Testado que `getServerEnv()` bloqueia execução quando chamado no contexto de janela (`typeof window !== 'undefined'`).
- Validação HMAC constante contra ataques de tempo (*timing attacks*) via `crypto.timingSafeEqual`.

## 8. Failures Found
- Detecção inicial de múltiplos lockfiles na raiz do usuário pelo Next.js gerando warning durante o build.
- Linter reportando necessidade de parâmetros ignorados com prefixo `_` no ESLint.

## 9. Fixes
- Configurado `outputFileTracingRoot` explicitamente no `next.config.ts`.
- Ajustada a regra `@typescript-eslint/no-unused-vars` no `eslint.config.mjs` com `{ "argsIgnorePattern": "^_" }`.

## 10. Acceptance Criteria
- [x] Repositório limpo e estruturado com TypeScript strict.
- [x] Scripts obrigatórios presentes e funcionais: `dev`, `lint`, `typecheck`, `test`, `test:integration`, `build`.
- [x] Invariantes contábeis INV-005 e INV-006 codificados e testados.
- [x] Schemas canônicos com 34 entidades e migrações RLS criados.
- [x] Pipeline de CI no GitHub Actions configurado.
- [x] Toda a documentação mandatória da Fase 0 concluída.

## 11. Evidence
- `npm run typecheck`: Exit code 0.
- `npm run test`: Exit code 0, 4 test files passed, 17 tests passed.
- `npm run test:integration`: Exit code 0, 1 test file passed, 4 tests passed.
- `npm run lint`: Exit code 0, "No ESLint warnings or errors".
- `npm run build`: Exit code 0, "Compiled successfully", páginas estáticas geradas.

## 12. Remaining Debt
Nenhum débito técnico para a Fase 0. O ambiente está 100% estabilizado para o início da Phase 1 (Auth).

## 13. Status
`PHASE_0_STATUS=PASSED`
