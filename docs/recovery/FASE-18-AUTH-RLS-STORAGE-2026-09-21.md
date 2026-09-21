# FASE 18 — Auth + RLS + Storage (Supabase canônico)

**Data**: 2026-09-21
**Projeto Supabase canônico**: `llmxnpgjpxcvyrqjkfwb` (`supabase/config.toml`)
**Proibido / histórico**: `sgomwklorpzdwdubtmgg` — não usado em nenhuma query
**Repo**: Tokenizaa/AdeusMultas-Defesa- (branch `main`, HEAD inicial `e1a9879`)
**Escopo**: auditoria e hardening de Auth, RLS e Storage; testes de isolamento; migrations versionadas.

---

## 1. Objetivo

Fechar FASE 18: mapear e endurecer o modelo de Auth + RLS + Storage do Supabase canônico
`llmxnpgjpxcvyrqjkfwb`, classificar todas as tabelas (ownership / administrativa / pública),
aplicar policies somente onde o código confirma, habilitar RLS onde estava desligado,
proteger storage de documentos por cadeia case→user, tratar advisor de segurança e
registrar tudo em migrations versionadas + documentação.

## 2. Estado encontrado

- **Auth**: 4 usuários em `auth.users`, 4 perfis em `user_profiles` (2 admin, 2 citizen).
  Trigger `on_auth_user_created` → `handle_new_user()` (SECURITY DEFINER, insere em
  `public.profiles` legacy). Perfil `user_profiles` é criado pelo frontend no signup
  (`src/core/auth/AuthContext.tsx` linha 208, role fixa `citizen`).
- **Cases**: 47 linhas, 44 de um admin, 3 anônimas (sem `user_id`; fluxo claim_token).
  Relação de ownership: `cases.user_id → auth.uid()`. RLS ON com policies
  (`cases_select_own`, `cases_own_all`, `cases_admin_all`, `cases_insert_own`,
  `cases_update_own`, `cases_service_full`).
- **RLS**: 53 tabelas em `public` com RLS ON; **1 EXPOSTA**: `messaging_messages` (RLS OFF,
  13 linhas legíveis por anon/authenticated) — **ERRO crítico do advisor**.
- **17 tabelas com RLS ON sem policy** (deny-all na prática): collection_runs, commercial_offers,
  commercial_orders, commissions, documents, marketing_automation_queue,
  marketing_automation_state, marketing_lead_campaigns, marketing_leads, marketing_messages,
  messaging_contacts, messaging_conversations, notification_subscriptions, orders, payments,
  promotions, service_pricings.
- **Storage**: 6 buckets. Público: `marketing-assets` (8 objetos, uso real confirmado pelo
  código/presença de objetos). Privados: `ai-policy`, `case-documents` (0 objetos, sem policy),
  `lgpd-exports`, `skill-assets`, `whatsapp-media`. Policies de storage existentes cobrem
  marketing-assets (leitura pública + admin) e reads admin dos demais buckets.
- **Funções sinalizadas**: `public.domain_to_uuid` (IMMUTABLE; usada para IDs determinísticos
  em meta_accounts) e `public.update_documenso_envelopes_updated_at` (trigger em
  documenso_envelopes) — ambas sem `search_path` fixo.
- **Advisor security (antes)**: rls_disabled_in_public ERROR 1; function_search_path_mutable WARN 2;
  rls_enabled_no_policy INFO 17; extension_in_public WARN 3; auth_leaked_password_protection WARN 1.

## 3. Tabelas auditadas

Auditoria completa de `pg_class`/`pg_policies`/`pg_attribute` em `public` (53 tabelas) +
`storage.objects`/`storage.buckets`. Lista integral das policies atuais coletada na ETAPA 2
(base da classificação). Sem inventário de dados pessoais em relatório.

## 4. RLS encontrado

- 53/54 tabelas públicas com RLS ON. Única exceção: `messaging_messages` (RLS OFF) — corrigida.
- Owner flags: `relrowsecurity=true`, `relforcerowsecurity=false` (padrão Supabase).

## 5. Policies encontradas

