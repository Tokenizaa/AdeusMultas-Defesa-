# Roadmap de Produção — DefesAi

> **Fonte de verdade reconstruída a partir do histórico real de `main`.**
> Atualizado em 2026-09-07, após o commit `85761b7611e419759d3f38344deb563a5ab38aa8`.
>
> Regra: não declarar uma etapa como `VERIFIED` somente porque existe um commit relacionado. O status abaixo distingue implementação, verificação, bloqueio e lacunas operacionais.

## Convenções

| Status | Significado |
|---|---|
| `VERIFIED` | Implementação/correção e evidência de verificação disponíveis |
| `IMPLEMENTED` | Correção implementada, mas fechamento formal ainda não consolidado |
| `AUDIT_NO_FINDING` | Auditoria executada sem achado concreto |
| `PARTIAL` | Parte da etapa fechada; existem subetapas pendentes |
| `BLOCKED` | Evidência depende de ambiente/serviço externo ainda não comprovado |
| `PENDING` | Ainda não executada ou sem evidência suficiente |
| `GO_WITH_LIMITATION` | Pode avançar com limitações explicitamente registradas |

---

# FASE 0 — Baseline e Governança

**STATUS: VERIFIED**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| G0-01 | VERIFIED | `ecdaa42410d5ba6c7edf569b2e19970effbcf20e` | Governança Loop Engineering, `loop/`, `features.json`, checkpoints e invariantes ratchet | `loop/CHECKPOINT.md`, `loop/loop.config.json`, `plan/features.json`, `tests/invariants/`; commit registra 3 features passing |
| G0-02 | VERIFIED | `ecdaa42410d5ba6c7edf569b2e19970effbcf20e` | Baseline operacional e diário de progresso | `plan/progress.md`, `loop/sessions.log` |
| G0-03 | VERIFIED | `ecdaa42410d5ba6c7edf569b2e19970effbcf20e` | Invariantes de segurança iniciais | `tests/invariants/`: no-getSession, RLS-enabled, no-secrets-env |
| Baseline audit | VERIFIED | `062ed5585d20879d3e1687e782812047a3df86e1` | Congelamento do baseline de auditoria | Commit `chore(audit): freeze phase 0 baseline` |

---

# FASE 1 — Upload / Storage

**STATUS: PARTIAL — 1.1–1.4 fechadas; 1.5–1.7 ainda sem evidência final.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 1.1 Upload / OCR | VERIFIED | `427083f7d9a3278fc22f0cb30a4d2de40bea03f8` | Autenticação OCR, SSRF hardening, limites de recurso, redirects e proteção contra TOCTOU | `src/server/routes/ocr.ts`; testes SSRF; `9a47477589ca8ab69b77f47b32fda34d666d4c7a` registra 35 testes SSRF e 602 testes totais |
| 1.2 Ownership | VERIFIED | `bf83e6d716436c2f64f37cdc479bc8b6fb268b43` + migration `20260905000001` | Ownership de cases/envelopes, proteção contra IDOR e persistência de `user_id` | Commit registra 609 testes; banco real validou `documenso_envelopes.user_id`, índice, policies e `domain_to_uuid()` |
| 1.3 Storage / policies | VERIFIED | `2ceb758f64697236a0528ab6ca1ece4052c24e31` | RLS dos buckets e policies de Storage | Banco real: 5 buckets e 8 policies; `marketing-assets` público somente leitura |
| 1.4 Path isolation | VERIFIED | `ee76c41842ada04470ff1dcfb2ee025097326635` + `2ceb758f...` | Auditoria dos paths e isolamento | 8 objetos auditados: 0 traversal, 0 caminhos absolutos, 0 nomes inválidos; buckets privados vazios |
| 1.5 Validação de arquivos | PENDING | — | Tipo, tamanho e conteúdo | Sem evidência final suficiente no histórico consultado |
| 1.6 Correções | PENDING | — | Consolidar achados de 1.5 | Bloqueada pela falta de fechamento de 1.5 |
| 1.7 Download / acesso | PENDING | — | Segurança e autorização de download | Sem validação final documentada |

