# RELATÓRIO DE FASE — PHASE 12: AFFILIATE ENGINE (AFILIADOS & COMISSIONAMENTO)

## 1. Objective
Implementar o motor de afiliados e comissionamento determinístico da plataforma HOT-M conforme o invariante **INV-013: Deterministic affiliate attribution**, fornecendo vitrine de afiliação aberta (Marketplace), geração de links exclusivos com códigos encurtados (`/r/[code]`), atribuição por cookie seguro HttpOnly com validade configurável (padrão de 30 dias), congelamento de atribuição no ato da criação do pedido, proteção contra auto-afiliação do produtor e painel de controle de métricas e conversões para os afiliados.

## 2. Implementation
- **Serviço de Afiliados (`src/modules/affiliates/affiliate-service.ts`):**
  - **Configuração de Programas (`configureProgram`):**
    - Criadores definem comissão percentual (0% a 100%) e tempo de cookie (dias).
    - Defesa contra IDOR: apenas o dono legítimo do produto pode gerenciar seu programa.
  - **Adesão a Programas (`joinProgram`):**
    - Defesa contra auto-afiliação: produtores são estritamente proibidos de se afiliar aos próprios produtos para obter descontos ilegítimos (`SELF_AFFILIATION_PROHIBITED`).
    - Geração de código único e determinístico (`aff_[random]`) associado à tabela `affiliate_links`.
  - **Resolução de Referral (`resolveReferralCode`):**
    - Validação de link e ativação do programa associado.
    - Retorno de metadados para emissão de cookie de atribuição e redirecionamento de tráfego.
  - **Desempenho e Rastreamento (`getUserAffiliateLinks`):**
    - Agregação de cliques, conversões geradas e comissões provisionadas diretamente no livro-razão.
  - **Congelamento de Atribuição no Pedido (**INV-013**):**
    - Vinculação irreversível do `affiliate_id` e `link_id` na criação do pedido em `affiliate_attributions` e `orders.affiliate_id`.
- **Rota de Redirecionamento e Cookie (`src/app/r/[code]/route.ts`):**
  - Leitura do código e gravação de cookie HttpOnly seguro `hotm_aff` contendo código, afiliado e produto com expiração configurada (ex: 30 dias).
  - Redirecionamento transparente do comprador para a página do produto com parâmetro `?ref=[code]`.
- **Rotas de API HTTP:**
  - `GET /api/v1/affiliates/programs`: Vitrine pública de produtos abertos para afiliação.
  - `POST /api/v1/affiliates/programs`: Configuração de programa pelo criador do produto.
  - `POST /api/v1/affiliates/programs/[id]/join`: Solicitação de afiliação e geração de link.
  - `GET /api/v1/affiliates/links`: Consulta de links e métricas do afiliado autenticado.
- **Painel do Afiliado (`src/app/dashboard/affiliates/page.tsx`):**
  - Alternância entre abas "Meus Links & Desempenho" e "Mercado de Afiliação (Marketplace)".
  - Cards de indicadores: Links ativos, Vendas realizadas e Janela de cookie.
  - Tabela com botão instantâneo "Copiar Link" com feedback de sucesso.
  - Catálogo de produtos com comissão destacada e botão "Afiliar-se Agora".

## 3. Files Changed / Created
- `src/modules/affiliates/affiliate-service.ts`
- `src/app/r/[code]/route.ts`
- `src/app/api/v1/affiliates/programs/route.ts`
- `src/app/api/v1/affiliates/programs/[id]/join/route.ts`
- `src/app/api/v1/affiliates/links/route.ts`
- `src/app/dashboard/affiliates/page.tsx`
- `src/tests/unit/affiliate-service.test.ts`
- `src/tests/integration/affiliate-lifecycle.test.ts`
- `docs/phases/PHASE_12.md`

## 4. Tests
- **Unit Tests:** 64 testes aprovados em 17 arquivos (`npm run test`).
- **Integration Tests:** 30 testes aprovados em 13 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros no TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 avisos ou erros (`next lint`).
- **Build:** 36 rotas estáticas e dinâmicas compiladas com sucesso (`next build`).

## 5. Negative & Invariant Tests
- Tentativa do criador de se afiliar ao seu próprio produto rejeitada com `SELF_AFFILIATION_PROHIBITED`.
- Configuração de comissão fora do intervalo [0, 100]% rejeitada com `INVALID_COMMISSION`.
- Tentativa de configurar programa de produto de terceiro rejeitada com `FORBIDDEN` (IDOR).
- Tentativa de resolver código inexistente ou programa desativado rejeitada com fallback seguro.
- **Teste de Ciclo de Vida (INV-013):** Do clique no link à geração de cookie, congelamento de afiliado no pedido e registro de conversão no painel do parceiro.

## 6. Acceptance Criteria
- [x] Regra **INV-013** (Atribuição determinística e congelada) implementada e validada.
- [x] Proteção ativa contra auto-afiliação do produtor.
- [x] Rota de redirecionamento `/r/[code]` com cookie HttpOnly seguro.
- [x] Vitrine de afiliação aberta e geração sob demanda de links exclusivos.
- [x] Interface do Painel de Afiliados `/dashboard/affiliates` integrada.
- [x] 94 testes automatizados passando 100% verdes. Build Next.js 15 em produção 100% verde.
