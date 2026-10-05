# LIVRO-RAZÃO FINANCEIRO DE DUPLA ENTRADA (DOUBLE-ENTRY LEDGER) — HOT-M

## 1. Fundamentos Contábeis
No HOT-M, nenhum saldo é mantido como um número arbitrário mutável (`UPDATE user_profiles SET balance = balance + 100`).
Em vez disso:
- O saldo oficial é a soma calculada das entradas de débito e crédito no livro-razão imutável (`ledger_entries`).
- Toda transação financeira gera no mínimo duas entradas balanceadas.
- **Invariante INV-006:** $\sum \text{Débitos} \equiv \sum \text{Créditos}$.
- **Invariante INV-005:** As tabelas `ledger_transactions` e `ledger_entries` são append-only.

## 2. Tipos de Contas
- `PAYMENT_CLEARING`: Conta transitória de compensação de pagamentos.
- `PLATFORM_REVENUE`: Conta de comissão/taxa da plataforma HOT-M.
- `CREATOR_BALANCE`: Conta de saldo do produtor do conteúdo.
- `AFFILIATE_BALANCE`: Conta de saldo de afiliados comissionados.
- `COPRODUCER_BALANCE`: Conta de parceiros de coprodução.
- `WITHDRAWAL_CLEARING`: Conta de retenção de saques em processamento.

## 3. Modelo Canônico de Transação de Venda
Exemplo: Venda de 100.000,00 AOA (10000000 minor units):
- Taxa da Plataforma (10%): 10.000,00 AOA
- Comissão de Afiliado (20%): 20.000,00 AOA
- Líquido do Produtor (70%): 70.000,00 AOA

Entradas no Ledger:
1. `PAYMENT_CLEARING` -> **DEBIT** 100.000,00 AOA
2. `PLATFORM_REVENUE` -> **CREDIT** 10.000,00 AOA
3. `AFFILIATE_BALANCE` -> **CREDIT** 20.000,00 AOA
4. `CREATOR_BALANCE` -> **CREDIT** 70.000,00 AOA

$\text{Total Débito} = 100.000,00 = \text{Total Crédito} (10.000,00 + 20.000,00 + 70.000,00)$.

## 4. Reconciliação
Tarefas de reconciliação periódica verificam:
1. Se existem transações com débitos $\neq$ créditos.
2. Se o saldo de qualquer conta no ledger diverge do total de lançamentos.
3. Se pagamentos aprovados no gateway possuem sua respectiva transação de ledger.
