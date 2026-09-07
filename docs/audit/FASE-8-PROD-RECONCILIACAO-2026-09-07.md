# FASE 8 — RECONCILIAÇÃO DE PRODUÇÃO — 2026-09-07

## Objetivo

Investigar os sinais de produção restantes após a correção de source maps e separar:

- problemas corrigíveis com segurança;
- problemas que exigem alteração de código, mas devem ser tratados como tarefas P0/P1 delegadas;
- KNOWLEDGE_GAPs que não devem receber correção especulativa.

## Estado confirmado

- Produção atual: commit `f72f9d88483673459ca2d9e164331f460e977fb0`.
- Vercel deployment atual: `dpl_7CteixcrrkGi6YZ4iaKuhspgS32a`.
- Status CI/Vercel do commit: success.
- Source map: `dist/server.cjs.map` não é mais gerado no build.
- `tsc --noEmit`: 0 erros no baseline auditado.
- `npm run test:unit`: 68 arquivos / 749 testes no baseline auditado.
- `npm run build`: PASS no baseline auditado.

## Achados de produção

### P0 — autorização administrativa

Foram identificados endpoints de Marketing/Meta que executam publicação, geração, diagnóstico ou alteração de estado sem `requireAdmin` explícito.

Delegação: GitHub Issue #2.

### P0 — `user_profiles`

Runtime reportou:

```text
42703: column user_profiles.id does not exist
```

Consulta direta ao schema confirmou que a chave é `user_id` e não existe `id`.

Delegação: GitHub Issue #3.

### P0 — dados fictícios no PIX

`src/server/routes/payments.ts` possui fallback de nome/email/CPF para criação do pagador quando dados reais não são fornecidos.

Isso viola fail-closed: o gateway não deve receber identidade fabricada.

Delegação: GitHub Issue #3.

### P1 — proxy / rate limiting

Produção registra repetidamente:

- `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`;
- `ERR_ERL_FORWARDED_HEADER`.

A topologia de proxy necessária para configurar `trust proxy` corretamente ainda não foi comprovada.

Delegação: GitHub Issue #4.

Não foi aplicada alteração especulativa em `trust proxy`.

### Meta webhook — assinatura inválida

Há 31 ocorrências de assinatura HMAC inválida no período auditado.

O comportamento observado é compatível com requisições externas que não possuem assinatura válida. Não transformar esse sinal em autorização para aceitar payload sem HMAC.

A tarefa P0 é revisar a classificação/logging e garantir que assinatura inválida continue resultando em rejeição sem processamento do payload.

A proteção não deve ser removida nem flexibilizada.

### Pagamentos PIX

Há 10 erros históricos de criação de PIX em uma janela anterior. O código atual já possui validação comercial e gateway ativo. A correção segura identificada é remover os fallbacks fictícios do pagador; investigar o erro específico do gateway depois dessa correção, com logs recentes e sem inventar causa.

## Testes a preparar nas correções delegadas

### Admin / Marketing / Meta

- não autenticado → 401;
- usuário não-admin → 403;
- admin → sucesso;
- webhook externo permanece público quando exigido pelo protocolo;
- OAuth callback permanece público;
- endpoints de diagnóstico administrativo não aceitam token arbitrário sem autorização.

### `user_profiles`

- schema atual usa `user_id`;
- GET `/admin/users` não consulta `id`;
- PUT de role usa `user_id`;
- resposta pode expor `id` apenas como DTO derivado de `user_id`, se a UI exigir.

### PIX

- ausência de `customerName` → 400 sem chamada ao gateway;
- ausência de `customerEmail` → 400 sem chamada ao gateway;
- ausência de `customerCpf` → 400 sem chamada ao gateway;
- dados válidos → chamada normal ao gateway;
- nenhum fallback fictício permitido.

### Proxy / rate limit

Somente após comprovar a cadeia de proxy:

- IPs de usuários distintos geram chaves distintas;
- spoofing de `X-Forwarded-For` não altera a identidade confiável;
- limiter continua funcionando por origem real.

## Escopo

Não alterar nesta reconciliação:

- `trust proxy` sem evidência da topologia;
- RAG;
- catálogo jurídico;
- pagamentos além do fail-closed de dados fictícios;
- Supabase schema;
- arquitetura geral;
- Fase 9.

## Decisão

**FASE 8 — APROVADA COM PENDÊNCIAS DE SEGURANÇA OPERACIONAL.**

As pendências P0/P1 estão registradas nas Issues #2, #3 e #4 para correção cirúrgica e testes adversariais.

Nenhuma tese jurídica ou conclusão de negócio deve ser criada a partir desses achados.
