# FASE 9 — Auditoria de Frontend

**Data:** 2026-09-07  
**Base atualizada:** `main` após `5ea930b3daea6e15b3f5c14fb92d65b923d0c2b6`  
**Escopo:** frontend React/TS, autenticação client-side, roteamento, persistência local, fluxos críticos, integração API, acessibilidade, UX/UI e regressão responsiva.  

## Veredito

**STATUS: PARTIAL / HARDENING CONCLUÍDO ATÉ F9-10, F9-11 AINDA BLOQUEADA POR EVIDÊNCIA E2E EXTERNA**

Os achados P0/P1 de segurança frontend foram corrigidos nas subfases F9-01 a F9-08. A acessibilidade recebeu correções e cobertura automatizada. A F9-10 adicionou uma matriz objetiva de guardas UX/UI responsivos e captura visual em relatório Playwright, sem introduzir redesign arbitrário.

A FASE 9 ainda não deve ser marcada como `VERIFIED`: a execução completa de `test:unit`, `lint`, `build` e especialmente da matriz Playwright do commit atual precisa de evidência CI/runtime, e F9-11 continua dependente de credenciais/serviços externos.

## Evidências principais

### F9-01 — P0 — senha persistida em localStorage

**STATUS: VERIFIED / CORRIGIDO**  

O fluxo de cadastro foi removido do modelo de `saveStoredUser(..., password)`. A autenticação depende de Supabase Auth e não de credencial armazenada pelo frontend.

**Correção:** `AuthContext` deixou de persistir senha; o caminho de identidade local não concede autenticação.

### F9-02 — P0/P1 — identidade sintética montada pelo frontend

**STATUS: VERIFIED / CORRIGIDO**  

`src/lib/api/client.ts` e `src/lib/authFetch.ts` foram corrigidos para enviar somente o access token Supabase real quando disponível. Foram removidos `x-user-id`, `x-user-role`, `x-user-email`, `x-user-name` e `Bearer local_*` do caminho de produção.

### F9-03 — P1 — sessão cacheada localmente influencia autorização visual

**STATUS: VERIFIED / CORRIGIDO**  

`AuthContext` passou a derivar `user`/`isAuthenticated` da sessão Supabase. O cache local restante é apenas informativo e não concede autenticação ou privilégio.

### F9-04 — P1 — PII e dados jurídicos completos no localStorage

**STATUS: VERIFIED / CORRIGIDO**  

O wizard deixou de persistir `CaseDocumentData`, `CaseAnalysis`, veículo e demais PII jurídica. A persistência local foi reduzida a metadados mínimos de retomada (`step`, `savedCaseId`, `savedAt`) em `sessionStorage`, com limpeza de legado.

### F9-05 — P1 — AccountVerificationGate consulta cadastro local

**STATUS: VERIFIED / CORRIGIDO**  

`AccountVerificationGate` deixou de usar cadastro local como sistema de identidade. Login/registro dependem de Supabase Auth e de uma sessão real.

### F9-06 — P1 — over-posting e reconciliação fraca no update de case

**STATUS: VERIFIED / CORRIGIDO**  

`App.tsx` passou a enviar DTO mínimo (`defenseDraft`), aguardar a persistência e recarregar a verdade do servidor. Em erro, o estado otimista é revertido e o usuário recebe feedback explícito.

### F9-07 — P1 — chamada de cases ocorre fora de fluxo autenticado

**STATUS: VERIFIED / CORRIGIDO**  

`loadCases()` agora encerra sem request quando não há autenticação; o efeito e os listeners de mudança de cases são condicionados a `isAuthenticated`.

### F9-08 — P2 — parser de query próprio sem tratamento robusto

**STATUS: VERIFIED / CORRIGIDO**  

O parser manual foi substituído por `URLSearchParams`. A cobertura inclui valores contendo `=`, UTF-8, `+`, chaves repetidas, query vazia e percent-encoding malformado.

### F9-09 — P2 — acessibilidade

**STATUS: IMPLEMENTADO / EVIDÊNCIA DE BUILD DISPONÍVEL; EXECUÇÃO AUTOMATIZADA COMPLETA AINDA NÃO CONSOLIDADA**

Foram corrigidos os alvos persistentes dos atalhos de acessibilidade: Alt+1 → conteúdo principal, Alt+2 → acionador do menu, Alt+3 → busca e Alt+4 → rodapé. O rodapé passou a ser focalizável e o menu possui `aria-expanded`/`aria-controls`.

Foi adicionada cobertura Playwright para landmarks, labels e atalhos de teclado. O commit final `56206070ee727e639a8abb89022a8b1bf5891f89` possui deployment Vercel Production `READY`. A execução CI da suíte completa ainda não foi obtida como evidência independente.

