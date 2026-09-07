# FASE 9 — Auditoria de Frontend

**Data:** 2026-09-07  
**Base auditada:** `main` em `cb7066bd5515e88db4264ec9839f6a3e7c2f7240`  
**Escopo:** frontend React/TS, autenticação client-side, roteamento, persistência local, fluxos críticos, integração API e cobertura de testes.  

## Veredito

**STATUS: BLOCKED / HARDENING P0-P1 NECESSÁRIO**

O roadmap anterior cobriu corretamente boundaries servidor/cliente, mas não fechou o frontend como superfície independente. A auditoria encontrou problemas concretos no cliente, inclusive um **P0 de credencial em localStorage** e um **P0/P1 de identidade sintética mantida no cliente**.

Não considerar o frontend `READY` até as tasks F9-01 a F9-06 serem executadas e verificadas.

## Evidências principais

### F9-01 — P0 — senha persistida em localStorage

`src/core/auth/AuthContext.tsx` chama `saveStoredUser(cleanEmail, authUser, password)` após cadastro autenticado.

`src/lib/supabase.ts` implementa `saveStoredUser()` persistindo o argumento recebido em `localStorage` sob `defesai_registered_users_v1`. O campo é chamado `passwordHash`, mas o chamador entrega a senha diretamente; não existe hashing nessa função.

**Impacto:** uma credencial de usuário pode permanecer acessível ao JavaScript da origem e a qualquer XSS que consiga ler localStorage.

**Correção obrigatória:** remover armazenamento local de senha/credential material. Login e recuperação devem depender exclusivamente de Supabase Auth em produção. Dados locais de teste devem ser isolados de builds/flows de produção.

### F9-02 — P0/P1 — identidade sintética ainda é montada pelo frontend

`src/lib/api/client.ts` e `src/lib/authFetch.ts` ainda montam:

- `x-user-id`
- `x-user-role`
- `x-user-email`
- `x-user-name`
- `Authorization: Bearer local_<id>_<role>`

A FASE 7/Issue #2 corrigiu o servidor para não aceitar essa identidade como autoridade, mas o cliente continua produzindo o mecanismo legado.

**Impacto:** aumenta a superfície de confusão de identidade e cria risco de regressão caso qualquer rota futura volte a confiar nesses headers.

**Correção obrigatória:** frontend de produção deve enviar somente o access token Supabase quando existir. Remover headers `x-user-*` e o token sintético do caminho de produção.

### F9-03 — P1 — sessão cacheada localmente ainda influencia autorização visual

`RouterContext.tsx` toma decisões de proteção usando `isAuthenticated`/`isAdmin` provenientes do `AuthContext`. O `AuthContext` pode recuperar `getStoredSession()` quando não existe sessão Supabase.

Isso permite que uma sessão local antiga mantenha o cliente visualmente autenticado/admin mesmo quando a sessão real do Supabase não está presente. O backend deve rejeitar a chamada, mas a UI pode apresentar rotas e controles que não correspondem à autoridade real.

**Correção:** em produção, `isAuthenticated` e `isAdmin` devem derivar da sessão/identidade server-authoritative; cache local não deve conceder autenticação ou privilégio.

### F9-04 — P1 — PII e dados jurídicos completos no localStorage

`OnboardingWizard.tsx` persiste em `defesai_wizard_state` o estado completo do wizard, incluindo dados de veículo, infração, `CaseAnalysis` e `CaseDocumentData`. O `CaseDocumentData` contém CPF, CNH, telefone, e-mail e endereço.

**Impacto:** PII jurídica fica persistida no navegador por até 24h e pode sobreviver a navegação/fechamento da aplicação.

**Correção:** persistir apenas um identificador/estado mínimo necessário para retomada; dados sensíveis devem permanecer server-side ou em mecanismo de sessão apropriado. Se persistência local temporária for indispensável, minimizar, criptografar quando aplicável e definir limpeza explícita por fluxo.

### F9-05 — P1 — AccountVerificationGate consulta cadastro local

`AccountVerificationGate.tsx` usa `getStoredUsers()` para detectar conta existente por e-mail e consulta `localStorage` diretamente para recuperar usuário após login.

Isso mantém um segundo sistema de identidade no frontend mesmo após o roadmap declarar autenticação real obrigatória.

