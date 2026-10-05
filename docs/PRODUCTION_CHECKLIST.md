# CHECKLIST DE PRONTIDÃO PARA PRODUÇÃO (PRODUCTION GATE) — HOT-M

Conforme Seção 74 do Prompt Mestre, a flag global:
`HOT-M_READY_FOR_PRODUCTION=true`
somente pode ser declarada quando todos os itens deste checklist estiverem satisfeitos.

## Checklist Obrigatório

- [ ] Todas as fases críticas (Phase 0 até Phase 30) concluídas com status `PASSED`.
- [ ] Pipeline de CI/CD verde no GitHub Actions para `main` sem skips.
- [ ] Testes E2E (E2E-001 a E2E-006) executados com sucesso em ambiente Staging.
- [ ] Testes de concorrência e race-conditions de saldo e saques validados.
- [ ] Testes de segurança (OWASP Top 10, IDOR, HMAC, RLS bypass) validados com zero falhas.
- [ ] Políticas RLS ativas e testadas em todas as 34 tabelas do schema PostgreSQL.
- [ ] Homologação de pagamento real no sandbox do ProxyPay executada e comprovada.
- [ ] Envio e entrega de emails transacionais validados via Resend.
- [ ] Rotinas de backup automatizadas e teste de restore executado com sucesso em Staging.
- [ ] Reconciliação contábil automática ativa com alertas configurados.
- [ ] Monitoramento de erros e exceções (Sentry) configurado em Staging e Produção.
- [ ] Nenhuma credencial privada ou service role exposta no bundle client do Next.js.
- [ ] Auditoria completa de logs com actor, before, after, reason e request_id.

Status Atual:
`HOT-M_READY_FOR_PRODUCTION=false` (Fase 0 Foundation PASSED; aguardando implementação faseada das próximas etapas).
