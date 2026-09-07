# FASE 8 — CONSOLIDATED PRODUCTION HARDENING

Commit funcional anterior: `55c051758003ef5d78a876f1631a34b93d28ea3e`

## Correções consolidadas

- `user_profiles` usa `user_id` como chave canônica.
- PIX e cartão rejeitam identidade de pagador ausente/inválida antes do gateway.
- Removidos fallbacks sintéticos de nome/email/CPF do pagador.
- Vercel usa exatamente um hop confiável para `trust proxy`; fora de Vercel permanece `false`.
- Diagnósticos/histórico administrativos restantes do Meta exigem autenticação de admin.
- Marketing mutável já é protegido centralmente por `authenticateToken + requireAdmin`.

## Testes

A suíte CI/CD do commit funcional anterior não foi disparada automaticamente pelo commit interno do GitHub Actions. Este commit documental existe exclusivamente para disparar a suíte normal sobre o código funcional já consolidado.

Gates esperados:

- `npm run test:unit`
- `npx tsc --noEmit`
- `npm run build`

Nenhuma migration Supabase foi criada.