**Nota:** `3786e8b28d665d9b0f0ffd528677949d956c818d` registra a verificação consolidada da FASE 1.

---

# FASE 2 — Autorização Global

**STATUS: PARTIAL — hardening importante implementado, mas o inventário/fechamento formal da fase ainda não foi concluído.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 2.1 Endpoints protegidos | IMPLEMENTED | `4420e3198d374ab83b1abd017a5dc5fecaa12fa7` | Inventário e proteção de operações de pagamento; escopo global ainda em fechamento | Commit identifica middleware global para operações de pagamento |
| 2.2 Cases | IMPLEMENTED | `59b0eebcbf46edcf62495ba6edee3c9d927c3906` | Allowlist de campos no `PUT /api/cases/:id`, reduzindo mass assignment/BOPLA | `case-update-property-authorization.test.ts`; ainda sem fechamento formal da subfase |
| 2.3 Documents | VERIFIED | `bf83e6d716436c2f64f37cdc479bc8b6fb268b43` | Ownership de envelopes Documenso | `authorizeEnvelope()` baseado em ownership server-side |
| 2.4 Evidence | VERIFIED | `93354cbe1742f0698496bd0ed18460da1315394f` | Boundary de `evidence_json` coberta pela autorização do case | Testes K/L/M: outro usuário recebe 403; owner consegue ler/alterar |
| 2.5 Payments | IMPLEMENTED | `4420e3198d374ab83b1abd017a5dc5fecaa12fa7` | JWT exigido para operações financeiras; preço público/webhooks preservados | Correção de risco de sandbox deixar mutações/status anônimos |
| 2.6 Admin / privilegiadas | VERIFIED | `85761b7611e419759d3f38344deb563a5ab38aa8` | Marketing/Inbox/Leads/Meta protegidos por `requireAdmin` no Node e app.ts | 13 testes novos; 761/761 unit tests no commit |
| 2.7 IDOR / IDs manipuláveis | VERIFIED | `bf83e6d716436c2f64f37cdc479bc8b6fb268b43` + `59b0eeb...` | Ownership e allowlists contra acesso/manipulação indevida | Testes de ownership/BOPLA e admin bypass |
| 2.8 Correções | PARTIAL | `85761b7...` + SHAs anteriores | Correções principais aplicadas, mas inventário global da fase não foi formalmente encerrado | Fechamentos existentes não cobrem todas as superfícies como uma única auditoria |

---

# FASE 3 — Integridade End-to-End

**STATUS: VERIFIED para as fronteiras auditadas até 3.6.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 3.1 Case → Evidence | VERIFIED | `e81eb741f1c314e3bbdd0fb5937b290f03a27e4d` + `93354cbe1742f0698496bd0ed18460da1315394f` | Persistência de evidence e boundary de ownership | Testes adversariais de GET/PUT de `evidence_json` |
| 3.2 Evidence → Analysis | VERIFIED | `fc46015d4dc6deb13e908ccefa0dd10b7a131aa9` | Evidence-dependent arguments são filtrados quando evidência exigida não existe | 11 cenários A–G; data gaps preservados e selecionados filtrados |
| 3.3 Analysis → Arguments | VERIFIED | cobertura registrada em `d8ff4016c183b1173d9eed74b3dd8a4664326b83` | Integridade das teses recomendadas e invariant `isReady === validation.isValid` | `fase-33-analysis-arguments.test.ts` e testes de geração fail-closed |
| 3.4 Arguments → Document | VERIFIED | `e6db74a1bb4823f4a55aa8f62585798685691d87` | `recommendedArguments` como fonte autorizada; sem auto-injeção de argumentos | Testes atualizados para contrato FASE 3.4 |
| 3.5 Document → Persistence | VERIFIED | `008aab06f2440895f54bc27b3d1c9496b0f2eeb0` + `400b967dd15737875fe2d9a3f5b32598112c0ed7` | Persistência mantém `selectedArgumentIds`; leitura revalida contra autorização | P0-06/09/10/11; sanitização no GET; ordem preservada |
| 3.6 Client → Server trust boundary | VERIFIED | `264877ab1bbc6dbccf982a706e517f24a0e66f95` | Teste adversarial de argumento válido no catálogo mas não autorizado para o caso | ARG-025 injetado e bloqueado; `selectedArguments` não amplia autoridade |
| 3.7 Correções | VERIFIED | `095de69f793f50ef1217e85b55d529e5bb6c9609` + `008aab06...` + `264877ab...` | Correções fail-closed e testes P0 consolidados | 17 testes em 3.5; testes adversariais de persistência e assembly |

