# Documento Mestre de Arquitetura — Módulos, Páginas e Componentes

- **Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
- **Branch de referência:** `main`
- **Commit-base lido:** `69b4b3f0d5a54f58a0d90fb6cb48ffb34b789070`
- **Produção declarada no projeto:** `https://adeusmulta.defesai.com.br`
- **Frontend:** React + TypeScript + Vite
- **API de produção:** Cloudflare Worker + Hono
- **Persistência/Auth:** Supabase
- **Objetivo:** inventário único para navegar o sistema por módulo funcional, página/rota, componentes visuais, backend e evidências de teste.

> **Regra de leitura:** este documento é um inventário do código versionado. A presença de um arquivo não comprova que a funcionalidade esteja operacional em produção. Status de produção, migrações aplicadas, integrações externas e testes executados só podem ser marcados como confirmados mediante evidência própria. Os relatórios de auditoria existentes contêm estados de datas/commits diferentes; em conflito, conferir o código atual e executar validação.

## 1. Mapa executivo dos 14 módulos

| Nº | Módulo funcional | Páginas / áreas principais | Componentes de UI principais | Backend / núcleo |
|---|---|---|---|---|
| 01 | Autenticação e usuários | `/login`, `/cadastro`, sessão e redirecionamento | `LoginPageView`, `RegisterPageView`, `AuthPageView`, `SharedAuthForm` | `src/core/auth/AuthContext.tsx`, `src/server/routes/auth.ts`, `cloudflare/routes/auth.ts`, middleware |
| 02 | Isolamento, RLS e banco | dados de usuário, casos, documentos, perfis e armazenamento | vistas de perfil/casos/documentos; sem página exclusiva de RLS | `src/server/db/*`, `cloudflare/supabase.ts`, `supabase/migrations/*`, políticas RLS |
| 03 | Backend, rotas e APIs | endpoints `/api/*`; suporte às páginas web | clientes API e componentes consumidores | `cloudflare/routes/*`, `src/server/routes/*`, `src/shared/api/*` |
| 04 | Onboarding e análise gratuita | `/novo-caso` (alias legado `/onboarding`) | `OnboardingWizard` e etapas de identificação, serviço, análise e qualificação | `src/core/onboarding/*`, `src/onboarding/*`, `cloudflare/routes/onboarding.ts`, `cloudflare/routes/cases.ts` |
| 05 | Regras jurídicas determinísticas | seleção de modalidade, análise da infração e recomendação de procedimento | etapas de onboarding e vistas da base jurídica | `src/core/rules/*`, `src/core/rag/rag-pipeline.ts`, `src/core/legal-base/*`, `src/core/validation/*` |
| 06 | Documentos, minutas e PDFs | detalhe do caso, revisão e acesso ao documento | `CaseDetailView`, `CaseDocumentsSection`, etapas de revisão/checkout | `src/core/documents/*`, `src/core/templates/*`, `src/server/routes/documents.ts`, `cloudflare/routes/documents.ts` |
| 07 | Pagamentos VenoPag | `/checkout`, pagamentos no console admin | `CheckoutView`, `AdminPaymentsView`, formulário PIX | `cloudflare/routes/payments.ts`, `cloudflare/venopag.ts`, `src/server/integrations/gateway/*`, webhooks |
| 08 | Privacidade e LGPD | política pública, consentimento, acesso a dados e auditoria | `PrivacyPolicyView`, banners privados, auditoria | políticas RLS, `audit`, retenção, storage e rotas de documentos |
| 09 | Frontend, UX e fluxos | páginas públicas, usuário, admin, checkout e onboarding | `src/App.tsx`, layouts e todos os componentes listados nas seções 2–4 | `src/core/router/RouterContext.tsx`, `src/lib/api/client.ts`, testes de UI |
| 10 | Segurança e resiliência | autenticação, limites, monitoramento, webhooks e logs | `AdminMonitoringView`, `AdminAuditView`, `AdminSettingsView` | `cloudflare/middleware.ts`, rotas protegidas, rate limits, `webhook_events`, testes |
| 11 | Integrações e consistência | integrações externas, mensagens, armazenamento e provedores | `AdminIntegrationsView`, `MetaIntegrationCards`, `GoogleDriveModal` | `src/integrations/meta/*`, `src/server/integrations/*`, `cloudflare/publishers/*` |
| 12 | Base de conhecimento e determinismo jurídico | `/admin/knowledge` | `KnowledgeHub` e 11 vistas internas | `src/core/knowledge/*`, `src/server/knowledge/*`, `src/core/legal-base/*`, Quality Gates |
| 13 | Operação, produção e recuperação | saúde, logs, monitoramento, filas e workers | `AdminMonitoringView`, `AdminAuditView`, `AdminE2ETestsView` | `wrangler.jsonc`, `.github/workflows/*`, workers, health/metrics/alerts, migrations |
| 14 | Certificação integrada final | fluxos integrados e evidências | vistas admin de E2E e integridade; Playwright | `tests/*`, `tests/e2e-reconstruction/*`, Vitest, relatórios `docs/audits/*` |

**Importante:** os números 01–14 preservam a taxonomia usada nos relatórios do repositório; não representam 14 rotas isoladas nem garantem que cada módulo tenha uma página própria.

## 2. Rotas reais do frontend declaradas em `src/App.tsx`

O roteamento é próprio (History API), implementado em `src/core/router/RouterContext.tsx`; não é um mapa React Router. O caminho `/onboarding` é canonicalizado para `/novo-caso`.

### 2.1 Área pública

