# Fase 10 — Marketing / Meta no Cloudflare

Data: 2026-09-15

## Objetivo

Migrar a superfície de marketing do Worker para execução nativa em Cloudflare + Supabase, mantendo a publicação externa exclusivamente pelo adaptador Meta Graph API.

## Implementado

- `/api/marketing/*` é atendido diretamente por `cloudflare/routes/marketing.ts`.
- O Worker não possui mais proxy Vercel para `/api/marketing/*`.
- CRUD de `editorial_content` usa Supabase.
- Upload de mídia usa Supabase Storage.
- Publicação Facebook/Instagram usa `MetaPublisherAdapter`.
- `/api/marketing/status` não expõe mais o rótulo legado `nvidia-only`.
- Suíte autoritativa: `cloudflare/routes/marketing.test.ts`.

## Gate autoritativo

1. CRUD de conteúdo executa no Worker.
2. Publicação delega somente ao adaptador Meta.
3. Status identifica `cloudflare-meta`.
4. Nenhuma rota `/api/marketing/*` usa `proxyToVercel`.
5. Testes específicos da Fase 10 passam.

## Dependência externa

A publicação real depende de credenciais válidas do Meta Graph API (`META_ACCESS_TOKEN`, `META_PAGE_ID` e/ou `IG_USER_ID`) configuradas como secrets do ambiente Cloudflare. A ausência dessas credenciais não deve reintroduzir fallback para Vercel.

## Regra de testes

Testes legados que representem o runtime Vercel/NVIDIA/Express não serão corrigidos apenas para obter verde. Devem ser removidos quando obsoletos ou substituídos por testes que protejam o runtime Cloudflare atual.

## Próxima fase

Após o gate desta fase, seguir para Fase 11 — WhatsApp/Comunicação. O proxy Vercel deve permanecer congelado apenas para famílias ainda não migradas.