**Ponto crítico fechado:** `CaseAnalysis.recommendedArguments → permittedTheses() → RagPipeline.generateDefenseDraft() → DocumentAssemblyEngine` não pode ampliar autoridade por fallback. O fallback de `applicableGrounds` foi removido em `095de69f...`.

---

# FASE 4 — Proteção de Dados / LGPD

**STATUS: VERIFIED — fechamento formal em `49fddf70`.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 4.1 Dados pessoais | VERIFIED | `3d521708bb751fd4391bcd8cd0eea53107aed65b` + `5a1bfcbbad4dfa4cd22590576d0c1c2e30a67c7d` + `1e6e1f0779dfcdfd9923f9e15ac1048dcf81830` | Mascaramento CPF/CNH/RG/telefone/email/placa; DELETE com anonimização completa | 6 testes reais de DELETE; 17 campos PII limpos; 19 testes de logger |
| 4.2 Logs | VERIFIED | `1e6e1f0779dfcdfd99d23f9e15ac1048dcf81830` + `920e5715e2d14c84af9cf7466cba320e75f25b16` | Sanitização de PII e remoção de signers/pdfBase64 dos logs de erro | Logger cobre telefone/email/placa; Documenso registra apenas `signerCount` |
| 4.3 URLs | VERIFIED | `2fafc5356367dc040b92d3ebcfb689003face0b5` | Remoção de email de query string de histórico de notificações | JWT identifica usuário; email redundante removido |
| 4.4 Storage / documentos | VERIFIED | `920e5715e2d14c84af9cf7466cba320e75f25b16` + `2ceb758f...` | PII em erros e Storage auditados | Signers removidos de logs; policies de Storage verificadas |
| 4.5 Retenção / exclusão | VERIFIED | `239aa7085e7854f3975e9a565e33ed02e5bc991d` + `5a1bfcbb...` | `envelope_data` anonimizado antes de cascade delete | `anonymizeEnvelopesByCaseId()` antes de `CASE_DELETED`; relatório `docs/fase/04-5-AUDIT-RETENCAO-EXCLUSAO.md` |
| 4.6 Serviços externos | VERIFIED | `ec06e86ab8dda4b0c31ee129806392a18baff041` | Remoção de `raw_metadata` de webhooks e mascaramento de telefone | 4 adapters corrigidos; 738/738 testes no ponto da correção |
| 4.7 Secrets / credenciais | VERIFIED | `d0890d4afd3dd35da7fad636b94d0eec06067b87` | Remoção de service-role JWT hardcoded e scan de secrets | Nenhum JWT `eyJ...`, `sk-` ou senha encontrada em código |
| 4.8 Fechamento | VERIFIED | `49fddf70e6e0090e38dbd2b72e9f57aaff8a3067` | Auditoria final das subfases 4.1–4.7 | Resultado: nenhuma correção de código pendente; gaps operacionais documentados |

---

# FASE 5 — Produção / Infraestrutura