| Rota | Página/componente | Arquivo |
|---|---|---|
| `/` | Landing page | `src/components/public/LandingPageView.tsx` |
| `/login` | Login | `src/components/public/LoginPageView.tsx` |
| `/cadastro` | Cadastro | `src/components/public/RegisterPageView.tsx` |
| `/novo-caso` | Wizard de novo caso/análise | `src/components/onboarding/OnboardingWizard.tsx` |
| `/onboarding` | Alias canonicalizado para `/novo-caso` | `src/core/router/RouterContext.tsx` |
| `/termos-de-uso` | Termos de uso | `src/components/public/TermsOfUseView.tsx` |
| `/politica-de-privacidade` | Política de privacidade | `src/components/public/PrivacyPolicyView.tsx` |
| demais caminhos públicos | Fallback 404 embutido em `AppContent` | `src/App.tsx` |

Layout: `PublicLayout`. Componentes globais montados nesta área: `WhatsAppSimulatorModal`, `PWAInstallBanner`.

### 2.2 Área do usuário/condutor

| Rota | Página/componente | Arquivo |
|---|---|---|
| `/dashboard` | Painel do condutor | `src/components/user/UserDashboardView.tsx` |
| `/cases` | Lista de casos/recursos | `src/components/cases/CasesListView.tsx` |
| `/cases/:id` e subcaminhos | Detalhe do caso | `src/components/cases/CaseDetailView.tsx` |
| `/checkout` | Checkout, se houver caso ativo e usuário autenticado | `src/components/checkout/CheckoutView.tsx` |
| `/perfil` | Atualmente renderiza `UserSettingsView` | `src/components/user/UserSettingsView.tsx` |
| `/configuracoes` | Configurações | `src/components/user/UserSettingsView.tsx` |
| `/servicos` | Título é reconhecido em `App.tsx`, mas não há render explícito de página correspondente no bloco de usuário | **Ponto de reconciliação: rota sem conteúdo dedicado aparente** |
| `/afiliado`, `/affiliate` | Portal de afiliados | `src/components/affiliate/AffiliatePortalView.tsx` |

Layout: `UserLayout`; navegação: `UserSidebar`; cabeçalho: `UserHeader`. Componentes transversais: `WhatsAppSimulatorModal`, `PWAInstallBanner`.

**Observação de código:** `UserProfileView.tsx` existe no repositório, mas `App.tsx` renderiza `UserSettingsView` para `/perfil`; a existência do componente não significa que a rota o utilize.

### 2.3 Área administrativa

| Rota / padrão | Página/componente | Arquivo |
|---|---|---|
| `/admin` | Dashboard admin | `src/components/admin/AdminDashboardView.tsx` |
| `/admin/cases` | Lista de casos | `src/components/admin/AdminCasesListView.tsx` |
| `/admin/cases/:id` | Detalhe do caso | `src/components/admin/AdminCaseDetailView.tsx` |
| `/admin/users` | Lista de usuários | `src/components/admin/AdminUsersListView.tsx` |
| `/admin/users/:id` | Detalhe do usuário | `src/components/admin/AdminUserDetailView.tsx` |
| `/admin/documents` | Documentos/minutas | `src/components/admin/AdminDocumentsView.tsx` |
| `/admin/payments` | Pagamentos | `src/components/admin/AdminPaymentsView.tsx` |
| `/admin/ai` | Gateway e IA | `src/components/admin/AdminAiGatewayView.tsx` |
| `/admin/integrations` | Integrações | `src/components/admin/AdminIntegrationsView.tsx` |
| `/admin/knowledge` | Base jurídica | `src/components/knowledge/KnowledgeHub.tsx` |
| `/admin/marketing` e query views | Marketing OS | `src/components/marketing/MarketingOSView.tsx` |
| `/admin/marketing/prospecting` | Prospecção — visão geral | `src/components/marketing/components/ProspectingPage.tsx` |
| `/admin/marketing/prospecting/leads` | Leads | `ProspectingLeadsTab` |
| `/admin/marketing/prospecting/campaigns` | Campanhas | `ProspectingCampaignsTab` |
| `/admin/marketing/prospecting/automation` | Automação | `ProspectingAutomationTab` |
| `/admin/marketing/prospecting/queue` | Fila de jobs | `ProspectingQueueTab` |
| `/admin/marketing/prospecting/collection` | Coleta | `ProspectingCollectionTab` |
| `/admin/settings` | Configurações da plataforma | `src/components/admin/AdminSettingsView.tsx` |
| `/admin/logs` | Logs (reutiliza auditoria) | `src/components/admin/AdminAuditView.tsx` |
| `/admin/monitoring` | Monitoramento | `src/components/admin/AdminMonitoringView.tsx` |
| `/admin/audit` | Auditoria/LGPD | `src/components/admin/AdminAuditView.tsx` |
| `/admin/commercial` | Hub comercial — visão geral | `CommercialHubView` com `initialTab="overview"` |
| `/admin/commercial/prices` | Preços | `CommercialHubView` com `initialTab="prices"` |
| `/admin/commercial/promotions` | Promoções | `CommercialHubView` com `initialTab="promotions"` |
| `/admin/commercial/coupons` | Cupons | `CommercialHubView` com `initialTab="coupons"` |
| `/admin/commercial/bonuses` | Bônus | `CommercialHubView` com `initialTab="bonuses"` |
| `/admin/commercial/referrals` | Indicações | `CommercialHubView` com `initialTab="referrals"` |
| `/admin/commercial/commissions` | Comissões | `CommercialHubView` com `initialTab="commissions"` |
| `/admin/commercial/settings` | Configurações comerciais | `CommercialHubView` com `initialTab="settings"` |

Layout: `AdminLayout`; navegação: `AdminSidebar` e `admin-nav-groups.ts`; cabeçalho: `AdminHeader`. O menu é definido em `src/components/layout/admin-nav-groups.ts`; a renderização efetiva é controlada por `src/App.tsx`. Esses dois lugares precisam permanecer consistentes.

## 3. Inventário de páginas internas e componentes por módulo

### Módulo 01 — Autenticação e usuários

**Páginas:** `/login`, `/cadastro`; sessão aplicada às áreas de usuário e admin.

