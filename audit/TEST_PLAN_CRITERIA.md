# PLANO DE TESTES, CRITÉRIOS DE ACEITAÇÃO & SLOS — HOT-M

---

## 1. Critérios de Aceitação e Gates de Qualidade

1. **Gate Funcional (F12):**
   - 100% dos testes unitários e de integração devem passar (`PASS`).
   - `npx tsc --noEmit` deve rodar sem nenhum erro de tipo.
   - `npm run lint` deve rodar com 0 erros (avisos aceitáveis apenas se estritamente justificados e sem risco).
   - `npm run build` deve compilar com sucesso gerando todas as 29 rotas de páginas e 63 rotas de API.
   - Bloqueadores P0 e P1 devem ser estritamente zero (`P0 = 0`, `P1 = 0`).

2. **Gate de Integridade Financeira:**
   - Invariante do Razão Duplo (INV-006): Para qualquer transação registrada, $\sum \text{Débitos} \equiv \sum \text{Créditos}$.
   - Precisão Monetária: Sem uso de números `float` para montantes de dinheiro; uso estrito de `BigInt` em centavos.
   - Idempotência de Pagamentos (INV-004): Reenvio de webhooks do ProxyPay deve retornar `IDEMPOTENCY_OK` e não duplicar lançamentos.

3. **Gate de Segurança & Acesso:**
   - Prevenção IDOR: Nenhum usuário pode baixar assets de produtos que não comprou ou acessar dados de pedidos alheios.
   - Proibição de Auto-Afiliação (INV-013): O criador de um produto é impedido de afiliar-se a si mesmo.
   - Assinatura Criptográfica: Qualquer webhook recebido sem cabeçalho `x-signature` válido ou com assinatura adulterada é rejeitado com HTTP 401.

---

## 2. Matriz de Casos de Teste Obrigatórios

| Categoria | Cenário de Teste | Critério de Sucesso |
| :--- | :--- | :--- |
| **Positivo** | Compra completa de produto via Multicaixa Reference | Quote criada $\rightarrow$ Pedido `PENDING_PAYMENT` $\rightarrow$ Webhook válido $\rightarrow$ Pedido `PAID` $\rightarrow$ Entitlement ativo $\rightarrow$ Razão balanceado. |
| **Positivo** | Login com credenciais válidas e Google OAuth | Emissão de token JWT e sessão em cookie HTTP-Only. |
| **Negativo** | Webhook com payload alterado (valor adulterado) | Rejeição por falha na validação do HMAC SHA-256. |
| **Negativo** | Manipulação de preço no checkout pelo navegador | Preço é descartado e calculado unicamente pelo servidor no banco de dados. |
| **Negativo** | Tentativa de download sem acesso ativo (sem compra) | Rejeição imediata com erro de autorização. |
| **Negativo** | Tentativa de produtor gerar link de afiliado do seu próprio produto | Bloqueio com erro `SELF_AFFILIATION_PROHIBITED`. |
| **Concorrência** | Saques simultâneos com saldo insuficiente | Garantia de que saldo não fica negativo; apenas um saque é debitado. |
| **Idempotência** | Disparo de 5 webhooks idênticos concorrentes | 1º processa com sucesso; 2º a 5º retornam `IDEMPOTENCY_OK` sem duplicar saldo. |
| **Regressão** | Reexecução das 28 suítes unitárias e 22 suítes de integração | 159/159 testes com status `PASS`. |

---

## 3. SLOs e Limites Mensuráveis Recomendados

- **Tempo de Resposta de API (p95):** < 500 ms em endpoints transacionais (quotes, checkout, pedidos).
- **Tempo de Execução de Webhook (p99):** < 800 ms para validação criptográfica e persistência atômica.
- **Disponibilidade da Vitrine e Checkout:** 99.9% de uptime com suporte PWA offline para navegação resiliente.
- **Taxa de Erros em Checkout:** < 0.1% de falhas não relacionadas a saldo bancário do usuário.