**STATUS: VERIFIED / GO — com knowledge gaps operacionais explicitamente aceitos.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 5.1 Environment | VERIFIED | `ded21a1f98b4dcd9b285ab1ee764f5f81ac3e6cf` | Variáveis críticas ausentes agora encerram o processo (`process.exit(1)`) | 3 testes novos; 749 testes passando |
| 5.2 Secrets | VERIFIED | `d0890d4...` | Gestão/ausência de secrets hardcoded | Coberto também pela FASE 4.7 |
| 5.3 Produção | AUDIT_NO_FINDING | `f8bbb1958d0089707b7d60e4d0804d2b842761be` | Configuração auditada; PII demo apenas em memória, sem exposição comprovada | Gap operacional documentado |
| 5.4 CORS / headers | VERIFIED | `eb0f0e2355933adbb8aa16586c8a038455c2815a` | Corrigido fail-open do CORS: origem não permitida agora retorna `callback(null, false)` | 8 testes novos; 746 testes passando |
| 5.5 APIs externas | AUDIT_NO_FINDING | `f8bbb195...` | APIs inventariadas no limite verificável do repositório | DPA/retention/provedor externo ficam como knowledge gaps |
| 5.6 Comunicação | AUDIT_NO_FINDING | `f8bbb195...` | Comunicação entre serviços revisada | TLS/configuração externa não comprováveis apenas pelo repo |
| 5.7 Rate limiting | AUDIT_NO_FINDING | `f8bbb195...` | Rate limiting revisado | Trust proxy permanece GAP dependente da topologia Vercel/Cloudflare |
| 5.8 Erros | VERIFIED | `f8bbb195...` | Stack trace restrito a ambiente não-prod | Verificado em `server.ts` |
| 5.9 Logs segurança | VERIFIED | `f8bbb195...` | Sanitização e proteção de `/api/logs` | Bearer/API keys/PII sanitizados; endpoint protegido |
| 5.10 Fechamento | VERIFIED | `f8bbb1958d0089707b7d60e4d0804d2b842761be` | Consolidação da fase | Nenhuma correção funcional adicional necessária; gaps documentados |

---

# FASE 6 — Testes / Release Candidate

**STATUS: VERIFIED COM LIMITAÇÃO E2E EXTERNA.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 6.1 Inventário | VERIFIED | `d8ff4016c183b1173d9eed74b3dd8a4664326b83` | Inventário de 68 arquivos / 749 testes | Unit/integration/audit/E2E catalogados |
| 6.2 Autenticação | VERIFIED | `d8ff4016...` | 12 cenários de auth | Ausente/inválido/expirado → 401; headers `x-user-*` não forjam identidade |
| 6.3 Autorização | VERIFIED | `d8ff4016...` | IDOR/BOPLA/ownership | 19 cenários + legal authority + allowlist |
| 6.4 Upload / Evidence | VERIFIED | `d8ff4016...` | OCR, SSRF, media e RLS | 35 cenários SSRF; autenticação e RLS verificadas |
| 6.5 Geração de defesa | VERIFIED | `d8ff4016...` | Fail-closed e integridade jurídica | 20 testes de assembly + 3 analysis→arguments |
| 6.6 Pagamento | VERIFIED | `d8ff4016...` | Webhook security | 14 testes: HMAC, IP allowlist, spoofing, idempotência |
| 6.7 Onboarding | VERIFIED | `d8ff4016...` | Fluxo V2 ativo | Playwright `onboarding.spec.ts` |
| 6.8 E2E crítico | BLOCKED | `d8ff4016...` | Execução completa depende de Supabase/gateways reais | Suite configurada; execução determinística completa bloqueada por credenciais externas |
| 6.9 Build / TS | VERIFIED | `d8ff4016...` | Unit, lint/typecheck e build | 749 testes; `tsc --noEmit` 0 erros; build OK |
| 6.10 RC | GO_WITH_LIMITATION | `d8ff4016...` | Release candidate com limitação externa | Limitação E2E explicitamente registrada |

---

# FASE 7 — Auditoria Final