**Correção:** remover a decisão de existência/login baseada em `defesai_users`/`defesai_registered_users_v1`; usar somente Supabase Auth e a sessão atual.

### F9-06 — P1 — over-posting e reconciliação fraca no update de case

`App.tsx` executa `api.put(`/api/cases/${updated.id}`, updated)` com o objeto `CaseDomain` completo. O backend possui allowlist e portanto a barreira server-side reduz o risco de mass assignment, mas o frontend continua enviando mais campos do que o contrato mínimo necessário e ignora o resultado da mutação (`.catch(console.error)`).

**Impacto:** estado otimista pode divergir do servidor e erros de autorização/validação podem ficar invisíveis ao usuário.

**Correção:** criar payload DTO explícito por operação, aguardar resposta canônica e exibir erro/reverter estado quando a persistência falhar.

## F9-07 — P1 — chamada de cases ocorre também fora de fluxo autenticado

`App.tsx` executa `loadCases()` no mount global da aplicação, inclusive antes de determinar que a área atual é privada. O método chama `/api/cases` e possui retries automáticos.

**Impacto:** requests desnecessários em páginas públicas, ruído de 401/retry e custo operacional. Não é bypass de autorização porque o servidor deve rejeitar a chamada, mas indica acoplamento incorreto entre shell público e dados privados.

**Correção:** carregar cases somente em contexto autenticado e quando a área realmente exigir os dados.

## F9-08 — P2 — parser de query próprio sem tratamento robusto

`RouterContext.tsx` implementa `parseQueryParams()` manualmente com `split('&')` e `split('=')`, além de `decodeURIComponent()` sem proteção específica para input malformado.

**Correção:** usar `URLSearchParams` e testes para encoding, valores contendo `=`, caracteres inválidos e redirect targets.

## F9-09 — P2 — acessibilidade existe, mas não está formalmente fechada

`AdminLayout.tsx` e `UserLayout.tsx` já possuem `AccessibilityBar`, skip targets, landmarks e navegação mobile. Isso é uma base positiva, mas não existe evidência no roadmap de auditoria automatizada consolidada de teclado, foco, labels, contraste e leitores de tela.

**Status:** IMPLEMENTADO, NÃO VERIFICADO.

## F9-10 — P2 — UX/UI e regressão visual não cobertas pelo roadmap

O repositório contém ampla superfície React (admin, user, onboarding, checkout, marketing, affiliate etc.), mas as fases anteriores não fornecem uma matriz de verificação visual/UX para essas áreas.

**Status:** NÃO AUDITADO SISTEMATICAMENTE.

## F9-11 — E2E real continua limitado

Há suíte Playwright abrangente de onboarding (`tests/comprehensive-onboarding.spec.ts`) e testes E2E adicionais. Entretanto, a FASE 6 registrou bloqueio de execução completa por dependências externas reais.

A existência da suíte não equivale a validação operacional do produto em navegador contra o ambiente de produção.

**Status:** BLOCKED por evidência externa.

## Cobertura consolidada

| Área | Status atual |
|---|---|
| Frontend security | **BLOCKED** |
| Frontend authentication | **BLOCKED** |
| Frontend authorization UI | **PARTIAL** |
| Client → Server boundary | **VERIFIED server-side** |
| Frontend functional flows | **PARTIAL** |
| Onboarding | **PARTIAL / risco de persistência local** |
| Payments UI | **PARTIAL** |
| UX/UI | **NOT AUDITED** |
| Accessibility | **IMPLEMENTED / NOT VERIFIED** |
| Real browser E2E | **BLOCKED / external** |

## Ordem obrigatória de execução

1. **F9-01** remover credenciais locais — P0.
2. **F9-02** eliminar identidade sintética e `x-user-*` do cliente — P0/P1.
3. **F9-03** eliminar autenticação/privilégio derivado de cache local — P1.
4. **F9-04/F9-05** eliminar PII e segundo sistema de identidade em localStorage — P1.
5. **F9-06/F9-07** corrigir contratos de mutação e carregamento de dados — P1.
6. **F9-08** endurecer roteamento/query parser — P2.
7. **F9-09/F9-10** auditoria de acessibilidade, UX/UI e regressão visual — P2.
8. **F9-11** executar matriz E2E real quando credenciais/serviços externos estiverem disponíveis.

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