Ver listing completo em `pg_policies` (ETAPA 2). Resumo por padrão:
- **Admin policies** com subquery inline em `user_profiles` (ex.: `cases_admin_all`,
  `app_settings_admin_all`, `documenso_*`) — padrão legado que causava **recursão RLS**
  latente (ver seção 7, item 4).
- **Policies órfãs/duplicadas**: `app_settings_select_public` (SELECT true — expunha
  settings privadas), `user_profiles_update_own` (UPDATE próprio sem restrição de role —
  escalação), `coupons_select_public`/`knowledge_*_select_public`/`referral_config_select_public`
  (leitura pública intencional de catálogo/conteúdo — mantidas).

## 6. Problemas

1. **`messaging_messages` com RLS OFF** — 13 linhas expostas a anon/authenticated (ERRO advisor).
2. **Escalação de role em `user_profiles`**: INSERT próprio sem restrição de role
   (`user_profiles_insert_trigger`, `user_profiles_own_insert`) e UPDATE próprio
   (`user_profiles_update_own` legada + `user_profiles_own_update`) permitiam criar/alterar
   o próprio perfil com `role='admin'`.
3. **`app_settings_select_public` (SELECT true)** expunha settings privadas (`is_public=false`).
4. **Recursão RLS infinita**: policies de `user_profiles` com subquery self-referencial
   (`auth.uid() IN (SELECT user_id FROM user_profiles WHERE role='admin')`) → qualquer leitura
   autenticada de tabela cuja policy referencia `user_profiles` (cases, documents, storage…)
   estourava `infinite recursion detected in policy for relation "user_profiles"` —
   bug **latente pré-existente**, comprovado pelo teste C1 inicial (falhou antes do fix).
5. **Documents/storage `case-documents` sem policy** — bucket privado sem nenhuma policy
   (deny-all) e `documents` sem policy (deny-all) apesar de ser dado do usuário.
6. **`notification_subscriptions` sem policy** apesar de coluna `user_id` (dado do usuário).
7. **search_path mutável** em `domain_to_uuid` e `update_documenso_envelopes_updated_at`.
8. **Leaked password protection desligado** — config de Auth via dashboard (externo).
9. **Extensões em `public`** (vector, pg_trgm, citext) — WARN, mover = risco ao RAG.

## 7. Alterações realizadas

Migrations aplicadas no canônico via MCP + arquivos versionados em `supabase/migrations/`
(detalhe em seção 13). Por objeto:

