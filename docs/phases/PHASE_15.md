# RELATÓRIO DE FASE — PHASE 15: ORDER BUMPS & FUNNEL OPTIMIZATION ENGINE

## 1. Objective
Implementar a infraestrutura completa de otimização de funil, ofertas adicionais de checkout (*Order Bumps*) e ofertas exclusivas de 1 clique pós-compra (*Post-Purchase 1-Click Upsells / OTO*) conforme a Seção 75 e as regras financeiras invariantes:
- **INV-001: Server-computed prices** (cotação segura recalculada no servidor com base em ofertas oficiais de bump).
- **INV-007: Entitlement access guarantee** (concessão atômica e multi-produto de direitos de acesso na confirmação do pagamento para o produto principal e todos os order bumps agregados).
- **INV-012: Frozen order totals** (congelamento irreversível do montante acumulado e dos itens no pedido).
- Seleção e deseleção interativa no checkout (`/checkout/[quoteId]`) com recálculo em tempo real da cotação.
- Direcionamento transparente para tela de Upsell pós-compra (`/checkout/upsell/[orderId]`) com suporte a vídeo persuasivo, porcentagem de desconto e geração instantânea de pedido.
- Painel do produtor para configuração de funil (`/dashboard/products/[id]/funnel`) com proteção estrita contra IDOR.

## 2. Implementation
- **Migração do Banco de Dados (`supabase/migrations/20260304000000_bumps_and_funnels.sql`):**
  - Tabela `order_bumps`: vincula produto principal, produto de bump, oferta de bump, chamada (headline) e descrição, com RLS habilitado.
  - Tabela `post_purchase_upsells`: vincula produto principal, produto de upsell, oferta de upsell, headline, vídeo de vendas e desconto percentual, com RLS habilitado.
- **Serviço de Funis (`src/modules/funnels/funnel-service.ts`):**
  - **Gestão de Order Bumps:**
    - `getOrderBumpsForProduct`: consulta bumps ativos com dados do produto e precificação em moeda vigente.
    - `createOrderBump`: valida propriedade do produto principal e do produto adicional contra IDOR (`FORBIDDEN`).
    - `deleteOrderBump`: exclusão com defesa IDOR.
  - **Gestão de Upsells Pós-Compra:**
    - `getUpsellForProduct`: consulta upsell ativo calculando preço original vs preço promocional com desconto.
    - `createUpsell`: configuração da oferta exclusiva com validações de porcentagem e IDOR.
- **Evolução do Motor de Preços (`src/modules/pricing/pricing-engine.ts`):**
  - `PricingQuote`: ampliado com `productId` e `orderBumpOfferIds`.
  - `getValidQuote`: reconstrução determinística da lista de ofertas de bump e resolução de moeda a partir dos registros congelados em `pricing_quotes`.
- **Evolução do Serviço de Pedidos (`src/modules/orders/order-service.ts`):**
  - No método `createOrder`, iteração sobre os bumps contidos na cotação para geração de múltiplos `order_items` (produto principal + bumps selecionados).
  - Permite que o motor de Webhooks (`WebhookEngine`) conceda entitlements para todos os produtos comprados de forma atômica no recebimento do evento `PAID`.
- **Rotas de API HTTP REST:**
  - `GET /api/v1/products/[id]/bumps`: Listagem de bumps ativos para o checkout.
  - `POST /api/v1/products/[id]/bumps`: Criação de order bump pelo criador.
  - `DELETE /api/v1/products/[id]/bumps?bumpId=...`: Exclusão de order bump.
  - `GET /api/v1/products/[id]/upsells`: Consulta do upsell pós-compra.
  - `POST /api/v1/products/[id]/upsells`: Configuração do upsell pós-compra.
- **Interfaces do Usuário (UI):**
  - **Checkout com Bumps Dinâmicos (`src/app/checkout/[quoteId]/page.tsx`):**
    - Renderização de caixa de destaque "⚡ Oferta Única" com checkbox para cada bump ativo.
    - Recálculo dinâmico e em tempo real do total oficial a pagar chamando `POST /api/v1/pricing/quote`.
    - Ao confirmar pedido, redireciona para a oferta de upsell se configurada, ou direto para a tela de pagamento.
  - **Página de Upsell Pós-Compra (`src/app/checkout/upsell/[orderId]/page.tsx`):**
    - Oferta exclusiva OTO com player de vídeo, destaque de desconto (ex: 50% OFF) e botão "SIM! ADICIONAR ESTA OFERTA AO MEU PEDIDO".
    - Link de declínio "Não, obrigado. Quero apenas prosseguir com meu pedido original" direcionando para `/pay/[orderId]`.
  - **Painel do Produtor (`src/app/dashboard/products/[id]/funnel/page.tsx`):**
    - Abas "Order Bumps de Checkout" e "Upsell de 1 Clique Pós-Compra".
    - Seleção de produtos do catálogo, headline, precificação e gerenciamento de funis.
  - **Integração no Catálogo (`src/app/dashboard/products/page.tsx`):**
    - Botão "⚡ Funil & Bumps" inserido em todos os cards de produtos.

## 3. Files Changed / Created
- `supabase/migrations/20260304000000_bumps_and_funnels.sql`
- `src/modules/funnels/funnel-service.ts`
- `src/modules/pricing/pricing-engine.ts`
- `src/modules/orders/order-service.ts`
- `src/app/api/v1/products/[id]/bumps/route.ts`
- `src/app/api/v1/products/[id]/upsells/route.ts`
- `src/app/checkout/[quoteId]/page.tsx`
- `src/app/checkout/upsell/[orderId]/page.tsx`
- `src/app/dashboard/products/[id]/funnel/page.tsx`
- `src/app/dashboard/products/page.tsx`
- `src/tests/unit/funnel-service.test.ts`
- `src/tests/integration/funnel-lifecycle.test.ts`
- `docs/phases/PHASE_15.md`

## 4. Tests
- **Unit Tests:** 76 testes aprovados em 20 arquivos (`npm run test`).
- **Integration Tests:** 33 testes aprovados em 16 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros no TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 avisos ou erros (`next lint`).
- **Build:** 42 rotas estáticas e dinâmicas compiladas com sucesso (`next build`).

## 5. Negative & Invariant Tests
- **Defesa IDOR em Bumps e Upsells:** Usuário não-proprietário tentando configurar bumps ou upsells é sumariamente rejeitado com `FORBIDDEN`.
- **Integridade da Cotação com Bump (INV-001):** Cálculo no servidor somando preço base + order bumps sem possibilidade de manipulação pelo cliente.
- **Congelamento de Múltiplos Itens (INV-012):** Pedido gerado com múltiplos `order_items` preservando os preços e produtos selecionados.
- **Concessão Multi-Entitlement (INV-007):** Pagamento confirmado via webhook ProxyPay gerando direitos de acesso na tabela `entitlements` tanto para o produto principal quanto para os produtos adquiridos via bump.

## 6. Acceptance Criteria
- [x] Migração SQL de tabelas de funil (`order_bumps`, `post_purchase_upsells`) com RLS.
- [x] Serviço de funis com controle de acesso e cálculo monetário (`FunnelService`).
- [x] Inclusão de múltiplos itens de pedido na criação de ordens (`OrderService`).
- [x] Checkout atualizado com seleção interativa de bumps e recálculo de cotação.
- [x] Página de Upsell pós-compra OTO com vídeo, desconto e compra de 1 clique.
- [x] Interface de gestão de funis no dashboard do produtor.
- [x] 100% dos testes unitários e de integração verdes.
- [x] Typecheck e build de produção Next.js 15 validados.
