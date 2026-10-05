# ESTRATÉGIA DE BACKUP E RESTORE — HOT-M

## 1. Princípio Central (Seção 53)
Um backup só é considerado válido se o procedimento de **RESTORE** tiver sido testado e comprovado com sucesso.

## 2. Metas de Continuidade de Negócio
- **RPO (Recovery Point Objective):** Menor que 1 hora para transações financeiras e ordens (WAL archiving e snapshots automáticos do Supabase Pro).
- **RTO (Recovery Time Objective):** Menor que 2 horas para restauração completa de infraestrutura em caso de desastre catastrófico.

## 3. Rotina de Backup
1. **Snapshots Diários do PostgreSQL:** Gerenciados pelo Supabase com retenção de 30 dias.
2. **Point-In-Time-Recovery (PITR):** Habilitado em produção para retroceder transações a segundos específicos diante de falha operacional grave.
3. **Backup Lógico Exportável:** Scripts automáticos de exportação de schema e dados sensíveis criptografados em armazenamento secundário seguro.

## 4. Teste de Recuperação em Staging
A cada ciclo de release maior:
1. Restaurar o último snapshot de banco em uma instância de staging isolada.
2. Executar suíte de reconciliação financeira para validar que $\sum \text{Débitos} = \sum \text{Créditos}$ permanece 100% íntegro pós-restauração.
