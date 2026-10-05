# DIRETRIZES DE SEGURANÇA E MODELAGEM DE AMEAÇAS — HOT-M

## 1. Princípios Zero Trust
- Nenhum cliente é confiável por padrão.
- Todas as requisições que alteram estado passam por validação criptográfica ou de autenticação de sessão JWT gerada pelo Supabase.
- Chaves privadas (`SUPABASE_SERVICE_ROLE_KEY`, `PROXYPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`) nunca são prefixadas com `NEXT_PUBLIC_` e residem exclusivamente no backend (INV-014).

## 2. Mitigação de Vulnerabilidades OWASP Top 10

### 2.1 IDOR (Insecure Direct Object Reference)
- Todas as consultas a entidades privadas (`orders`, `entitlements`, `withdrawals`, `kyc_cases`) aplicam restrição explícita por `auth.uid() = owner_id` no nível de banco via RLS e nas queries do servidor.

### 2.2 Replay Attacks & Webhook Spoofing
- Invariante INV-004: Todo webhook é verificado com HMAC SHA256 em tempo constante (`timingSafeEqual`).
- Os IDs de evento são persistidos na tabela `payment_provider_events` com chave única `(provider, provider_event_id)`. Se o mesmo webhook for disparado 100 vezes, exatamente 1 processamento ocorrerá.

### 2.3 SSRF (Server-Side Request Forgery)
- Na entrega de outbox webhooks a parceiros (Fase 23), apenas URLs HTTPS de domínio público são permitidas. IPs privados (RFC 1918, 127.0.0.1, 169.254.x.x, etc.) são ativamente bloqueados.

### 2.4 Race Conditions & Concurrency
- Operações de saque (`withdrawals`) e reversão contábil utilizam transações atômicas com `SELECT ... FOR UPDATE` no PostgreSQL para prevenir duplo débito concorrente (INV-009).

### 2.5 Elevação de Privilégios (Privilege Escalation)
- Invariante INV-010: Nenhum usuário comum pode atribuir a si mesmo papéis administrativos (`ADMIN`, `SUPER_ADMIN`, `FINANCE`). Apenas `SUPER_ADMIN` pode conceder roles através de procedures protegidas.
