# PLANO DE RESPOSTA A INCIDENTES DE SEGURANÇA E FINANCEIRO — HOT-M

## 1. Classificação de Severidade

- **SEV-1 (Catastrófico):** Inconsistência no ledger financeiro, quebra de RLS com vazamento de dados de usuários, duplicidade confirmada de saques ou execução de pagamentos sem ordem correspondente.
- **SEV-2 (Alto):** Falha no recebimento de webhooks do ProxyPay por mais de 15 minutos, gateway de email inacessível para envio de credenciais.
- **SEV-3 (Médio):** Lentidão no painel de relatórios, atraso em outbox events.
- **SEV-4 (Baixo):** Erros visuais ou problemas cosméticos na interface.

## 2. Procedimento de Contenção (SEV-1)
1. **Pausa Imediata de Saques:** Acionar chave de corte no `platform_settings` (`withdrawals_enabled = false`) no banco de dados.
2. **Isolamento de Credenciais:** Se houver suspeita de vazamento de credenciais, rotacionar imediatamente `SUPABASE_SERVICE_ROLE_KEY` e tokens de gateways.
3. **Análise de Trilha de Auditoria:** Filtrar `audit_logs` e `payment_provider_events` com base no `request_id` anômalo.
4. **Reconciliação e Correção:** Identificar assimetrias contábeis e aplicar lançamentos de reversão explícitos e auditados no livro-razão. Nunca alterar registros passados do ledger diretamente.