### F9-10 — P2 — UX/UI e regressão responsiva

**STATUS: IMPLEMENTADO / VERIFICAÇÃO CI PENDENTE**

Foi criada `tests/visual-ux-regression.spec.ts` no commit `5ea930b3daea6e15b3f5c14fb92d65b923d0c2b6`.

A cobertura objetiva inclui:

- rotas públicas `/`, `/novo-caso`, `/login` e `/knowledge`;
- viewport mobile de 390×844;
- viewport desktop de 1440×900;
- ausência de overflow horizontal em `body` e `documentElement`;
- nenhum controle interativo parcialmente fora do viewport;
- presença dos landmarks `main` e `#rodape`;
- captura PNG de cada cenário anexada ao relatório Playwright;
- tipografia base mínima de 16px;
- line-height base mínima de 1.5;
- contraste mínimo de 4.5:1 para texto/base e primário sobre branco.

A estratégia deliberadamente não cria snapshots PNG versionados via API de conteúdo do GitHub: essa integração aceita arquivos UTF-8 e não fornece uma rota segura para versionar os binários de baseline. Portanto, F9-10 usa guardas geométricos/tipográficos determinísticos + captura visual de evidência. A comparação pixel-a-pixel deve ser habilitada quando houver pipeline de artefatos/baselines apropriado.

### F9-11 — E2E real continua limitado

**STATUS: BLOCKED por evidência externa.**

Há suíte Playwright abrangente, mas a FASE 6 registrou bloqueio de execução completa por dependências externas reais. A existência da suíte não equivale a validação operacional contra produção com credenciais e integrações reais.

## Cobertura consolidada

| Área | Status atual |
|---|---|
| Frontend security | **VERIFIED até F9-05** |
| Frontend authentication | **VERIFIED até F9-05** |
| Frontend authorization UI | **PARTIAL — guards cobertos, E2E real externo pendente** |
| Client → Server boundary | **VERIFIED server-side** |
| Frontend functional flows | **PARTIAL** |
| Onboarding | **PARTIAL — persistência local corrigida; fluxo externo ainda não fechado** |
| Payments UI | **PARTIAL** |
| UX/UI | **IMPLEMENTED — F9-10; CI pendente** |
| Accessibility | **IMPLEMENTED — execução CI pendente** |
| Real browser E2E | **BLOCKED / external** |

## Histórico de execução F9

| Subfase | Resultado | Evidência principal |
|---|---|---|
| F9-01 | VERIFIED / corrigido | `AuthContext` sem persistência de senha |
| F9-02 | VERIFIED / corrigido | `authFetch` + `api.client` sem identidade sintética |
| F9-03 | VERIFIED / corrigido | Supabase session como fonte de `user` |
| F9-04 | VERIFIED / corrigido | wizard metadata-only em `sessionStorage`; `b004242...` |
| F9-05 | VERIFIED / corrigido | `AccountVerificationGate` sem identidade local |
| F9-06 | VERIFIED / corrigido | DTO mínimo + reconciliação server-truth; `998fde...` |
| F9-07 | VERIFIED / corrigido | cases carregados somente com autenticação; `5d568af...` |
| F9-08 | VERIFIED / corrigido | `URLSearchParams` + testes; `6f22fed...` |
| F9-09 | IMPLEMENTADO / Vercel READY | `56206070...` |
| F9-10 | IMPLEMENTADO / CI pendente | `5ea930b3...` + `tests/visual-ux-regression.spec.ts` |
| F9-11 | BLOCKED | dependências externas reais |

## Critério de fechamento da FASE 9

A fase só pode ser `VERIFIED` quando:

- nenhuma senha/credential material for persistida em localStorage;
- nenhum `x-user-*` ou `Bearer local_*` for usado como identidade de produção;
- sessão local não conceder autenticação/admin;
- PII jurídica não for persistida desnecessariamente no browser;
- operações de case usem DTOs mínimos e reconciliação server-truth;
- mapa de rotas e guards estiver coberto por testes;
- fluxos críticos tenham E2E navegável;
- acessibilidade e UX tenham evidência objetiva;
- `test:unit`, `lint`, `tsc`, `build` e matriz E2E aplicável estejam verdes;
- working tree permaneça limpo.

## Relação com o roadmap anterior

As FASES 2/3/4/6/7 já fornecem importantes garantias server-side. A FASE 9 não substitui essas fases; ela fecha a superfície que permaneceu fora do escopo sistemático: **o navegador como cliente não confiável, interface de autorização e experiência funcional real.**
