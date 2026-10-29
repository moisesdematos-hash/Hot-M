# MAPA DE DEPENDÊNCIAS E MATRIZ DE RISCOS — HOT-M

Este documento detalha o fluxo de entrada, processamento, persistência, permissões, integrações externas e classificação de risco para cada subsistema da plataforma.

---

## 1. Classificação de Severidade de Risco
- **P0 (Crítico):** Perda de dados financeiros, violação de segurança/acesso indevido a infoprodutos, falhas no pagamento ou no webhook, razão contábil em desequilíbrio, indisponibilidade geral.
- **P1 (Alto):** Falha em fluxo essencial (login/recuperação, emissão de quote, entrega de downloads, solicitação de saque, cadastro de produto).
- **P2 (Médio):** Erros de validação de formulário, falhas em relatórios/gráficos, lentidão em páginas não críticas, erros de lint que bloqueiam build.
- **P3 (Baixo):** Avisos visuais, pequenas inconsistências de layout, textos sem localização, otimização de imagem.

---

## 2. Matriz de Subsistemas, Dependências e Riscos

| ID | Funcionalidade | Entrada / Gatilho | Processamento & Regras | Tabelas / Dados | Saída / Efeito | Permissões | Integrações | Risco |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **SYS-01** | **Cotação de Preço (Pricing)** | `POST /api/v1/pricing/quote` (offerId, coupon, bumps) | `PricingEngine`: Busca preço no banco, aplica cupons com regras de teto, gera quote efêmera de 15 min | `prices`, `coupons`, `pricing_quotes` | Quote UUID assinada com expiração | Pública | Nenhuma | **P0** |
| **SYS-02** | **Criação de Pedido** | `POST /api/v1/orders` (quoteId, buyerId) | `OrderService`: Valida quote ativa, confere produto `PUBLISHED`, cria pedido atômico `PENDING_PAYMENT` | `orders`, `order_items`, `pricing_quotes` | Pedido UUID com status PENDING | `BUYER` | Nenhuma | **P0** |
| **SYS-03** | **Iniciação de Pagamento** | `POST /api/v1/payments/initiate` (orderId) | `PaymentService`: Cria referência Multicaixa de 9 dígitos e prazo | `payment_attempts`, `orders` | Referência ATM e dados Express | Comprador do pedido | ProxyPay API | **P0** |
| **SYS-04** | **Recepção de Webhook ProxyPay** | `POST /api/v1/webhooks/proxypay` (payload, x-signature) | `WebhookEngine`: Valida HMAC SHA-256 (`timingSafeEqual`), valida idempotência, transição `PAID`, razão contábil e acesso | `payment_provider_events`, `orders`, `ledger_*`, `entitlements`, `outbox_events` | 200 OK (`IDEMPOTENCY_OK` ou `PROCESSED`) | Externa (HMAC assinada) | ProxyPay Gateway | **P0** |
| **SYS-05** | **Razão Contábil (Ledger)** | Evento `order:paid`, `refund:approved`, `withdraw:approved` | `LedgerService`: Cria lançamentos duplos balanceados ($\sum D = \sum C$). Nunca salva números mutáveis soltos | `ledger_accounts`, `ledger_transactions`, `ledger_entries` | Registro financeiro imutável | Sistema / Transacional | Nenhuma | **P0** |
| **SYS-06** | **Liberação & Entrega (LMS/Download)** | Consulta `/library` ou `GET /api/v1/entitlements/[id]/download` | `EntitlementService`: Verifica `is_active` e gera link assinado com 15 min de expiração | `entitlements`, `products` | Player LMS ou URL temporária de download | Comprador titular do acesso | Supabase Storage (`digital_assets`) | **P0** |
| **SYS-07** | **Afiliação & Atribuição** | Clique em `/r/[code]` e compra vinculada | `AffiliateService`: Registra clique, impede auto-afiliação (`INV-013`), credita comissão | `affiliate_programs`, `affiliate_links`, `affiliate_attributions`, `affiliate_commissions` | Redirecionamento e comissão ao afiliado | Afiliado / Comprador | Nenhuma | **P1** |
| **SYS-08** | **Co-produção** | Venda de produto com parceiros configurados | Divide receita do criador entre os parceiros contratuais | `product_partners`, `revenue_shares` | Créditos balanceados no razão | Produtor / Co-produtor | Nenhuma | **P1** |
| **SYS-09** | **Autenticação & Sessões** | `/auth/login`, `/auth/signup`, Google OAuth | `AuthService`: Emissão de JWT Supabase, criação de perfil inicial, atribuição de role padrão | `user_profiles`, `user_roles`, `roles` | Cookies de sessão HTTP-Only | Pública | Supabase Auth / Google OAuth | **P1** |
| **SYS-10** | **Saques Bancários (IBAN Angola)** | `POST /api/v1/finance/withdrawals` | `WithdrawalService`: Verifica saldo disponível no razão, bloqueia valor, exige aprovação de admin | `withdrawals`, `withdrawal_methods`, `ledger_*` | Saque PENDING / Aprovado | Produtor / Afiliado | Banco / Transferência | **P1** |
| **SYS-11** | **Reembolsos & Reversão** | `POST /api/v1/orders/[id]/refund` | `RefundService`: Registra solicitação no prazo de garantia, estorna valor no razão, revoga `entitlement` | `refund_requests`, `refunds`, `entitlements`, `ledger_*` | Reembolso e cancelamento de acesso | Comprador / Admin | ProxyPay / Transferência | **P1** |
| **SYS-12** | **Central de Suporte & Tickets** | `POST /api/v1/support/tickets` | `SupportService`: Gerencia tickets, mensagens entre comprador e produtor, mediação de disputas | `support_tickets`, `support_ticket_messages` | Thread de suporte em tempo real | Participantes do ticket | Nenhuma | **P2** |
| **SYS-13** | **Notificações & Outbox Worker** | `POST /api/v1/cron/outbox-worker` | `NotificationService` / `OutboxService`: Processa fila de eventos transacionais e envia emails | `notifications`, `outbox_events` | Notificações in-app e emails | Sistema / Admin | Resend API | **P2** |
| **SYS-14** | **Customizador de Checkout & Bumps** | Editor visual do checkout em `/dashboard/products/[id]` | Permite customizar cores, banners, cronômetro e vincular order bumps | `checkout_settings`, `order_bumps`, `product_testimonials` | Checkout personalizado | Produtor dono do produto | Nenhuma | **P2** |
| **SYS-15** | **Build & Pipeline CI/CD** | `npm run build` | Compilação Next.js, minificação e execução de linters | `.next/` | Artefato executável de produção | Desenvolvedor / CI | GitHub Actions | **P2** |
