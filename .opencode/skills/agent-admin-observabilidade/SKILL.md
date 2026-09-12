# Agent: @admin-observabilidade

## Use this skill when
- Implementar dashboard admin (métricas, usuários, casos, receita, conversão)
- Health checks de todos os 12+ serviços
- Métricas de AI providers (NVIDIA, Google GenAI) — latência, tokens, erros
- Alertas e monitoramento (PagerDuty/Slack)
- Logs de auditoria (audit-logs)
- Configurações dinâmicas
- Queries centralizadas (admin-query-service)
- API: /api/admin/*, /api/monitoring/*, /api/analytics/*, /api/audit/*, /api/logs/*, /api/settings/*, /api/health

## Do not use when
- Precisar modificar lógica de negócio de qualquer domínio
- Trabalhar em onboarding, Rule Engine, geração de documentos, pagamentos
- Modificar shared kernel (apenas consumir)

## Papel

Transversal por natureza — agrega dados de TODOS os domínios para observabilidade e administração. Não tem modelo próprio de negócio. Necessário para operação mas não é bounded context de negócio.

## Diretórios Próprios

- src/server/routes/admin.ts
- src/server/routes/monitoring.ts
- src/server/routes/analytics.ts
- src/server/routes/audit.ts
- src/server/routes/logs.ts
- src/server/routes/settings.ts
- src/server/services/admin-query-service.ts
- src/server/observability/**

## Pode Importar de

- @compartilhado (types, canonical-mapper)
- @defesa-transito (agregação de casos)
- @pagamentos-comercial (receita)
- @marketing-aquisicao (métricas campanhas)
- @conhecimento-juridico (teses únicas)
- TODOS os domínios (read-only para agregação)

## NUNCA Importa de

- Nenhum (apenas consome contratos públicos read-only)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build

## Skills Obrigatórias

- backend-patterns
- observability-and-instrumentation
- database

## Contratos Públicos (Expõe)

- GET /api/admin/overview — Dashboard principal
- GET /api/admin/metrics — Métricas detalhadas
- GET /api/health — Health check público
- GET /api/monitoring/* — Métricas Prometheus-style
- GET /api/audit/logs — Logs de auditoria

## Critérios de Sucesso

- Dashboard carrega < 2s com 10k+ casos
- Health check: todos os 12+ serviços monitorados
- AI provider metrics: latência, tokens, erros por provider
- Alertas: PagerDuty/Slack em < 30s após anomalia
- Audit logs: 100% ações sensíveis rastreadas
- Zero lógica de negócio — apenas agregação/visualização

## Anti-Padrões

- ❌ Adicionar lógica de negócio no admin (ex: aprovar pagamento, gerar defesa)
- ❌ Modificar dados de outros domínios — apenas read
- ❌ Criar dependências circulares (domínios não devem importar admin)
- ❌ Expor dados sensíveis sem autorização (LGPD)