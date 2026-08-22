# PRODUCTION FIX & MAINTENANCE PLAN
## Projeto: DefesAi / Adeus Multa

### 1. Plano de Monitoramento Contínuo
1. **Verificação de Healthcheck**:
   - Endpoint: `GET /api/health` e `GET /api/monitoring/health`
   - Frequência recomendada: a cada 60 segundos por sondas externas de disponibilidade.
2. **Ciclo de Marketing**:
   - O worker `marketingOrchestrator` executa a cada 5 minutos por padrão.
   - Ajustes de intervalo podem ser feitos através de `POST /api/marketing/cycle-tick` ou configurações administrativas.
3. **Backup e Exportação de Casos**:
   - A trilha de auditoria e casos cadastrados podem ser exportados via painel de administração (`/admin/cases` e `/admin/audit`).
