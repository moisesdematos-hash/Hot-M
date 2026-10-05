# MOTOR DE PROCESSAMENTO DE WEBHOOKS — HOT-M

## 1. Princípios de Segurança e Resiliência
- **Idempotência Estrita (INV-004):** Cada evento de gateway possui um identificador unívoco gravado em `payment_provider_events`. Requisições duplicadas (retries da rede ou do gateway) são registradas como `DUPLICATE` e retornam `HTTP 200` imediatamente sem reexecutar efeitos colaterais.
- **Validação Criptográfica:** Payloads não autenticados via HMAC SHA256 são rejeitados com `HTTP 401 Unauthorized`.
- **Processamento Assíncrono / Transacional:** A transição do pedido para `PAID`, a emissão das entradas do ledger e a criação dos direitos de acesso (`entitlements`) ocorrem em uma única transação atômica de banco de dados.

## 2. Diagrama de Fluxo de Ingestão
```mermaid
sequenceDiagram
    participant Gateway as Provedor (ex: ProxyPay)
    participant Endpoint as /api/v1/webhooks/proxypay
    participant DB as PostgreSQL (Supabase)
    participant Ledger as Double-Entry Ledger Engine

    Gateway->>Endpoint: POST /api/v1/webhooks/proxypay (com HMAC Signature)
    Endpoint->>Endpoint: Validar HMAC timingSafeEqual()
    alt Assinatura Inválida
        Endpoint-->>Gateway: HTTP 401 Unauthorized
    else Assinatura Válida
        Endpoint->>DB: INSERT INTO payment_provider_events ON CONFLICT DO NOTHING
        alt Evento já existente (Duplicado)
            Endpoint-->>Gateway: HTTP 200 OK (Idempotente)
        else Novo Evento
            Endpoint->>DB: Iniciar Transação Atômica
            Endpoint->>DB: Validar Moeda e Valor com Order
            Endpoint->>DB: UPDATE orders SET status = 'PAID'
            Endpoint->>Ledger: Gerar lançamentos de débito e crédito balanceados
            Endpoint->>DB: INSERT INTO entitlements (acesso ao produto)
            Endpoint->>DB: INSERT INTO audit_logs
            Endpoint->>DB: Commit Transação
            Endpoint-->>Gateway: HTTP 200 OK
        end
    end
```
