# MATRIZ DE SEGURANÇA ROW LEVEL SECURITY (RLS) — HOT-M

## 1. Princípio da Matriz
Todas as tabelas do PostgreSQL possuem Row Level Security ativado (`ENABLE ROW LEVEL SECURITY`). O acesso anônimo é restrito apenas à visualização pública de produtos publicados. Nenhuma tabela financeira ou de auditoria permite mutação direta por clientes comuns.

## 2. Matriz de Autorização por Papel e Operação

| Tabela | Anonymous | Buyer | Creator | Affiliate | Finance | Admin / Super |
|---|---|---|---|---|---|---|
| `products` | SELECT (se PUBLISHED) | SELECT (se PUBLISHED) | SELECT / INSERT / UPDATE (próprios) | SELECT (se PUBLISHED) | SELECT | ALL |
| `offers` | SELECT (se ativo) | SELECT (se ativo) | SELECT / INSERT / UPDATE (próprios) | SELECT (se ativo) | SELECT | ALL |
| `prices` | SELECT (se ativo) | SELECT (se ativo) | SELECT / INSERT / UPDATE (próprios) | SELECT (se ativo) | SELECT | ALL |
| `orders` | NONE | SELECT (próprios) | SELECT (seus produtos) | SELECT (atribuídos) | SELECT | ALL |
| `order_items` | NONE | SELECT (próprios) | SELECT (seus produtos) | NONE | SELECT | ALL |
| `payment_attempts`| NONE | SELECT (próprios) | NONE | NONE | SELECT | ALL |
| `payment_events` | NONE | NONE | NONE | NONE | SELECT | ALL |
| `entitlements` | NONE | SELECT (próprios) | NONE | NONE | SELECT | ALL |
| `ledger_accounts` | NONE | NONE | SELECT (própria) | SELECT (própria) | SELECT | ALL |
| `ledger_entries` | NONE | NONE | SELECT (próprios) | SELECT (próprios) | SELECT | ALL |
| `withdrawals` | NONE | NONE | SELECT / INSERT (próprio) | SELECT / INSERT (próprio) | ALL | ALL |
| `audit_logs` | NONE | NONE | NONE | NONE | SELECT | ALL |

## 3. Prevenção de Falhas Críticas
- É terminantemente proibido desativar RLS para solucionar bugs de autorização.
- Toda modificação no livro-razão financeiro é intermediada por funções do banco com `SECURITY DEFINER` e roles verificadas.