- **`messaging_messages`** (B — administrativa/interna, escrita server-side via
  `getSupabaseServerClient`): `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Zero policies →
  deny-all p/ anon/authenticated; acesso exclusivo service_role. **Fechou o ERROR do advisor.**
- **`messaging_contacts` / `messaging_conversations`** (B — administrativa/interna): RLS
  habilitado via MCP durante a fase (drift — fora de migration). Versionado em
  `20260921000005_fase_18_messaging_rls_contacts_conversations.sql` para replay idempotente
  (supabase db reset/recreate). Zero policies → deny-all p/ anon/authenticated, coerente com
  messaging_messages. **As 3 tabelas de messaging estão RLS ON versionadas.**
- **`documents`** (A — ownership usuário via cadeia `documents.case_id → cases.user_id`):
  policy `documents_select_own` (SELECT authenticated, EXISTS chain) + `documents_admin_all`
  (ALL authenticated admin). INSERT/UPDATE/DELETE sem policy → server-side service_role.
- **`notification_subscriptions`** (A — ownership `user_id`): policies
  `notification_subscriptions_select_own/insert_own/update_own/delete_own` (authenticated,
  `user_id = auth.uid()`).
- **`user_profiles`** (hardening de escalação):
  - `user_profiles_insert_trigger` e `user_profiles_own_insert` recriadas com
    `WITH CHECK (auth.uid() = user_id AND role = 'citizen'::user_role)` — INSERT self com
    role admin bloqueado.
  - `REVOKE UPDATE (role) ... FROM anon, authenticated` — **no-op** (privilege vem de grant de
    tabela, sem ACL de coluna) — documentado, substituído por fix via WITH CHECK.
  - Criada `public.is_admin()` (SECURITY DEFINER, `search_path=pg_catalog`) e reescritas as
    5 policies self-referenciais (`Admins can update roles`, `Admins can view all profiles`,
    `user_profiles_admin_all`, `user_profiles_own_select`, `user_profiles_own_update`) usando
    `is_admin()` — **resolve a recursão RLS**.
  - Criada `public.current_role_name()` (SECURITY DEFINER) e `user_profiles_own_update` com
    `WITH CHECK ((user_id=auth.uid() AND role=current_role_name()) OR is_admin())` — UPDATE
    próprio de role bloqueado; UPDATE legítimo (nome etc.) preservado (contra-prova C8b = 1).
  - **Drop** da policy legada `user_profiles_update_own` (UPDATE próprio sem restrição de role;
    redundante com `user_profiles_own_update` hardened; frontend só faz INSERT em user_profiles).
- **`app_settings`**: `app_settings_select_public` recriada com `USING (is_public = true)` —
  settings privadas deixam de vazar. Server (service_role) e policies anon/auth_read intocados.
- **`storage.objects` — bucket `case-documents`**: policies `case documents read own` (SELECT,
  cadeia `(storage.foldername(name))[1]::uuid → cases.user_id = auth.uid()`), `case documents
  insert own` (INSERT própria) e `case documents admin all` (ALL admin). Convenção de path
  definida: `case-documents/<case_id>/<arquivo>` (nenhum código usa hoje — schema-only).
  `marketing-assets` permanece público (8 objetos reais).
- **search_path**: `ALTER FUNCTION public.domain_to_uuid SET search_path = pg_catalog;` e
  `ALTER FUNCTION public.update_documenso_envelopes_updated_at SET search_path = pg_catalog;`
  (ambas usam apenas builtins pg_catalog / qualificados; triggers e policies que as chamam
  verificados em `pg_trigger`/`pg_policies` antes).

## 8. Alterações deliberadamente NÃO realizadas

- **Policies públicas para silenciar advisor** nas 16 tabelas restantes com RLS-no-policy
  (collection_runs, commercial_*, commissions, marketing_*, messaging_*, orders, payments,
  promotions, service_pricings): **deny-all intencional** (B — administrativa/interna,
  server-side service_role confirmado por código: `commercial-repository`, `messaging-service`,
  workers de marketing/scraping). Sem policy pública — advisor documentado, não silenciado.
- **Mover extensões** `vector`/`pg_trgm`/`citext` de `public`: risco alto ao pipeline RAG —
  **PENDENTE** (exige migração dedicada + testes).
- **Alterar fluxo de claim/anônimo de cases**: `is_anonymous`/`claim_token` preservados;
  policies de INSERT/UPDATE de cases mantidas como estavam (nenhuma mudança em cases nesta fase).
- **Alterar policies de catálogo público** (`coupons_select_public`, `knowledge_*_select_public`,
  `referral_config_select_public`, `promotion_campaigns_select_public`): uso de leitura pública
  de conteúdo confirmado — mantidas.
- **Reset/edição de usuários Auth**: nenhum usuário tocado.
- **service_role no frontend**: nada alterado (verificação ETAPA 11 limpa).
- **Rotação de chaves**: adiada por decisão do usuário (ver seção 15, risco 1).

## 9. Storage

**Antes**: 6 buckets; `marketing-assets` público (8 objetos, policies read público + admin
CRUD); demais privados com reads admin; `case-documents` privado **sem nenhuma policy**
(deny-all). **Depois**: `case-documents` ganhou policies por cadeia case→user (read/insert
own + admin all). Demais buckets e policies intocados. `marketing-assets` permanece público
(uso real: 8 objetos). Nenhum bucket tornou-se público/privado por suposição — `documents`
(0 linhas) e `case-documents` (0 objetos) não têm consumidor no código (schema-only; fluxo
OCR/upload ainda não wireado) — documentado.

## 10. Auth

Fluxo mapeado: anon → signup (`supabase.auth.signUp` + insert em `user_profiles` com
role `citizen`) → authenticated → `cases.user_id` → `documents.case_id` → `payment_orders`.
Trigger `handle_new_user()` cria perfil na tabela legacy `profiles` (não `user_profiles`).
`auth-middleware` (server) usa `supabase.auth.getUser(token)` com client server (service_role
preferido, fallback anon só p/ token verify — não afetado por RLS de `public`). Escalação de
role fechada (INSERT e UPDATE próprios não podem mais definir `role='admin'`); admin segue
via RPC `admin_update_user_role_by_email` (SECURITY DEFINER, verificada).

## 11. Testes

Executados em transações reais no canônico (simulação JWT via
`set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE`; fixtures criadas e ROLLBACK —
nenhum dado fake persistido). Usuários cidadãos: UUIDs mascarados no relatório.

| # | Cenário | Resultado |
|---|---|---|
| C1 | A (citizen) SELECT próprio case | ✅ 1 linha |
| C2 | A SELECT case de B | ✅ 0 linhas (isolamento) |
| C3 | A UPDATE case de B | ✅ 0 linhas |
| C4 | citizen → orders/payments/commercial_offers/collection_runs/marketing_leads/service_pricings | ✅ 0 linhas (deny-all) |
| C5 | anon → cases / messaging_messages / messaging_contacts / app_settings privadas / payment_orders | ✅ 0 linhas (incl. RLS agora ON em messaging_messages) |
| C6 | A SELECT próprios documents | ✅ 1 linha |
| C7 | A SELECT document de outro case | ✅ 0 linhas |
| C8a | citizen UPDATE próprio user_profiles.role='admin' | ✅ BLOQUEADO (42501 RLS) |
| C8b | citizen UPDATE próprio nome | ✅ 1 linha (fluxo legítimo preservado) |
| C9a | A (auth) storage objects caso próprio | ✅ 1 linha |
| C9b | A storage objects de outro case | ✅ 0 linhas |
| C9c | storage marketing-assets (público) | ✅ 8 (inalterado) |

Evidência completa (SQL + saídas) registrada nesta seção; nenhum dado pessoal em arquivo.

## 12. Security Advisor antes/depois (anexado)

**Antes**: ERROR `rls_disabled_in_public` 1 (messaging_messages) · WARN `function_search_path_mutable`
2 · INFO `rls_enabled_no_policy` 17 · WARN `extension_in_public` 3 · WARN
`auth_leaked_password_protection` 1.
**Depois**: ERROR `rls_disabled_in_public` **0** · `function_search_path_mutable` **0** ·
`rls_enabled_no_policy` **16** (todas deny-all intencionais B-classe, documentado) ·
`extension_in_public` 3 (PENDENTE) · `auth_leaked_password_protection` 1 (PENDENTE externo) ·
**NOVOS WARNs**: `anon_security_definer_function_executable` 2 e
`authenticated_security_definer_function_executable` 2 — `is_admin()` e `current_role_name()`
executáveis por anon/authenticated. **Intencional**: policies as chamam no contexto do
role querying; ambas retornam apenas boolean/role do próprio `auth.uid()` (nenhum dado
exposto; anon recebe false/NULL). Mantidas e documentadas.
Saída bruta anexada no tracking da sessão (advisor pós-migração 2026-09-21T20:19:20.922Z).

## 13. Migrations criadas

| Arquivo (`supabase/migrations/`) | Conteúdo |
|---|---|
| `20260921000001_fase_18_auth_rls_storage.sql` | RLS em messaging_messages; policies documents (own/admin); notification_subscriptions (own 4x); hardening insert user_profiles + REVOKE (no-op, registrado); app_settings_select_public is_public; storage case-documents (read/insert own + admin); search_path ×2 funções |
| `20260921000002_fase_18_rls_recursion_fix.sql` | `is_admin()` SECURITY DEFINER; reescrita das 5 policies self-referenciais de user_profiles |
| `20260921000003_fase_18_role_update_hardening.sql` | `current_role_name()` SECURITY DEFINER; `user_profiles_own_update` WITH CHECK preserva role |
| `20260921000004_fase_18_drop_legacy_profile_update_policy.sql` | Drop `user_profiles_update_own` (escalação) |
| `20260921000005_fase_18_messaging_rls_contacts_conversations.sql` | RLS em messaging_contacts + messaging_conversations — deny-all (sem policies), coerente com messaging_messages; versiona estado real do banco (habilitadas via MCP fora da migration) p/ replay idempotente |

Aplicadas no canônico via MCP (`fase_18_auth_rls_storage`, `fase_18_rls_recursion_fix`,
`fase_18_role_update_hardening`, `fase_18_drop_legacy_profile_update_policy`,
`fase_18_messaging_rls_contacts_conversations`). Nada destrutivo;
todas idempotentes (DROP IF EXISTS + CREATE).

## 14. Build

`npm run build` ✅ (vite build 1897 módulos + bundle api/index.mjs; 22s).
`npm run lint` (`tsc --noEmit`): **59 erros PRÉ-EXISTENTES**, confirmados no HEAD `e1a9879`,
todos em `src/server/workers/scraping.worker.ts`, `src/server/workers/ocr.worker.ts`,
`src/server/workers/messaging.worker.ts` e `src/shared/api/http.ts` — **fora do escopo desta
fase, NÃO corrigidos** (registrado). Zero erros novos introduzidos.

## 15. Riscos restantes

1. **Rotação de chaves adiada por decisão do usuário** (.env, .dev.vars, cloudflare/.dev.vars,
   .env.audit-e2e não tocados). **Procedimento obrigatório no momento da rotação**:
   atualizar em conjunto (1) `.env`, (2) `.dev.vars`, (3) `cloudflare/.dev.vars`,
   (4) `.env.audit-e2e`, (5) secrets do Cloudflare Workers e (6) painel Supabase — sincronia
   total, senão clientes com chave antiga quebram. Não commitar valores.
2. **Leaked password protection** desligado — configuração do Auth via dashboard Supabase
   (painel → Auth → Password Protection). **PENDENTE externo**; não resolve por banco.
3. **Extensões em `public`** (vector/pg_trgm/citext) — PENDENTE; mover exige migração dedicada
   e revalidação do RAG.
4. **Fluxo documents/storage não wireado**: `documents` (0) e `case-documents` (0) sem
   consumidor em `src`. Policies prontas; quando OCR/upload forem implementados, validar
   convenção `case-documents/<case_id>/<arquivo>`.
5. **Fallback anon no server client** (`supabase-server.ts`): se `SUPABASE_SERVICE_ROLE_KEY`
   ausente, cliente server usa anon — com RLS deny-all, persistência de messaging falha
   (engole erros). Exigir service_role em produção.
6. **Admin com 44 cases**: usuário admin acumula cases em produção; revisão futura de
   higiene de dados (fora do escopo RLS).
7. **is_admin()/current_role_name() executáveis via API** (`/rest/v1/rpc/...`) — intencional
   (policies dependem); retornos inócuos (boolean/role próprio). Se quiser bloquear RPC
   público: revogar EXECUTE e usar security definer wrapper — **não feito** porque as
   policies precisam do EXECUTE no contexto do role.
8. **Policies de catálogo público** (coupons/knowledge/referral/promotion_campaigns SELECT
   true) expõem conteúdo não crítico — decisão de produto, mantida.

## 16. Conclusão

FASE 18 **CONCLUÍDA**. Isolamento multi-tenant provado por testes reais (cidadão A × cidadão B
em cases/documents/storage: zero vazamento; deny-all em tabelas administrativas; anon
bloqueado). Vulnerabilidades críticas fechadas: messaging_messages exposto → RLS ON;
escalação de role em user_profiles → bloqueada (INSERT + UPDATE); app_settings privadas →
filtradas; recursão RLS latente → eliminada via is_admin()/current_role_name(). Advisor:
ERROR 1 → 0, search_path 2 → 0. 16 tabelas restantes sem policy são deny-all intencionais
(B-classe). Pendências externas registradas (leaked password protection, extensões, rotação
de chaves com procedimento de sync obrigatório). Build passa; 59 erros tsc pré-existentes
intocados.