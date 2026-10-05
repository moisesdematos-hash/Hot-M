# ESPECIFICAÇÃO DE APIS — HOT-M

## 1. Padrões de Design
- Versionamento obrigatório via prefixo `/api/v1/`.
- Todos os endpoints aceitam e respondem com payloads estruturados JSON.
- Validação estrita de entradas via schemas Zod.
- Proteção contra vazamento de informações: stack traces e exceções internas de banco nunca são retornados diretamente ao cliente.

## 2. Endpoints Centrais (V1)

### 2.1 Autenticação e Perfil
- `POST /api/v1/auth/signup`: Criação de conta com verificação de email.
- `POST /api/v1/auth/login`: Autenticação e emissão de sessão segura (JWT HTTP-Only).
- `GET /api/v1/user/profile`: Consulta de perfil do usuário autenticado.

### 2.2 Produtos e Ofertas
- `GET /api/v1/products`: Catálogo público de produtos com paginação.
- `GET /api/v1/products/:slug`: Detalhes de um produto publicado.
- `POST /api/v1/products`: Criação de produto (exclusivo para `CREATOR`).
- `POST /api/v1/offers`: Criação de oferta e preço.

### 2.3 Pedidos e Pagamentos
- `POST /api/v1/checkout/quote`: Cálculo e congelamento de cotação com `quote_id` efêmero.
- `POST /api/v1/orders`: Criação de pedido vinculada a um `quote_id`.
- `POST /api/v1/orders/:id/pay`: Inicialização de tentativa de pagamento via `PaymentProvider`.
- `POST /api/v1/webhooks/proxypay`: Receptor de webhooks oficiais da ProxyPay Angola.

### 2.4 Acessos e Entitlements
- `GET /api/v1/my-purchases`: Lista de produtos adquiridos pelo comprador.
- `POST /api/v1/entitlements/:id/download-link`: Emissão de URL temporária assinada para download.

### 2.5 Financeiro e Saques
- `GET /api/v1/finance/balance`: Consulta de saldo contábil disponível e pendente.
- `POST /api/v1/finance/withdrawals`: Solicitação atômica de saque.