**STATUS: VERIFIED / GO WITH LIMITATION.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 7.1 Regressão | VERIFIED | `c90a4e9...` | 749 testes, sem regressão | Resultado documentado no fechamento |
| 7.2 Critical paths | VERIFIED | `c90a4e9...` | Caminhos críticos verificados | Auth, case, evidence, análise, documento e pagamento |
| 7.3 Security final | VERIFIED | `c90a4e9...` | Segurança final | 1 P2/GAP trust proxy aceito |
| 7.4 Legal integrity | VERIFIED | `c90a4e9...` | Integridade jurídica | Quality gate fail-closed; sem teses inventadas |
| 7.5 Persistence / payments | VERIFIED | `14d094b0c9bba7b79b263a703892cc46130c3d43` + `c90a4e9...` | Persistência financeira e idempotência | SELECT error handling, charge validation, duplicate `databaseRows.set()` removido |
| 7.6 Production config | VERIFIED após correção | `dea5fc163ed25ababa7df21c3d122b1201f727f6` | `contranCollector` desativado em produção | Scheduler externo passa a ser responsável pelo collector em produção |
| 7.7 Observability / recovery | VERIFIED | `c90a4e9...` | Logs estruturados, correlation IDs e ring buffer | Auditoria final registrou PASS |
| 7.8 Independente | VERIFIED | `c90a4e9...` | Auditoria independente e verificação de SHAs | Todos os SHAs verificados em `origin/main` |
| 7.9 Score | VERIFIED | `c90a4e9...` + `d355939a07c9d0badc1553d97b8ba39ac38a8cc1` | Score consolidado | Fase fechada posteriormente como GO with limitation |
| 7.10 GO/NO-GO | GO_WITH_LIMITATION | `d355939a07c9d0badc1553d97b8ba39ac38a8cc1` | Decisão final | E2E externo permanece limitação; sem blocker interno crítico conhecido |

**Histórico importante:** `c90a4e9` primeiro registrou BLOCKED por `contranCollector.start()` incondicional; `dea5fc1` corrigiu o blocker. O fechamento posterior `d355939` registrou GO com limitação.

---

# FASE 8 — Auditoria Operacional de Produção / Vercel

**STATUS: PARTIAL / BLOCKED POR EVIDÊNCIAS EXTERNAS.**

| ID | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| 8.1 Deployment / build | VERIFIED | `751632b6d279d48844dfecbd1e7d5e42da1309a2` | Deployment Production validado | Deployment `dpl_7ts5xoqUXCv2xWSUj9yrfDcjokc8` READY no commit `751632b6...` |
| 8.2 Runtime / 5xx | VERIFIED | `751632b6...` | Nenhum 5xx observado na janela auditada; `/api/index` respondeu 401 | Runtime revisado |
| 8.3 Trust proxy | BLOCKED | — | Topologia real de proxy ainda não comprovada | Runtime registra `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` / `ERR_ERL_FORWARDED_HEADER`; não aplicar `trust proxy` por suposição |
| 8.4 IA / NVIDIA / fallback | BLOCKED | — | Fallback operacional em Production não comprovado | Runtime registra ausência de NVIDIA key válida; não acessar secrets |
| 8.5 Environment Production | BLOCKED | — | Targets/existência de variáveis críticas precisam de comprovação segura | Valores não devem ser expostos; redeploy necessário após alterações |
| 8.6 Payments Production | BLOCKED | — | Gateway, modo Production e webhook reais ainda não comprovados | Código protegido; ambiente real não comprovado |
| 8.7 Source maps / headers | VERIFIED | `f72f9d88483673459ca2d9e164331f460e977fb0` | Source maps de produção removidos | `dist/server.cjs.map` deixou de ser gerado |
| 8.8 Correções | IMPLEMENTED | `751632b6...` + `f72f9d8...` | `/simulate-payment` bloqueado em produção; `scrapeWorker` guardado; source maps removidos | Correções de código realizadas |
| 8.9 Fechamento | BLOCKED | `69022ff2c4bd1029afbee005898316eeac74a6cc` | Findings/delegations registrados, mas evidências externas ainda pendentes | `docs(audit)` registra trust proxy, NVIDIA/fallback, environment e payments como pendentes |

