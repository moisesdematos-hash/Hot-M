# MOTOR E ABSTRAÇÃO DE PAGAMENTOS — HOT-M

## 1. Visão Geral (Seção 28)
O subsistema de pagamentos do HOT-M desacopla integralmente o fluxo de checkout e pedido dos gateways externos. Nenhum cliente externo tem conhecimento de qual provedor específico processará a requisição final até que a tentativa de pagamento (`payment_attempt`) seja criada no servidor.

## 2. Invariantes Financeiros Estritos
- **INV-001:** O navegador nunca define nem valida o preço final de uma oferta. Todo valor provém do banco de dados via `PricingEngine` server-side.
- **INV-002:** Um pedido (`Order`) em estado `DRAFT` ou `PENDING_PAYMENT` existe obrigatoriamente no banco antes de qualquer chamada a gateway externo.
- **INV-003:** O frontend nunca confirma pagamento (`PAID`). Somente o recebimento e validação criptográfica de um webhook oficial ou job de reconciliação server-side pode transitar um pedido para `PAID`.
- **INV-004:** Webhooks duplicados são estritamente idempotentes. Uma tabela `payment_provider_events` com chave única `(provider, provider_event_id)` impede duplo processamento.

## 3. Fluxo de Vida do Pagamento
```
[Buyer Checkout] 
       │
       ▼
1. Servidor valida cotação e cria Order (PENDING_PAYMENT)
       │
       ▼
2. Servidor invoca PaymentProvider (ex: ProxyPayAdapter)
       │
       ▼
3. Provedor emite instrução (ex: Entidade 00000 + Ref 9 dígitos)
       │
       ▼
4. Servidor persiste payment_attempt e retorna instruções ao Buyer
       │
       ▼
[Buyer efetua pagamento no Multicaixa / Homebanking]
       │
       ▼
5. Webhook recebido pelo HOT-M com assinatura HMAC
       │
       ▼
6. Servidor valida HMAC, confere valor, moeda e pedido
       │
       ▼
7. Transação Atômica: Order -> PAID + Ledger entries + Entitlement
```