**Componentes UI**
- `src/components/public/LoginPageView.tsx`
- `src/components/public/RegisterPageView.tsx`
- `src/components/public/AuthPageView.tsx`
- `src/components/auth/SharedAuthForm.tsx`
- `src/components/user/UserProfileView.tsx`
- `src/components/user/UserSettingsView.tsx`
- `src/components/layout/UserHeader.tsx`, `UserSidebar.tsx`
- `src/components/layout/AdminHeader.tsx`, `AdminSidebar.tsx`

**Lógica/integrações**
- `src/core/auth/AuthContext.tsx`
- `src/core/router/RouterContext.tsx`
- `src/hooks/useAuthFetch.ts`, `src/lib/authFetch.ts`
- `src/server/middleware/auth-middleware.ts`
- `src/server/routes/auth.ts`, `cloudflare/routes/auth.ts`

**Testes relacionados:** `cloudflare/routes/auth.test.ts`, testes de middleware/auth encontrados no inventário. Não considerar o módulo aprovado só por existirem testes; executar e registrar o resultado atual.

### Módulo 02 — Isolamento, RLS e persistência

**Páginas que dependem do módulo:** todas as páginas de conta, casos, checkout, documentos, conhecimento, marketing e console admin. Não há página única de RLS.

**Componentes UI consumidores**
- Casos: `CasesListView`, `CaseDetailView`, `CaseDocumentsSection`, `CasesTable`, `CasesTableUserView`, `CasesTableAdminView`
- Conta: `UserDashboardView`, `UserProfileView`, `UserSettingsView`
- Admin: `AdminCasesListView`, `AdminCaseDetailView`, `AdminUsersListView`, `AdminUserDetailView`, `AdminDocumentsView`, `AdminPaymentsView`

