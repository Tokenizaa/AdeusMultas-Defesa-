# Fase 8 — Notifications / Audit

## Objetivo

Remover estado operacional em memória das notificações e auditoria e garantir persistência definitiva em Supabase, mantendo as rotas servidas pelo Cloudflare Worker.

## Implementação

### Notifications

`cloudflare/routes/notifications.ts`

- `POST /api/notifications/subscribe` persiste em `notification_subscriptions`.
- `POST /api/notifications/unsubscribe` remove somente a inscrição do usuário autenticado.
- `GET /api/notifications/history` lê histórico persistido de `notifications`.
- `POST /api/notifications/mark-read` persiste `read_at`.
- `POST /api/notifications/send-test` grava notificação em `notifications`.
- `GET /api/notifications/vapid-key` expõe somente configuração pública disponível.

Não existe `Map` ou armazenamento efêmero para subscriptions/notificações.

### Audit

`cloudflare/routes/audit.ts`

- leitura administrativa de `audit_logs`;
- `recordAuditLog()` grava diretamente em Supabase;
- falha de auditoria não derruba a operação principal;
- autenticação administrativa preservada.

## Banco de dados

Projeto Supabase de produção: `llmxnpgjpxcvyrqjkfwb`.

- RLS ativo em `notifications`;
- RLS ativo em `notification_subscriptions`;
- RLS ativo em `audit_logs`;
- índices únicos para subscriptions por `(user_id, endpoint)` e `(user_id, fcm_token)`.

## Testes e gate

`cloudflare/routes/notifications.test.ts` cobre 5 cenários de persistência e leitura.

Gate confirmado pelo workflow Cloudflare informado na execução da Fase 8:

1. dependências instaladas;
2. `bunx vitest run cloudflare/routes/notifications.test.ts` — **5/5**;
3. Vectorize `adeusmulta-knowledge` disponível — **768 dimensões / cosine**;
4. build — **sucesso**;
5. deploy Cloudflare Worker — **sucesso**.

Validação local posterior também confirmou o índice Vectorize e os 5 testes.

## Vercel

As rotas implementadas nesta fase não dependem de `proxyToVercel` nem de fallback para Vercel.

O legado Vercel continua congelado para as fases posteriores e só será removido quando a busca de consumidores e os gates finais autorizarem.

## Estado

**CONCLUÍDA.**