**Importante:** a FASE 8 não deve ser marcada como `VERIFIED` enquanto 8.3–8.6 continuarem sem evidência real de produção.

---

# P0 TRANSVERSAIS — Hardening posterior ao roadmap original

Estas correções atravessam mais de uma fase e devem permanecer registradas mesmo não sendo uma nova fase numerada.

| Item | Status | SHA | Descrição | Evidência |
|---|---|---|---|---|
| P0 — identidade client-controlled | VERIFIED | `d76a59f00ca93fb03aca17778f4d29f2951acb55` | Remove headers/tokens locais como fonte de identidade em produção | Auth server-side; 463 testes no ponto do fechamento |
| P0 — Cases ownership | VERIFIED | `bf83e6d716436c2f64f37cdc479bc8b6fb268b43` | Defesa/Documenso protegidos por ownership | 609 testes; 7 regressões de ownership |
| P0 — Payment auth | VERIFIED | `4420e3198d374ab83b1abd017a5dc5fecaa12fa7` | Operações de pagamento exigem autenticação | Preço público e webhooks preservados |
| P0 — Issue #3 Payments | VERIFIED | `7927c809527ac5229ae4e72b8c56f3d8fe91952b2` | Remove CPF falso e corrige `user_profiles.id` → `user_id` | Corrige fallback ilegal e identidade financeira |
| P0 — Issue #2 Marketing/Meta | VERIFIED | `85761b7611e419759d3f38344deb563a5ab38aa8` | `requireAdmin` em Marketing/Inbox/Leads/Meta no Node e app.ts | 13 testes novos; 761/761; tsc 0; build clean |

---

# Estado consolidado em `main`

| Área | Estado atual |
|---|---|
| Baseline / governança | **VERIFIED** |
| Upload / Storage | **PARTIAL** — 1.5–1.7 pendentes |
| Autorização global | **PARTIAL** — hardening forte, inventário formal ainda não consolidado |
| Integridade E2E jurídica | **VERIFIED** até 3.6 |
| LGPD / proteção de dados | **VERIFIED** |
| Produção / infraestrutura | **VERIFIED / GO**, com knowledge gaps externos |
| Testes / RC | **VERIFIED COM LIMITAÇÃO E2E EXTERNA** |
| Auditoria final | **GO WITH LIMITATION** |
| Produção/Vercel | **PARTIAL / BLOCKED** — evidências reais 8.3–8.6 pendentes |
| Issue #2 P0 | **VERIFIED** — `85761b7` |
| Último commit da `main` | **`85761b7611e419759d3f38344deb563a5ab38aa8`** |

## Última sequência crítica

```text
FASE 4 fechamento  → 49fddf70
FASE 5 fechamento  → f8bbb195
FASE 6 fechamento  → d8ff4016
FASE 7 finding     → c90a4e9
FASE 7 correção    → dea5fc1
FASE 7 GO          → d355939a
FASE 8 correções   → 751632b6 / f72f9d8
Issue #3 P0        → 7927c809
Issue #2 P0        → 85761b76
```

## Regra para próximas atualizações

1. Não reabrir fase já `VERIFIED` sem evidência de regressão.
2. Não transformar `BLOCKED` em `VERIFIED` sem evidência externa correspondente.
3. Toda correção deve registrar SHA completo, resultado dos testes e evidência.
4. Não usar o título da mensagem de commit como única prova; verificar conteúdo e testes.
5. Alterações de onboarding de outro agente (`OnboardingWizard.tsx`, `AnalysisProcessingStep.tsx` e testes associados) permanecem fora deste roadmap até auditoria própria.
6. O próximo trabalho prioritário é fechar os gaps objetivos de FASE 1, consolidar o inventário global da FASE 2 e resolver as evidências externas da FASE 8.
