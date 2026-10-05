# ADR-0002: CONTABILIDADE POR PARTIDAS DOBRADAS (DOUBLE-ENTRY LEDGER)

## Status
APROVADO (ACCEPTED)

## Contexto
Plataformas financeiras que utilizam colunas mutáveis de saldo (ex.: `user.balance += amount`) são vulneráveis a condições de corrida, falhas parciais de atualização, perda de auditoria contábil e erros de arredondamento causados por ponto flutuante IEEE-754.

## Decisão
1. **Unidades Inteiras Menores (*Minor Units*):** Todos os valores monetários são representados e manipulados como inteiros (bigint / cents / centavos), eliminando erros de ponto flutuante.
2. **Livro-Razão Imutável (*Append-Only*):** Saldos nunca são mutados diretamente. O saldo é a soma das entradas em `ledger_entries`.
3. **Equilíbrio Contábil Rigoroso:** Toda transação financeira é composta por débitos e créditos com somatórios estritamente idênticos ($\sum \text{Débitos} = \sum \text{Créditos}$).
4. **Isolamento de Contas:** Contas dedicadas para compensação de pagamentos, receita da plataforma, saldos de criadores, afiliados e retenção de saques.

## Consequências
- Imutabilidade e auditabilidade total de qualquer centavo que circula pela plataforma.
- Capacidade de reconstrução histórica exata do saldo de qualquer usuário a qualquer momento.
- Erros de concorrência e transações parciais são prevenidos pela validação formal do ledger.