**Persistência e controle**
- `src/lib/supabase.ts`
- `src/server/db/case-repository.ts`, `payment-repository.ts`, `webhook-repository.ts`, `commercial-repository.ts`, `envelope-repository.ts`, `meta-repository.ts`, `supabase-server.ts`
- `cloudflare/supabase.ts`
- `supabase/migrations/*), `supabase/recovery/*`

**Testes:** `cloudflare/routes/isolation.test.ts`, `cloudflare/routes/cases.privacy.test.ts`, `cloudflare/routes/cases.test.ts`. Verificar o banco real e migrações aplicadas separadamente do inventário Git.

### Módulo 03 — Backend, rotas e APIs

**Superfícies consumidas pelo frontend:** auth, casos, onboarding, documentos, pagamentos, conhecimento, IA, notificações, settings, marketing/prospecção, mensagens, OCR, monitoramento, admin, comercial e integrações.

**Cloudflare/Hono — rotas versionadas em `cloudflare/routes/`:**
- `admin.ts`, `ai.ts`, `audit.ts`, `auth.ts`, `cases.ts`, `commercial.ts`, `communication.ts`, `documents.ts`, `knowledge.ts`, `marketing.ts`, `monitor.ts`, `notifications.ts`, `ocr.ts`, `onboarding.ts`, `payments.ts`, `settings.ts`.
- Rotas/serviços auxiliares associados: `cloudflare/middleware.ts`, `cloudflare/worker.ts`, `cloudflare/supabase.ts`, `cloudflare/venopag.ts`, `cloudflare/pagbank.ts), `cloudflare/publishers/*), `cloudflare/services/*).

**Servidor Node/Express — `src/server/routes/`:**
- `admin.ts`, `agents.ts`, `ai.ts`, `analytics.ts`, `audit.ts`, `auth.ts`, `cases.ts`, `commercial.ts`, `defense.ts`, `documenso.ts`, `documents.ts`, `e2e-tests.ts`, `governance.ts`, `health.ts`, `knowledge.ts`, `logs.ts`, `marketing-automation.ts`, `marketing.ts`, `media.ts`, `meta.ts`, `monitoring.ts`, `notifications.ts`, `ocr.ts`, `onboarding-v2.ts`, `onboarding.ts`, `payments.ts`, `scrape.ts`, `settings.ts`, `sync.ts`, `transit.ts`, `whatsapp.ts`.

**Contratos/clientes**
- `src/lib/api/client.ts), `src/shared/api/{adapters,boundary,contracts,http,schemas}.ts), `src/types/api.ts`.
- Testes Cloudflare existentes: admin, AI, auth, casos, comercial, comunicação, documentos, prospecção Firecrawl, isolamento, conhecimento, marketing, notificações, OCR, pagamentos e conformidade de segurança.

**Risco arquitetural a manter visível:** o repositório contém rotas Cloudflare e rotas Node/Express com domínios sobrepostos. Para cada feature, identificar qual entrypoint está publicado e qual implementação é realmente chamada antes de corrigir comportamento.

### Módulo 04 — Onboarding e análise gratuita

**Página:** `/novo-caso` (`/onboarding` é alias).

**Componente principal:** `src/components/onboarding/OnboardingWizard.tsx`.

**Etapas/componentes**
- `AccountVerificationGate.tsx`
- `steps/ServiceStep.tsx`
- `steps/InfractionCategoryStep.tsx`
- `steps/InfractionIdentificationStep.tsx`
- `steps/SpecificInfractionDataStep.tsx`
- `steps/DefenseStageStep.tsx`
- `steps/AnalysisProcessingStep.tsx`
- `steps/FreeAnalysisResultStep.tsx`
- `generation/RequiredDataStep.tsx`
- `generation/DocumentReviewStep.tsx`
- `generation/DocumentCheckoutStep.tsx`
- `testFillData.ts` (suporte de preenchimento de teste; não é página de produção)

**Lógica**
- `src/core/onboarding/rules-matrix.ts`, `legal-validation.ts`, `reference-cases.ts`
- `src/onboarding/application/{contracts,http-application,types-bridge}.ts`
- `src/onboarding/domain/{state,transitions}.ts`
- `cloudflare/routes/onboarding.ts`, `cloudflare/routes/cases.ts`, `src/server/routes/onboarding.ts`, `onboarding-v2.ts`

**Testes:** `onboarding-copy-regression.test.tsx`, `testFillData.test.ts`, `legal-validation.test.ts`, `reference-cases-legal-validation.test.ts`, `cloudflare/routes/cases.test.ts`.

### Módulo 05 — Regras jurídicas determinísticas

**Páginas/UI consumidoras**
- Wizard: `OnboardingWizard` e etapas de infração/serviço/fase.
- Base admin: `KnowledgeHub`, `InfractionsView`, `CTBView`, `ArgumentsView`, `ProceduresView`, `TemplatesView`.
- Documento: `CaseDetailView`, `DocumentReviewStep` e `AdminDocumentsView`.

**Motor e catálogos**
- `src/core/rules/infraction-classifier.ts`, `jurisdiction-procedures.ts`, `rule-engine.ts`
- `src/core/arguments/arguments-catalog.ts`
- `src/core/procedures/procedures-catalog.ts`
- `src/core/templates/templates-catalog.ts`, `document-blocks.ts`
- `src/core/rag/rag-pipeline.ts`
- `src/core/validation/final-quality-gate.ts`, `integrity-validator.ts`, `data-lineage.ts`
- `src/core/legal-base/ctb-articles.ts`, `resolutions.ts`, `jurisprudence.ts`, `organs.ts`, `glossary.ts`

**Testes:** `src/core/deterministic-pipeline.test.ts`, `src/core/rules/rule-engine.test.ts`, `src/core/validation/integrity-validator.test.ts`, `src/core/legal-base/organs.test.ts`.

### Módulo 06 — Documentos, minutas e PDFs

**Páginas:** detalhe do caso `/cases/:id`, checkout `/checkout), console `/admin/documents).

**Componentes**
- `src/components/cases/CaseDetailView.tsx`
- `src/components/cases/CaseDocumentsSection.tsx`
- `src/components/shared/CaseDetailBase.tsx`
- `src/components/admin/AdminDocumentsView.tsx`
- `src/components/onboarding/generation/DocumentReviewStep.tsx`
- `src/components/onboarding/generation/DocumentCheckoutStep.tsx`
- `src/components/common/GoogleDriveButton.tsx`, `GoogleDriveModal.tsx`

**Serviços**
- `src/core/documents/document-assembly-engine.ts`, `document-roll.ts`, `facts-narrative.ts`, `defense-integrity.ts`
- `src/lib/pdf-export.ts)
- `src/server/routes/documents.ts), `src/server/routes/defense.ts), `cloudflare/routes/documents.ts), `cloudflare/routes/cases.ts`
- Integração Documenso: `src/server/lib/documenso/*), `src/server/routes/documenso.ts)

**Testes:** `src/core/documents/document-assembly-engine.test.ts`, testes de documentos nas rotas Cloudflare e de qualidade do documento.

### Módulo 07 — Pagamentos VenoPag

**Páginas/componentes**
- Usuário: `/checkout` → `CheckoutView.tsx`
- Admin: `/admin/payments` → `AdminPaymentsView.tsx`
- `CreditCardForm.tsx` existe no frontend; a presença do arquivo não significa que cartão seja suportado pelo gateway ativo.
- `src/components/commercial/CommercialHubView.tsx) e vistas de preços/cupons/promoções também influenciam a oferta.

**Backend e dados**
- `cloudflare/routes/payments.ts), `cloudflare/routes/commercial.ts), `cloudflare/venopag.ts)
- `src/server/integrations/gateway/{gateway-manager,index,types,venopag-adapter,webhook-handler}.ts)
- `src/server/routes/payments.ts), `src/server/routes/commercial.ts)
- `src/server/db/payment-repository.ts), `webhook-repository.ts)
- `supabase/migrations/*payment*`, `*venopag*`, `*webhook_events*`, `*commission_ledger*)

**Testes:** `cloudflare/routes/payments.test.ts`, `payments.regression.test.ts`, `commercial.test.ts`, `src/components/checkout/checkout-pix-only.test.tsx).

**Pontos que exigem prova runtime:** autenticação no caminho completo de resolver oferta; cálculo de preço autoritativo no servidor; idempotência; ownership do caso; webhook assinado; persistência do pagamento; status refletido no frontend. Nenhum pagamento real deve ser iniciado como parte deste inventário.

### Módulo 08 — Privacidade e LGPD

**Páginas/componentes**
- `/politica-de-privacidade` → `PrivacyPolicyView.tsx`
- `/termos-de-uso` → `TermsOfUseView.tsx`
- `PrivateCookieBanner.tsx`, `PrivateAccessibilityBar.tsx`, `PrivateHeader.tsx`, `PrivateFooter.tsx`
- `AdminAuditView.tsx), `AdminSettingsView.tsx), `AdminDocumentsView.tsx)

**Backend/dados**
- `cloudflare/routes/audit.ts), `src/server/routes/audit.ts), `src/server/routes/governance.ts)
- `src/server/services/audit-service.ts), `src/server/observability/logger.ts)
- migrations de RLS, Storage, retenção de dados e tabelas de auditoria em `supabase/migrations/`
- `cloudflare/routes/cases.privacy.test.ts), testes de isolamento e de documentos.

**Verificar:** minimização de dados, mascaramento de CPF/e-mail/telefone, retenção e exclusão, acesso cruzado, URLs assinadas e políticas efetivamente aplicadas no banco.

### Módulo 09 — Frontend, UX e fluxos

**Base visual e composição**
- `src/App.tsx), `src/main.tsx), `src/index.css`
- `src/components/layout/{PublicLayout,UserLayout,AdminLayout,AdminHeader,AdminSidebar,UserHeader,UserSidebar}.tsx`
- `src/components/layout/admin-nav-groups.ts`, `admin-nav-item.tsx`, `admin-nav-types.ts`, `admin-sub-group.tsx`
- `src/components/common/{Header,AccessibilityBar}.tsx`
- `src/components/ui/{PrivateAccessibilityBar,PrivateCookieBanner,PrivateFooter,PrivateHeader,TestFillButton}.tsx)
- `src/components/brand/AdeusMultasLogo.tsx)
- `src/components/pwa/PWAInstallBanner.tsx`
- `src/components/notifications/NotificationBellDropdown.tsx)

**Páginas públicas, usuário e admin:** ver todas as rotas da seção 2. A tabela da seção 5 lista os componentes de cada pasta.

**Testes/validação:** `src/lib/api/tests/client.test.ts`, testes de contrato `src/shared/api/contracts.test.ts`, testes de regressão do onboarding e checkout, Playwright em `tests/e2e-reconstruction/`.

### Módulo 10 — Segurança e resiliência

**Páginas/componentes de operação**
- `AdminMonitoringView.tsx`
- `AdminAuditView.tsx`
- `AdminSettingsView.tsx`
- `AdminIntegrationsView.tsx`
- `AdminE2ETestsView.tsx), `AdminE2ERunDetailView.tsx), `AdminIntegrityTestView.tsx)

**Backend**
- `cloudflare/middleware.ts), `cloudflare/routes/{auth,admin,cases,documents,payments,commercial,settings,audit,monitor}.ts`
- `src/server/middleware/{auth-middleware,rate-limit}.ts`
- `src/server/observability/{health-service,logger,metrics-service,alerts-service}.ts`
- `src/server/shared/secrets/manager.ts`
- `src/server/shared/webhook/evolution-webhook-auth.ts`
- `src/server/db/webhook-repository.ts)
- `supabase/migrations/20261021000002_create_webhook_events.sql` e migrações de hardening/RLS.

**Testes:** `cloudflare/routes/security-compliance.test.ts`, `auth.test.ts`, `isolation.test.ts`, `payments.regression.test.ts` e testes de webhook. Atenção: a qualidade real exige assertions que falhem quando o controle falha; testes com `expect(true).toBe(true)` não verificam o comportamento descrito.

### Módulo 11 — Integrações, consistência e confiabilidade

**Páginas/componentes**
- `/admin/integrations` → `AdminIntegrationsView.tsx`
- `/admin/marketing` → `MarketingOSView.tsx)
- `MetaIntegrationCards.tsx`, `MetaConnectionModal.tsx`
- `GoogleDriveButton.tsx`, `GoogleDriveModal.tsx`
- `WhatsAppSimulatorModal.tsx), `NotificationBellDropdown.tsx`

**Integrações**
- Meta: `src/integrations/meta/{adapters,auth,client,errors,insights,instagram,pages,publishing,tests,types,webhooks}/*`
- Servidor: `src/server/integrations/{gateway,meta,pagbank}/*)
- Publicação Cloudflare: `cloudflare/publishers/*)
- Comunicação: `src/server/services/{messaging-service,whatsapp-service,notification-service,email-service,push-service}.ts`
- Google Drive: `src/core/integrations/google-drive-service.ts`, `src/lib/google-auth.ts`

**Testes:** `cloudflare/routes/communication.test.ts`, `notifications.test.ts`, `src/integrations/meta/tests/meta-integration-suite.ts`, testes de persistência de messaging e webhooks.

### Módulo 12 — Base de conhecimento e determinismo jurídico

**Página principal:** `/admin/knowledge` → `KnowledgeHub.tsx`.

**Vistas internas (11):**
1. `InfractionsView.tsx` — infrações.
2. `NationalMonitorView.tsx` — monitor nacional/UFs.
3. `CTBView.tsx` — CTB, artigos e resoluções.
4. `ArgumentsView.tsx` — teses/argumentos.
5. `TemplatesView.tsx` — templates de documentos.
6. `ProceduresView.tsx` — procedimentos e prazos.
7. `GraphView.tsx` — grafo relacional.
8. `DocumentEngineView.tsx` — motor de documentos.
9. `BlocksView.tsx` — blocos de texto.
10. `ReportsView.tsx` — cobertura/auditoria.
11. `JsonExplorer.tsx` — exploração de dados/RAG.
- Componente auxiliar: `DocumentBlocksView.tsx`, `DocumentEngineSimulator.tsx`.

**Serviços de conhecimento**
- Front/core: `src/core/knowledge/*`, `src/core/domain/knowledge-schema.ts), `src/data/knowledge-base.ts), `src/knowledge/index.ts)
- Legal-base/rules: `src/core/legal-base/*), `src/core/rules/*), `src/core/arguments/arguments-catalog.ts), `src/core/procedures/procedures-catalog.ts), `src/core/templates/*)
- Server: `src/server/knowledge/{chunking-service,embedding-service,ingestion-service,knowledge-service,rag-service,reranker-service,search-service,vector-store,types}.ts)
- Cloudflare: `cloudflare/routes/knowledge.ts)
- Banco: migrations de knowledge schema e RPC `match_knowledge_chunks`.

**Testes:** `cloudflare/routes/knowledge.test.ts`, `src/core/knowledge/*test.ts`, testes de ingestão, catálogo, reconciliação e monitoramento.

### Módulo 13 — Operação, produção e recuperação

**Páginas/componentes**
- `/admin/monitoring` → `AdminMonitoringView.tsx`
- `/admin/logs` e `/admin/audit` → `AdminAuditView.tsx`
- `/admin/integrations` → `AdminIntegrationsView.tsx`
- `AdminE2ETestsView.tsx), `AdminE2ERunDetailView.tsx)

**Infraestrutura**
- `wrangler.jsonc`, `.wranglerignore`
- `.github/workflows/ci-cd.yml`, `.github/workflows/cloudflare-deploy.yml`
- `src/server/observability/*), `src/server/lifecycle/*), `src/server/workers/*)
- `src/server/services/health` (health/monitoring), fila de scraping e automação.
- `supabase/migrations/*), `supabase/recovery/*), `scripts/*)

**Evidência necessária:** health HTTP não prova que todos os fluxos de negócio estão operacionais; registrar deploy ativo, bindings/secrets configurados, migrações aplicadas, logs de erro, estratégia de rollback e restauração testada.

### Módulo 14 — Certificação integrada final

**UI**
- `AdminE2ETestsView.tsx`
- `AdminE2ERunDetailView.tsx`
- `AdminIntegrityTestView.tsx)
- componentes reais exercitados por Playwright: onboarding, caso, checkout, usuário, admin, comercial e conhecimento.

**Suíte E2E versionada**
- `tests/e2e-reconstruction/defesa_previa.spec.ts`
- `recurso_jari.spec.ts`
- `recurso_cetran.spec.ts`
- `suspensao.spec.ts`
- `cassacao.spec.ts`
- `indicacao_condutor.spec.ts`
- `conversao_advertencia.spec.ts`
- `admin-pricing-edit.spec.ts`
- `support.ts`
- `text-audit-runner.ts`
- `text-audit-types.ts`
- `text-capture.ts`
- `text-validators.ts`

**Vitest e utilitários:** `vitest.config.ts`, `tests/vitest-network.setup.ts), `tests/vitest.env.setup.ts), `playwright.config.ts` se presente na árvore atual.

**Critério:** relatório deve separar teste descoberto, teste executado, aprovado, falho, bloqueado e não executado; nunca tratar uma lista de testes ou uma expectativa constante como evidência de aprovação.

## 4. Inventário completo dos componentes React por diretório

Esta seção é a lista de referência dos componentes visuais versionados sob `src/components/`. Arquivos de teste e backup são identificados para não serem confundidos com páginas de produção.

### `src/components/admin/`
- `AdminAiGatewayView.tsx`
- `AdminAuditView.tsx`
- `AdminCaseDetailView.tsx`
- `AdminCasesListView.tsx`
- `AdminDashboardView.tsx`
- `AdminDocumentsView.tsx`
- `AdminE2ERunDetailView.tsx`
- `AdminE2ETestsView.tsx`
- `AdminIntegrationsView.tsx`
- `AdminIntegrityTestView.tsx`
- `AdminMonitoringView.tsx`
- `AdminPaymentsView.tsx`
- `AdminSettingsView.tsx`
- `AdminUserDetailView.tsx`
- `AdminUsersListView.tsx`
- `LogDetailModal.tsx`
- `MetaIntegrationCards.tsx`
- `SecretEditModal.tsx`

### `src/components/affiliate/`, `auth/`, `brand/`
- `affiliate/AffiliatePortalView.tsx`
- `auth/SharedAuthForm.tsx`
- `brand/AdeusMultasLogo.tsx`

### `src/components/cases/`, `checkout/`, `commercial/`
- `cases/CaseDetailView.tsx`
- `cases/CaseDocumentsSection.tsx`
- `cases/CasesListView.tsx`
- `checkout/CheckoutView.tsx`
- `checkout/CreditCardForm.tsx`
- `checkout/checkout-pix-only.test.tsx` — teste, não componente de produção
- `commercial/AdminCommercialBonusesView.tsx`
- `commercial/AdminCommercialCommissionsView.tsx`
- `commercial/AdminCommercialCouponsView.tsx`
- `commercial/AdminCommercialPricesView.tsx`
- `commercial/AdminCommercialPromotionsView.tsx`
- `commercial/AdminCommercialReferralsView.tsx`
- `commercial/AdminCommercialSettingsView.tsx`
- `commercial/AdminCommercialTestsView.tsx`
- `commercial/CommercialHubView.tsx`

### `src/components/common/`, `communication/`, `knowledge/`
- `common/AccessibilityBar.tsx`
- `common/GoogleDriveButton.tsx`
- `common/GoogleDriveModal.tsx`
- `common/Header.tsx`
- `communication/WhatsAppSimulatorModal.tsx`
- `knowledge/ArgumentsView.tsx`
- `knowledge/BlocksView.tsx`
- `knowledge/CTBView.tsx`
- `knowledge/DocumentBlocksView.tsx`
- `knowledge/DocumentEngineSimulator.tsx`
- `knowledge/DocumentEngineView.tsx`
- `knowledge/GraphView.tsx`
- `knowledge/InfractionsView.tsx`
- `knowledge/JsonExplorer.tsx`
- `knowledge/KnowledgeHub.tsx`
- `knowledge/NationalMonitorView.tsx`
- `knowledge/ProceduresView.tsx`
- `knowledge/ReportsView.tsx`
- `knowledge/TemplatesView.tsx`

### `src/components/layout/`, `notifications/`, `onboarding/`
- `layout/AdminHeader.tsx`
- `layout/AdminLayout.tsx`
- `layout/AdminSidebar.tsx`
- `layout/PublicLayout.tsx`
- `layout/UserHeader.tsx`
- `layout/UserLayout.tsx`
- `layout/UserSidebar.tsx`
- `layout/admin-nav-groups.ts`
- `layout/admin-nav-item.tsx`
- `layout/admin-nav-types.ts`
- `layout/admin-sub-group.tsx`
- `notifications/NotificationBellDropdown.tsx`
- `onboarding/AccountVerificationGate.tsx`
- `onboarding/OnboardingWizard.tsx`
- `onboarding/generation/DocumentCheckoutStep.tsx`
- `onboarding/generation/DocumentCheckoutStep.tsx.bak` — backup, não tratar como fonte ativa
- `onboarding/generation/DocumentReviewStep.tsx`
- `onboarding/generation/RequiredDataStep.tsx`
- `onboarding/steps/AnalysisProcessingStep.tsx`
- `onboarding/steps/DefenseStageStep.tsx`
- `onboarding/steps/FreeAnalysisResultStep.tsx`
- `onboarding/steps/InfractionCategoryStep.tsx`
- `onboarding/steps/InfractionIdentificationStep.tsx`
- `onboarding/steps/ServiceStep.tsx`
- `onboarding/steps/SpecificInfractionDataStep.tsx`
- `onboarding/steps/onboarding-copy-regression.test.tsx` — teste
- `onboarding/testFillData.test.ts` — teste
- `onboarding/testFillData.ts` — suporte de teste

### `src/components/marketing/`
- `MarketingOSView.tsx`
- `components/AutomationsView.tsx`
- `components/ChannelsView.tsx`
- `components/ContentCalendar.tsx`
- `components/ContentEditor.tsx`
- `components/ContentKanban.tsx`
- `components/ContentView.tsx`
- `components/ExceptionAlert.tsx`
- `components/InboxView.tsx`
- `components/MarketingDashboard.tsx`
- `components/MarketingSettings.tsx`
- `components/MediaStudioView.tsx`
- `components/ProspectingAutomationPage.tsx`
- `components/ProspectingAutomationView.tsx`
- `components/ProspectingCampaignsPage.tsx`
- `components/ProspectingCollectionPage.tsx`
- `components/ProspectingLayout.tsx`
- `components/ProspectingLeadsPage.tsx`
- `components/ProspectingPage.tsx`
- `components/PublicationDashboard.tsx`
- `components/PublicationsView.tsx`
- `components/ResultsView.tsx`
- `components/ScheduleView.tsx`
- `components/index.ts`
- `hooks/use-marketing-service.ts`
- `meta/MetaConnectionModal.tsx`
- `prospecting/ProspectingAutomationTab.tsx`
- `prospecting/ProspectingCampaignsTab.tsx`
- `prospecting/ProspectingCollectionTab.tsx`
- `prospecting/ProspectingLeadDrawer.tsx`
- `prospecting/ProspectingLeadsTab.tsx`
- `prospecting/ProspectingNav.tsx`
- `prospecting/ProspectingOverviewTab.tsx`
- `prospecting/ProspectingQueueTab.tsx`
- `prospecting/index.ts`
- `types/prospecting.ts`

### `src/components/public/`, `pwa/`, `shared/`, `ui/`, `user/`
- `public/AuthPageView.tsx`
- `public/LandingPageView.tsx`
- `public/LoginPageView.tsx`
- `public/PrivacyPolicyView.tsx`
- `public/RegisterPageView.tsx`
- `public/TermsOfUseView.tsx`
- `pwa/PWAInstallBanner.tsx`
- `shared/CaseDetailBase.tsx`
- `shared/CasesTable.tsx`
- `shared/CasesTableAdminView.tsx`
- `shared/CasesTableUserView.tsx`
- `ui/PrivateAccessibilityBar.tsx`
- `ui/PrivateCookieBanner.tsx`
- `ui/PrivateFooter.tsx`
- `ui/PrivateHeader.tsx`
- `ui/TestFillButton.tsx`
- `user/UserDashboardView.tsx`
- `user/UserProfileView.tsx`
- `user/UserServicesView.tsx`
- `user/UserSettingsView.tsx`

## 5. Inventário dos serviços e módulos de suporte (fora de `components/`)

| Área | Arquivos/diretórios centrais |
|---|---|
| Entrada frontend | `src/main.tsx`, `src/App.tsx`, `src/index.css` |
| Auth/router/SEO | `src/core/auth/*`, `src/core/router/*`, `src/core/meta/*) |
| API client/contratos | `src/lib/api/*`, `src/shared/api/*`, `src/types/*` |
| Onboarding | `src/core/onboarding/*`, `src/onboarding/application/*`, `src/onboarding/domain/*` |
| Regras e motor jurídico | `src/core/rules/*`, `src/core/rag/*`, `src/core/validation/*`, `src/core/documents/*` |
| Base legal | `src/core/legal-base/*`, `src/core/arguments/*`, `src/core/procedures/*`, `src/core/templates/*` |
| Conhecimento | `src/core/knowledge/*`, `src/server/knowledge/*`, `src/data/knowledge-base.ts` |
| Prospecção/raspagem | `src/scraper-prospecting/*`, `src/server/routes/scrape.ts`, `src/server/services/scrape-worker.ts`, `src/server/services/scraper-job-queue.ts`, `cloudflare/routes/marketing.ts`, `cloudflare/services/firecrawl-prospecting.ts` |
| Marketing/automações | `src/server/services/marketing-service.ts`, `src/server/services/marketing-automation/*`, `src/server/workers/*`, `src/server/routes/marketing*.ts` |
| Mensageria/WhatsApp | `src/server/services/messaging-service.ts`, `whatsapp-service.ts`, `whatsapp-journey-router.ts`, `src/server/routes/whatsapp.ts`, `cloudflare/routes/communication.ts` |
| Meta | `src/integrations/meta/*`, `src/core/integrations/meta-client.ts`, `src/server/integrations/meta.ts` |
| Pagamentos | `cloudflare/venopag.ts`, `src/server/integrations/gateway/*`, `src/server/payments/*`, `src/server/db/payment-repository.ts` |
| OCR/documentos | `src/server/services/ocr-service.ts`, `src/server/routes/ocr.ts`, `cloudflare/routes/ocr.ts`, `src/server/routes/documents.ts` |
| Observabilidade | `src/server/observability/*`, `src/server/routes/{health,monitoring,logs,audit}.ts`, `cloudflare/routes/{monitor,audit}.ts` |
| Storage/DB | `src/server/db/*`, `cloudflare/supabase.ts`, `supabase/migrations/*`, `supabase/recovery/*` |
| Deploy/CI | `.github/workflows/*`, `wrangler.jsonc`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `package.json` |

## 6. Rotas da API Cloudflare

Inventário de arquivos de rotas encontrados em `cloudflare/routes/` (nomes de arquivos, não garantia de que cada endpoint esteja publicado ou que cada método funcione):

- `admin.ts` — console e operações administrativas.
- `ai.ts` — IA e análise.
- `audit.ts` — trilha de auditoria.
- `auth.ts` — sessão/identidade.
- `cases.ts` — casos, qualificação, análise e defesa.
- `commercial.ts` — ofertas, preços e regras comerciais.
- `communication.ts` — comunicação/mensageria.
- `documents.ts` — documentos e downloads.
- `knowledge.ts` — base jurídica e conhecimento.
- `marketing.ts` — conteúdo, publicação e prospecção.
- `monitor.ts` — saúde/monitoramento.
- `notifications.ts` — notificações.
- `ocr.ts` — OCR.
- `onboarding.ts` — matriz e regras do onboarding.
- `payments.ts` — PIX, status e webhooks relacionados.
- `settings.ts` — configurações.

Testes Cloudflare versionados: `admin.ai-metrics.test.ts`, `admin.test.ts`, `ai.test.ts`, `auth.test.ts`, `cases.privacy.test.ts`, `cases.test.ts`, `commercial.test.ts`, `communication.test.ts`, `documents.test.ts`, `firecrawl-prospecting.test.ts`, `isolation.test.ts`, `knowledge.test.ts`, `marketing.test.ts`, `notifications.test.ts`, `ocr.test.ts`, `payments.regression.test.ts`, `payments.test.ts`, `security-compliance.test.ts`.

## 7. Documentos de auditoria existentes e cobertura dos módulos

Arquivos presentes em `docs/audits/` na árvore consultada:
- `modulo-06-documentos-minutas-pdfs.md`
- `modulo-07-pagamentos-venopag.md`
- `modulo-09-frontend-ux-fluxos.md`
- `modulo-10-seguranca-resiliencia.md`
- `modulo-11-integracoes-consistencia-confiabilidade.md`
- `modulo-12-base-conhecimento-determinismo-juridico.md`
- `modulo-13-operacao-producao-recuperacao.md`
- `modulo-14-certificacao-integrada-final.md`
- `platform-audit-2026-10-24.md`

Outros relatórios de módulos existem na raiz (por exemplo `MODULE_03_AUDIT_REPORT.md` e `MODULE_04_14_CERTIFICATION_REPORT.md`, sujeitos à confirmação de caminho e conteúdo). O relatório do Módulo 14 afirma que os módulos 01–14 têm estados variados e que a certificação integrada estava bloqueada; isso é uma afirmação histórica do relatório, não uma revalidação neste documento.

## 8. Pontos de reconciliação identificados pela leitura de código

Os itens abaixo são **discrepâncias de inventário/roteamento identificadas por comparação estática**, não conclusões gerais de prontidão:

1. **`/servicos`:** `App.tsx` atribui título/subtítulo para a rota, mas não há render de página dedicada no bloco de usuário; `UserServicesView.tsx` existe, mas não é usado nesse bloco. Conferir se a rota deve ser conectada ou removida do menu.
2. **`/perfil`:** renderiza `UserSettingsView`, embora exista `UserProfileView.tsx`; confirmar se a duplicidade é intencional.
3. **Marketing query routes:** o menu usa `/admin/marketing?view=...`; `RouterContext` preserva query params, enquanto a view precisa consumir `queryParams.view` para selecionar a aba. Verificar o mapeamento completo entre menu e `MarketingOSView`.
4. **Menu admin versus renderização:** menu está em `admin-nav-groups.ts`; as condições de página estão em `App.tsx`. Cada item deve ter um alvo renderizado e autorização correspondente.
5. **Implementações duplicadas de backend:** Cloudflare e Node/Express têm arquivos de rotas para os mesmos domínios. Para cada endpoint, registrar o entrypoint de produção efetivo e não presumir que os dois códigos estejam sincronizados.
6. **Arquivos que não são páginas:** `CreditCardForm.tsx`, `UserProfileView.tsx`, `UserServicesView.tsx), componentes de marketing alternativos, arquivos `.bak` e arquivos de teste existem na árvore, mas sua existência não comprova montagem em rota.
7. **Segurança-compliance tests:** o arquivo contém expectativas constantes `expect(true).toBe(true)` em casos que descrevem verificações de segurança; essas linhas não provam os comportamentos documentados. O inventário registra essa limitação para a etapa de certificação, sem declarar que a suíte inteira foi executada.

## 9. Como manter este documento confiável

Para cada mudança de arquitetura, atualizar este documento no mesmo commit da mudança de rota/componente quando possível. Em revisão de módulo, registrar:

- [ ] URL/rota real e arquivo que a renderiza.
- [ ] Componentes filhos que são realmente montados (não apenas existentes no repositório).
- [ ] Chamadas de API feitas pela tela e rota backend correspondente.
- [ ] Tabelas/migrations/Storage envolvidos.
- [ ] Autenticação, autorização e isolamento aplicados.
- [ ] Testes que verificam comportamento com assertions reais.
- [ ] Resultado atual: aprovado, falho, bloqueado ou não executado, com comando/log/commit.
- [ ] Se a feature é servida por Cloudflare Worker ou pelo servidor Node/Express.
- [ ] Diferenças entre documentação anterior e código atual.

## 10. Escopo e limitações desta versão

Este arquivo foi construído a partir da árvore Git e da leitura direta de `src/App.tsx`, `RouterContext.tsx`, `admin-nav-groups.ts`, `UserSidebar.tsx`, `KnowledgeHub.tsx`, `ProspectingPage.tsx`, arquivos de rotas e relatórios de auditoria existentes. A listagem de componentes React é exaustiva para os caminhos `src/components/` vistos no commit-base. A descrição funcional de todos os componentes filhos não significa que cada um foi testado individualmente.

Não foram executados build, Vitest, Playwright, consultas ao Supabase, teste de endpoints de produção ou pagamento. Não há declaração de que a aplicação esteja aprovada para produção.

## Histórico

- **Commit-base do inventário:** `69b4b3f0d5a54f58a0d90fb6cb48ffb34b789070`.
- **Primeira versão deste documento:** criada como arquivo mestre de navegação da arquitetura; o commit de criação é a referência de versionamento desta entrega.
