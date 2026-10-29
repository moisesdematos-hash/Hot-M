# SYSTEM MAP — HOT-M DIGITAL COMMERCE PLATFORM (ANGOLA)

## 1. Stack Tecnológica
- **Linguagem & Runtime:** Node.js (>= 20.x), TypeScript 5.8 (Modo Estrito).
- **Framework Frontend:** Next.js 15.2.1 / 15.5.27 (App Router), React 19, Tailwind CSS.
- **Gerenciamento de Estado & Cache:** TanStack React Query 5.66, Hooks nativos React.
- **PWA & Offline:** Service Worker nativo (`public/sw.js`), Web App Manifest (`public/manifest.webmanifest`), `PwaProvider`.
- **Assistente Local:** Motor de Conhecimento Autônomo Offline (`src/modules/knowledge/hotm-knowledge-base.ts`), zero dependência externa para suporte operacional.
- **Banco de Dados & Auth:** Supabase PostgreSQL 15/16 com Row-Level Security (RLS), Supabase SSR (`@supabase/ssr`), Supabase Storage (Buckets: `digital_assets` privado, `product_covers` público).
- **Fintech & Contabilidade:** Razão contábil duplo por partidas dobradas (*Double-Entry Ledger*) em `src/core/fintech/ledger.ts`, aritmética de precisão exata com inteiros `BigInt` em centavos (`Money.ts`).
- **Gateways de Pagamento:** ProxyPay Adapter (`src/modules/payments/providers/proxypay.ts`) para Multicaixa Express e Referências Multicaixa (9 dígitos) em Kwanzas (AOA).
- **Validação de Schemas:** Zod 3.24.2.
- **Testes Automatizados:** Vitest 3.2.7 (28 suítes unitárias, 22 suítes de integração, 159 testes).
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`).

---

## 2. Mapa Completo de Páginas Frontend (29 Rotas)

| Rota | Tipo | Finalidade / Perfil de Usuário |
| :--- | :--- | :--- |
| `/` | Pública | Landing page institucional e vitrine inicial. |
| `/auth/login` | Pública | Login com email/senha e Google OAuth via Supabase. |
| `/auth/signup` | Pública | Cadastro de novos produtores, afiliados e compradores. |
| `/auth/recover` | Pública | Recuperação e redefinição de palavra-passe. |
| `/marketplace` | Pública | Catálogo de infoprodutos com busca, filtros por categoria e ordenação. |
| `/hotplace` | Pública | Área de produtos em alta e tendências de vendas. |
| `/checkout/[quoteId]` | Pública/Autenticada | Checkout seguro com quote efêmera gerada no servidor (15 min). |
| `/checkout/upsell/[orderId]` | Protegida (Comprador) | Oferta de pós-venda (*one-click upsell*) após checkout inicial. |
| `/pay/[orderId]` | Pública/Comprador | Tela de pagamento com referência Multicaixa de 9 dígitos e instruções ATM/Express. |
| `/orders/[id]` | Protegida (Comprador) | Resumo do pedido e status da transação. |
| `/library` | Protegida (Comprador) | LMS / Área de Membros — todos os infoprodutos comprados com acesso ativo. |
| `/library/courses/[productId]`| Protegida (Comprador) | Player de aulas, módulos e progresso do aluno. |
| `/offline` | Pública (PWA) | Tela de fallback offline em caso de desconexão. |
| `/r/[code]` | Pública | Redirecionamento de link de afiliado com registro de cookie de atribuição. |
| `/dashboard` | Protegida (Produtor) | Dashboard principal com KPIs de vendas, faturamento e gráficos. |
| `/dashboard/products` | Protegida (Produtor) | Listagem, gestão e status dos produtos cadastrados. |
| `/dashboard/products/new` | Protegida (Produtor) | Criação de novos infoprodutos (cursos ou downloads digitais). |
| `/dashboard/products/[id]/checkout-customizer` | Protegida (Produtor) | Editor visual do checkout do produto. |
| `/dashboard/products/[id]/coproduction` | Protegida (Produtor) | Gestão de co-produtores e divisão percentual de receitas. |
| `/dashboard/products/[id]/course` | Protegida (Produtor) | Gestão de grade curricular do curso (módulos e aulas). |
| `/dashboard/products/[id]/funnel` | Protegida (Produtor) | Configuração de order bumps e upsells pós-venda. |
| `/dashboard/affiliates` | Protegida (Afiliado) | Mercado de afiliação, links ativos e comissões ganhas. |
| `/dashboard/finance` | Protegida (Produtor/Afiliado)| Extrato do razão duplo, saldo disponível e pendente. |
| `/dashboard/finance/withdraw` | Protegida (Produtor/Afiliado)| Solicitação de saque bancário para IBAN angolano. |
| `/dashboard/finance/exchange-rates` | Protegida (Produtor/Afiliado)| Consulta de taxas de conversão de moedas (AOA, USD, EUR). |
| `/dashboard/analytics` | Protegida (Produtor) | Métricas avançadas de conversão, ticket médio e funil. |
| `/dashboard/notifications` | Protegida (Todos) | Central de notificações in-app e alertas do sistema. |
| `/dashboard/support` | Protegida (Todos) | Listagem de tickets de suporte e atendimento. |
| `/dashboard/support/[id]` | Protegida (Todos) | Chat e mensagens do ticket de suporte. |
| `/dashboard/admin` | Protegida (ADMIN) | Painel restrito para superusuários e administradores da plataforma. |

---

## 3. Mapa Completo de Endpoints Backend / APIs (63 Rotas)

### Autenticação & Sessão (`/api/v1/auth/*`)
- `POST /api/v1/auth/signup`: Registro de novo usuário.
- `POST /api/v1/auth/login`: Autenticação e emissão de sessão.
- `POST /api/v1/auth/logout`: Revogação de sessão.
- `POST /api/v1/auth/recover`: Envio de email de recuperação.
- `GET  /api/v1/auth/session`: Obtenção da sessão do usuário autenticado.
- `GET  /api/v1/auth/callback`: Callback de redirecionamento OAuth (Google).

### Catálogo, Produtos & Ofertas (`/api/v1/products/*`, `/api/v1/marketplace`)
- `GET  /api/v1/marketplace`: Listagem de produtos públicos com filtros e busca.
- `GET  /api/v1/products`: Listagem de produtos do criador logado.
- `POST /api/v1/products`: Cadastro de novo infoproduto.
- `GET  /api/v1/products/[id]`: Detalhes de um produto específico.
- `PUT  /api/v1/products/[id]`: Edição de produto.
- `PATCH /api/v1/products/[id]/status`: Publicação, pausa ou arquivamento de produto.
- `GET/POST /api/v1/products/[id]/bumps`: Gestão de Order Bumps do produto.
- `GET/POST /api/v1/products/[id]/upsells`: Gestão de Post-Purchase Upsells.
- `GET/POST /api/v1/products/[id]/checkout-customizer`: Customização visual do checkout.
- `GET/POST /api/v1/products/[id]/coproduction`: Gestão de parceiros e divisão de receitas.
- `GET/POST /api/v1/products/[id]/testimonials`: Gestão de depoimentos do produto.
- `GET/POST /api/v1/pricing/offers`: Gestão de ofertas e preços por moeda.
- `POST /api/v1/pricing/quote`: Geração no servidor de cotação de preço oficial com expiração de 15 min.
- `GET  /api/v1/pricing/quote/[id]`: Obtenção e validação de cotação existente.

### Pedidos & Pagamentos (`/api/v1/orders/*`, `/api/v1/payments/*`, `/api/v1/webhooks/*`)
- `POST /api/v1/orders`: Criação de pedido a partir de uma quote válida (status `PENDING_PAYMENT`).
- `GET  /api/v1/orders`: Pedidos do usuário.
- `GET  /api/v1/orders/[id]`: Detalhes do pedido.
- `POST /api/v1/orders/[id]/refund`: Abertura de solicitação de reembolso.
- `POST /api/v1/payments/initiate`: Geração de pagamento Multicaixa Express / Referência ATM via ProxyPay.
- `GET  /api/v1/payments/[orderId]`: Consulta de status da tentativa de pagamento.
- `POST /api/v1/webhooks/proxypay`: Webhook receptor de confirmação de pagamento com validação de HMAC SHA-256 e idempotência estrita.

### Entitlements & Downloads (`/api/v1/entitlements/*`)
- `GET  /api/v1/entitlements`: Listagem de acessos ativos do comprador.
- `GET  /api/v1/entitlements/[id]/download`: Geração de link assinado temporário (15 min) para download de asset protegido.
- `POST /api/v1/entitlements/[id]/revoke`: Revogação de acesso (em caso de reembolso ou estorno).

### LMS & Cursos (`/api/v1/lms/*`)
- `GET/POST /api/v1/lms/courses/[productId]`: Grade do curso.
- `GET/POST /api/v1/lms/courses/[productId]/modules`: Módulos do curso.
- `GET/PUT/DELETE /api/v1/lms/modules/[id]`: Gestão de módulo individual.
- `GET/POST /api/v1/lms/modules/[id]/lessons`: Aulas do módulo.
- `GET/PUT/DELETE /api/v1/lms/lessons/[id]`: Gestão de aula individual.
- `POST /api/v1/lms/lessons/[id]/progress`: Registro de aula concluída pelo aluno.

### Afiliados & Co-produção (`/api/v1/affiliates/*`, `/api/v1/coproduction/*`, `/r/*`)
- `GET  /api/v1/affiliates/programs`: Programas de afiliados abertos no marketplace.
- `POST /api/v1/affiliates/programs/[id]/join`: Adesão ao programa com proibição de auto-afiliação.
- `GET  /api/v1/affiliates/links`: Links de afiliado do usuário logado.
- `GET  /api/v1/coproduction/my-partnerships`: Parcerias ativas de co-produção do usuário.
- `GET  /r/[code]`: Roteador de clique de afiliado que grava cookie de 30 a 90 dias e redireciona para a página de vendas.

### Finanças, Razão Contábil, Reembolsos & Saques (`/api/v1/finance/*`, `/api/v1/fx/*`)
- `GET  /api/v1/finance/balance`: Saldo calculado em tempo real diretamente do razão duplo (`ledger_entries`).
- `GET  /api/v1/finance/statement`: Extrato detalhado de transações do razão contábil.
- `POST /api/v1/finance/reconcile`: Auditoria e reconciliação contábil atômica.
- `GET/POST /api/v1/finance/withdrawal-methods`: Cadastro de contas bancárias / IBAN angolano.
- `GET/POST /api/v1/finance/withdrawals`: Solicitações de saque.
- `POST /api/v1/finance/withdrawals/[id]/approve`: Aprovação de saque (Administrador).
- `POST /api/v1/finance/withdrawals/[id]/reject`: Rejeição de saque com devolução de saldo ao razão.
- `GET  /api/v1/finance/refunds`: Listagem de solicitações de reembolso.
- `POST /api/v1/finance/refunds/[id]/approve`: Aprovação de reembolso e reversão contábil.
- `POST /api/v1/finance/refunds/[id]/reject`: Rejeição de reembolso com justificativa.
- `GET  /api/v1/fx/rates`: Taxas cambiais oficiais registradas no banco.
- `POST /api/v1/fx/convert`: Conversão financeira precisa com escala $10^8$.

### Suporte, Notificações & Outbox (`/api/v1/support/*`, `/api/v1/notifications/*`, `/api/v1/cron/*`)
- `GET/POST /api/v1/support/tickets`: Listagem e abertura de chamados de suporte.
- `GET  /api/v1/support/tickets/[id]`: Detalhes do ticket.
- `GET/POST /api/v1/support/tickets/[id]/messages`: Envio de mensagens e respostas.
- `PATCH /api/v1/support/tickets/[id]/status`: Atualização de status do ticket (Aberto, Resolvido, etc.).
- `GET  /api/v1/notifications`: Listagem de notificações com suporte a filtros e contagem de não lidas.
- `PATCH /api/v1/notifications/[id]/read`: Marcar notificação como lida.
- `POST /api/v1/notifications/mark-all-read`: Marcar todas as notificações como lidas.
- `POST /api/v1/cron/outbox-worker`: Worker assíncrono para despacho de eventos da outbox (emails e webhooks).

### Administração da Plataforma (`/api/v1/admin/*`)
- `GET  /api/v1/admin/analytics`: Métricas globais da plataforma (GMV, receita de taxas, contagem de pedidos).
- `GET  /api/v1/admin/users`: Listagem de todos os usuários da plataforma com roles.
- `PATCH /api/v1/admin/users/[id]/role`: Atualização de role de usuário (`ADMIN`, `CREATOR`, etc.).
- `GET/PATCH /api/v1/admin/settings`: Parâmetros globais do sistema (taxas de plataforma, limites de saque).

---

## 4. Banco de Dados — 42 Tabelas Consolidadas

1. `roles`: Papéis do sistema (`BUYER`, `CREATOR`, `AFFILIATE`, `ADMIN`, `SUPER_ADMIN`).
2. `user_profiles`: Dados do perfil público, email, telefone, avatar e status KYC.
3. `user_roles`: Associação n-para-n de usuários com roles.
4. `kyc_cases`: Documentos de identificação (BI angolano, passaporte, NIF) e status de aprovação.
5. `products`: Produtos digitais (ebooks, cursos, softwares).
6. `offers`: Ofertas associadas ao produto.
7. `prices`: Preços por moeda (AOA, USD, EUR, BRL) com valor inteiro em centavos.
8. `orders`: Pedidos com máquina de estados rigorosa (`CREATED`, `PENDING_PAYMENT`, `PAID`, `CANCELLED`, `REFUNDED`).
9. `order_items`: Itens do pedido (produtos e order bumps).
10. `payment_attempts`: Tentativas de pagamento com referência ProxyPay, expiracão e status.
11. `payment_provider_events`: Registro de webhooks recebidos com chave de idempotência estrita.
12. `entitlements`: Direitos de acesso e licenciamento do comprador.
13. `ledger_accounts`: Contas contábeis (`USER_AVAILABLE`, `USER_PENDING`, `PLATFORM_REVENUE`, `PAYMENT_CLEARING`).
14. `ledger_transactions`: Transações do razão duplo balanceadas ($\Delta = 0$).
15. `ledger_entries`: Lançamentos individuais de débito e crédito.
16. `withdrawal_methods`: Contas bancárias cadastradas com IBAN angolano.
17. `withdrawals`: Solicitações de saques bancários.
18. `refund_requests`: Solicitações de reembolso feitas por compradores.
19. `refunds`: Reembolsos processados com reversão contábil.
20. `affiliate_programs`: Programas de afiliação configurados pelos criadores.
21. `affiliate_links`: Links de indicação únicos dos afiliados.
22. `affiliate_attributions`: Rastreamento de cliques e cookies de indicação.
23. `affiliate_commissions`: Comissões apuradas por venda.
24. `product_partners`: Co-produtores convidados.
25. `revenue_shares`: Divisões percentuais de receita entre co-produtores.
26. `courses`: Estrutura do curso LMS vinculado ao produto.
27. `modules`: Módulos do curso.
28. `lessons`: Aulas do curso com links de vídeo e material de apoio.
29. `student_progress`: Aulas concluídas pelo aluno.
30. `audit_logs`: Logs de auditoria atômicos e imutáveis com ator, ação, antes/depois e requestId.
31. `notifications`: Notificações in-app para os usuários.
32. `support_tickets`: Chamados de suporte e disputas.
33. `outbox_events`: Fila de eventos transacionais (Transactional Outbox Pattern).
34. `platform_settings`: Taxa de plataforma padrão (9%), taxa fixa por transação e prazos de garantia.
35. `coupons`: Cupons de desconto percentuais ou nominais com regras de validade.
36. `pricing_quotes`: Cotações de preço efêmeras e assinadas pelo servidor.
37. `order_bumps`: Ofertas adicionais no checkout (*order bump*).
38. `post_purchase_upsells`: Ofertas adicionais após o pagamento (*one-click upsell*).
39. `checkout_settings`: Estilos, cores, depoimentos e temporizador de urgência do checkout.
40. `product_testimonials`: Provas sociais e avaliações de clientes exibidas no checkout.
41. `exchange_rates`: Cotações de câmbio vigentes para conversão multimoeda.
42. `support_ticket_messages`: Mensagens trocadas dentro dos chamados de suporte.

---

## 5. Matriz de Funcionalidades & Status de Implementação

| Funcionalidade | Frontend | Backend / APIs | Banco / RLS | Testes Automatizados | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Autenticação Email/Senha | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Autenticação Google OAuth | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Catálogo & Marketplace | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Precificação Segura (Quotes) | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Checkout Dinâmico & Bumps | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Multicaixa ProxyPay (Ref & Express)| ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Webhooks HMAC & Idempotência | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Entrega & Acesso LMS | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Downloads Protegidos (Signed URLs)| ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Razão Duplo (Double-Entry Ledger)| ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Afiliação & Prevenção Auto-Afiliado| ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Co-produção & Divisão de Receitas| ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Saques Bancários (IBAN Angola) | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Reembolsos & Reversão de Acesso| ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Suporte & Tickets | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| PWA & Assistente Offline | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Painel Admin & Métricas Globais | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
| Outbox Worker Assíncrono | ✅ | ✅ | ✅ | ✅ | **100% OPERACIONAL** |
