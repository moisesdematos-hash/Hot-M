# MODELO DE DADOS E DICIONÁRIO DO BANCO — HOT-M

## 1. Visão Geral (Seção 15)
O banco de dados do HOT-M adota PostgreSQL 15+ hospedado no Supabase como a fonte única da verdade (Single Source of Truth). O schema é composto por 34 entidades canônicas estruturadas com integridade referencial estrita (`ON DELETE RESTRICT` em tabelas financeiras/pedidos).

## 2. Entidades Canônicas e Funções

1. `roles`: Catálogo de papéis do sistema (`BUYER`, `CREATOR`, `AFFILIATE`, `SUPPORT`, `COMPLIANCE`, `FINANCE`, `ADMIN`, `SUPER_ADMIN`).
2. `user_profiles`: Extensão do `auth.users` com perfil, país, nome e contato.
3. `user_roles`: Tabela associativa de privilégios (`user_id`, `role_id`), protegida por RLS.
4. `kyc_cases`: Submissão de identificação oficial (BI de Angola, Passaporte) e selfies com histórico de auditoria.
5. `products`: Produtos digitais (`DIGITAL_DOWNLOAD`, `COURSE`) e controle de status (`DRAFT`, `PUBLISHED`, `SUSPENDED`).
6. `offers`: Ofertas comerciais associadas a um produto.
7. `prices`: Preços em unidades inteiras menores (`amount_minor`) com moeda (`AOA`, `USD`, `EUR`).
8. `orders`: Pedidos de compra com snapshot financeiro imutável de moeda e total.
9. `order_items`: Itens individuais do pedido com preço congelado no ato da compra.
10. `payment_attempts`: Tentativas de pagamento registradas antes de interagir com o gateway.
11. `payment_provider_events`: Log imutável de webhooks recebidos com constraint única para garantia de idempotência.
12. `entitlements`: Direitos de acesso ativo do comprador a arquivos e aulas do produto.
13. `ledger_accounts`: Contas financeiras vinculadas a usuários ou sistema.
14. `ledger_transactions`: Cabeçalho de transações financeiras (Venda, Reembolso, Saque).
15. `ledger_entries`: Lançamentos de débito e crédito balanceados em partidas dobradas.
16. `withdrawal_methods`: Contas bancárias verificadas (IBAN Angola) para recebimento de saques.
17. `withdrawals`: Solicitações e processamento de saques com máquina de estados determinística.
18. `refund_requests`: Solicitações de estorno feitas pelo comprador.
19. `refunds`: Execução de estornos com reversão contábil e de entitlements.
20. `affiliate_programs`: Configurações de afiliação e percentual de comissão por produto.
21. `affiliate_links`: Links únicos de referência por afiliado.
22. `affiliate_attributions`: Vínculo imutável de comissão congelado no momento da criação do pedido.
23. `affiliate_commissions`: Registros de comissão a serem liberados no ledger.
24. `product_partners` & `revenue_shares`: Divisões de coprodução com percentuais imutáveis por transação.
25. `courses`, `modules`, `lessons`: Estrutura hierárquica do ambiente de aprendizagem (LMS).
26. `student_progress`: Acompanhamento de progresso de aulas concluídas.
27. `audit_logs`: Trilha auditável com `actor`, `before_state`, `after_state` e `request_id`.
28. `notifications`: Mensagens no painel e alertas para o usuário.
29. `support_tickets`: Sistema de atendimento ao cliente com estados persistidos.
30. `outbox_events`: Tabela transactional outbox para despacho de webhooks externos assíncronos.
31. `platform_settings`: Parâmetros operacionais globais configuráveis.

## 3. Estratégia de Migrations
As migrações SQL são versionadas por timestamp dentro de `supabase/migrations/` e aplicadas sequencialmente.
