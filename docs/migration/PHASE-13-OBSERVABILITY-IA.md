# Fase 13 — Observabilidade / Métricas de IA no Cloudflare

Data: 2026-09-15

## Objetivo

Substituir as métricas fabricadas de IA (NVIDIA/9Router, uptake/P95/erro inventados) por observabilidade real baseada em execução registrada no Supabase, sem introduzir fallback para runtime legado.

## Implementado

- Instrumentação real em `cloudflare/routes/ai.ts`:
  - `analyze-infraction` e `generate-defense` registram `ai_execution_logs` a cada execução (fire-and-forget, não bloqueia resposta).
  - Campos registrados: `operation`, `status` (`ok`/`error`), `latency_ms`, `error_message`, `provider` (`cloudflare-workers-ai`), `model`.
- Endpoint real `GET /api/admin/ai/metrics` em `cloudflare/routes/admin.ts`:
  - Agrega `ai_execution_logs` das últimas 24h.
  - Retorna `totalCalls`, `errorRatePercent`, `avgLatencyMs`, `p50/p95/p99LatencyMs` e `byOperation` — sem nenhum valor fabricado.
  - Sem dados → métricas zero reais (não placeholders).
- `/api/admin/ai/overview` agora marca `historicalMetrics: true` e aponta `metricsEndpoint: /api/admin/ai/metrics`.

## Fonte de verdade

- Tabela `ai_execution_logs` no Supabase (schema já existente; zero linhas até primeira execução real).

## Gate autoritativo

1. Log vazio → `totalCalls: 0`, `errorRatePercent: 0`, percentis `0`.
2. Logs reais → agregação correta de percentis, média e taxa de erro.
3. Resposta de observabilidade **não contém** `nvidia` nem `9router`.
4. `cloudflare/routes/admin.ai-metrics.test.ts` é a suíte autoritativa.
5. GitHub Actions executa a suíte e o deploy Cloudflare antes de fechar o gate.

## Confirmação de segurança (Supabase)

Projeto: `llmxnpgjpxcvyrqjkfwb`. O advisor de segurança reporta **RLS desabilitado** em `messaging_contacts`, `messaging_conversations` e `messaging_messages` (exposição total ao anon/authenticated). Remediação sugerida:

```sql
ALTER TABLE "public"."messaging_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messaging_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messaging_messages" ENABLE ROW LEVEL SECURITY;
```

Aplicar via migration com políticas adequadas antes de considerar a segurança das tabelas de mensagens fechada.