# Fase 8 — Notifications / Audit

## Objetivo

Remover estado operacional em memória das notificações e auditoria e garantir persistência definitiva em Supabase, mantendo as rotas servidas pelo Cloudflare Worker.

## Implementação

### Notifications

`cloudflare/routes/notifications.ts`

- `POST /api/notifications/subscribe`
  - persiste endpoint/token em `notification_subscriptions`
  - usa upsert por usuário + endpoint ou usuário + FCM token
- `POST /api/notifications/unsubscribe`
  - remove apenas a inscrição pertencente ao usuário autenticado
- `GET /api/notifications/history`
  - lê histórico persistido de `notifications`
- `POST /api/notifications/mark-read`
  - persiste `read_at` em `notifications`
- `POST /api/notifications/send-test`
  - grava notificação de teste em `notifications`
- `GET /api/notifications/vapid-key`
  - somente expõe a configuração pública quando disponível

Não existe `Map` ou armazenamento efêmero para subscriptions/notificações.

### Audit

`cloudflare/routes/audit.ts`

- leitura administrativa de `audit_logs`
- `recordAuditLog()` grava eventos diretamente em Supabase
- falha de auditoria não derruba a operação principal; é registrada no log do Worker
- autenticação administrativa preservada nas rotas de consulta

## Banco de dados

Projeto Supabase de produção: `llmxnpgjpxcvyrqjkfwb`.

Verificado durante a execução:

- RLS ativo em `notifications`
- RLS ativo em `notification_subscriptions`
- RLS ativo em `audit_logs`
- índices únicos existentes para subscriptions por `(user_id, endpoint)` e `(user_id, fcm_token)`

A implementação foi alinhada ao schema real antes dos testes.

## Testes

`cloudflare/routes/notifications.test.ts` cobre:

1. persistência de subscription;
2. leitura do histórico persistido;
3. atualização de `read_at`;
4. persistência de audit log;
5. leitura administrativa dos audit logs.

O workflow `.github/workflows/cloudflare-deploy.yml` executa esse teste antes do deploy Cloudflare.

## Gate

A Fase 8 só será marcada como concluída após o workflow Cloudflare comprovar, no GitHub Actions:

1. instalação das dependências;
2. `bunx vitest run cloudflare/routes/notifications.test.ts` com sucesso;
3. build/deploy do Worker com sucesso.

Depois do deploy, deve ser feita uma verificação runtime segura dos endpoints, sem criar ou alterar dados de usuários reais desnecessariamente.

## Vercel

As rotas implementadas nesta fase não dependem de `proxyToVercel` nem de fallback para Vercel.

O legado Vercel continua congelado para as fases posteriores e só será removido quando a busca de consumidores e os gates finais autorizarem.

## Estado

**RUNTIME CONCLUÍDO — GATE CI/DEPLOY PENDENTE.**
