# HOT-M — PLATAFORMA GLOBAL DE PRODUTOS DIGITAIS E AFILIADOS

HOT-M é um sistema transacional de comércio digital e infoprodutos projetado com integridade financeira estrita, livro-razão de dupla entrada (double-entry ledger) imutável, segurança zero-trust e controle de acesso baseado em funções (RBAC).

## 🚀 Arquitetura Tecnológica
- **Frontend & Server Engine:** Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS.
- **Validação & Schemas:** Zod.
- **Banco de Dados & Autenticação:** Supabase (PostgreSQL 15+, RLS em todas as 34 tabelas).
- **Testes:** Vitest (unitários e integração).
- **Pagamentos:** ProxyPay (Angola - Referência Multicaixa / Bancária).
- **Comunicação Transacional:** Resend.

## 🛠️ Comandos de Desenvolvimento
```bash
# Instalação das dependências
npm install

# Execução em ambiente de desenvolvimento
npm run dev

# Análise estática de código (ESLint)
npm run lint

# Verificação de tipos TypeScript
npm run typecheck

# Execução dos testes unitários
npm run test

# Execução dos testes de integração
npm run test:integration

# Build de produção do Next.js
npm run build
```

## 🔒 Princípios de Segurança e Integridade Financeira
- **Livro-Razão Imutável:** Lançamentos contábeis append-only; débitos rigorosamente iguais a créditos (INV-005, INV-006).
- **Sem Ponto Flutuante:** Cálculos em unidades inteiras menores (*minor units*).
- **Zero Segredos no Cliente:** Variáveis privadas nunca são expostas ao navegador (INV-014).
- **Idempotência Garantida:** Webhooks com validação HMAC SHA256 e deduplicação de eventos.

## 📚 Documentação do Sistema
- [Arquitetura Geral](docs/ARCHITECTURE.md)
- [Modelo do Banco de Dados](docs/DATABASE.md)
- [Livro-Razão Contábil (Ledger)](docs/LEDGER.md)
- [Pagamentos & Abstração de Gateway](docs/PAYMENTS.md)
- [Integração ProxyPay](docs/PROXYPAY.md)
- [Matriz RLS](docs/RLS.md)
- [Diretrizes de Segurança](docs/SECURITY.md)
- [Protocolo de Testes](docs/TESTING.md)
- [Variáveis de Ambiente](docs/ENVIRONMENT_VARIABLES.md)
- [Relatório da Fase 0](docs/phases/PHASE_00.md)
