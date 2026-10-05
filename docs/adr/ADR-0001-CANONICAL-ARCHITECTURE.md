# ADR-0001: ARQUITETURA CANÓNICA E STACK TECNOLÓGICA V1

## Status
APROVADO (ACCEPTED)

## Contexto
O HOT-M exige uma arquitetura transacional, auditável e segura, com separação estrita entre responsabilidades públicas e lógica financeira confidencial. A plataforma deve processar produtos digitais, cursos, afiliações e pagamentos locais em Angola (ProxyPay Multicaixa) e internacionais com conformidade estrita e sem complexidade prematura desnecessária.

## Decisão
1. **Frontend & Server Framework:** Next.js 15 com App Router e TypeScript estrito. Utilização de Server Functions e Route Handlers dedicados para regras sensíveis.
2. **Banco de Dados & Autenticação:** Supabase (PostgreSQL 15+). PostgreSQL atua como fonte única da verdade (Single Source of Truth), com RLS ativo em 100% das tabelas.
3. **Gateway Inicial:** ProxyPay para Angola (referências Multicaixa) encapsulado por uma interface genérica `PaymentProvider`.
4. **Comunicação Transacional:** Resend via API server-side.
5. **Simplicidade de Infraestrutura:** Eliminação de Redis externo, Kafka, VPS ou microsserviços na V1 (Seção 12).

## Consequências
- A lógica de negócio e regras financeiras residem exclusivamente no servidor.
- O bundle do navegador permanece leve e seguro.
- Manutenção e observabilidade simplificadas com garantia de transações ACID no PostgreSQL.
