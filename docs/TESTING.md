# PROTOCOLO E ESTRATÉGIA DE TESTES — HOT-M

## 1. Princípio de Zero Falsos Positivos
Nenhuma funcionalidade é declarada concluída sem testes automatizados que comprovem seu comportamento sob condições normais, excepcionais e sob ataque malicioso.

## 2. Tipos de Testes Obrigatórios
1. **Testes Unitários (`src/tests/unit/`):**
   - Precisão de valores monetários (sem erros de ponto flutuante).
   - Invariantes de dupla entrada do ledger ($\sum \text{Débitos} = \sum \text{Créditos}$).
   - Máquinas de estados finitos (proibição de saltos ilegais).
   - Regras de controle de acesso RBAC e princípio do privilégio mínimo.
2. **Testes de Integração (`src/tests/integration/`):**
   - Assinatura criptográfica HMAC SHA256 de webhooks.
   - Normalização de payloads de gateways externos.
   - Idempotência de chamadas duplicadas (100 chamadas = 1 efeito).
3. **Testes Negativos e de Concorrência:**
   - Tentativa de saque simultâneo de saldo que exceda o disponível.
   - Tentativa de confirmação de pedido pelo frontend.
   - Tentativa de manipulação de preço no cliente.
   - Submissão de webhook com assinatura HMAC inválida.

## 3. Comandos de Execução
```bash
# Executar todos os testes unitários
npm run test

# Executar testes de integração
npm run test:integration

# Executar suíte completa
npm run test:all

# Verificação estrita de tipagem
npm run typecheck

# Análise estática de código
npm run lint
```
