# E2E CONTRACT MAP — ADEUS MULTA

**Estado reconciliado:** `main` em `d8e349b9ebd18212a71136d66bc17d22fdc8ff29`  
**Finalidade:** mapa contratual atual para a Fase 1.  
**Regra:** existência de código não equivale a E2E comprovado.

## 1. ENTRADA E ONBOARDING ATUAL

O frontend atual tem **uma única implementação canônica** em `src/onboarding/`, promovida da antiga árvore V2 no commit `d8e349b9ebd18212a71136d66bc17d22fdc8ff29`.

A página atual `src/onboarding/ui/OnboardingPage.tsx` organiza o fluxo em oito estados:

```text
case → facts → evidence → diagnosis → qualification → review → payment → generation
```

A implementação usa `useOnboarding()` e uma aplicação HTTP (`createOnboardingHttpApplication`). O antigo mapa de dois frontends concorrentes não representa mais o estado atual.

**Observação:** ainda existem endpoints backend com o prefixo `/api/onboarding-v2/`. Isso não representa, por si só, dois frontends. A necessidade de renomear/remover o sufixo deve ser decidida após a auditoria contratual.

## 2. CONTRATOS ATUAIS IDENTIFICADOS

| Etapa | Contrato atual | Estado da prova |
|---|---|---|
| Entrada | `/novo-caso` e alias `/onboarding` | 🟡 código/rota; E2E não provado |
| Auth | Supabase Auth + JWT; `/api/auth/me` | 🟡 contrato identificado; jornada real não provada |
| Draft | `POST /api/onboarding-v2/draft` | 🟡 identificado |
| Atualização | `PUT /api/onboarding-v2/draft` | 🟡 identificado |
| Evidência | `POST /api/onboarding-v2/cases/:id/evidence` | 🟡 identificado |
| Análise | `POST /api/onboarding-v2/cases/:id/analysis` | 🟡 identificado |
| Qualificação | `PUT /api/onboarding-v2/cases/:id/qualification` | 🟡 identificado |
| PIX | `POST /api/payments/pix/create` | 🟡 identificado; gateway real não provado |
| Status PIX | `GET /api/payments/pix/status/:reference?caseId=...` | 🟡 identificado |
| Webhook | `POST /api/webhooks/pagbank` | 🟡 assinatura/handler identificados; evento real não provado |
| Geração | `POST /api/cases/:id/generate-defense` | 🟡 identificado; documento real não provado |
| Caso final | `GET /api/cases/:id` | 🟡 identificado |
| Storage/URL | retornado pelo contrato de geração quando disponível | 🔴 persistência/URL final ainda não comprovadas |

## 3. DATA LINEAGE — ALVOS OBRIGATÓRIOS DA FASE 1

### `user_id`

Origem esperada: Supabase Auth/JWT.  
Persistência: `cases.user_id`.  
Regra atual: ownership autenticado deve usar UUID canônico, não email.

Correção registrada: `f5d70687f545411d06ac793dc12a7ad6738ea2f3`.

**Fase 1 deve provar:** mesmo UUID atravessa auth → caso → pagamento/consulta → documento, sem identidade paralela.

### `case_id`

O estado do hook mantém `state.caseId`, retornado por `createDraft()` e reutilizado nas operações seguintes.

`CaseRepository` persiste por `app_ref`/UUID e faz write-through no Supabase por padrão.

Correções registradas:
- persistência fail-closed: `8a1a1cf2b0559e53c7a3e35ca0de86cbc41d30a9`;
- ID de caso não previsível e identidade canônica: `f5d70687f545411d06ac793dc12a7ad6738ea2f3`.

**Fase 1 deve provar:** criação → cold start → recuperação retorna o mesmo caso.

### `analysis_id`

O contrato atual retorna `CaseAnalysis` associado ao caso. O mapa não deve inventar uma entidade `analysis_id` separada sem confirmar o schema/persistência.

**Fase 1 deve provar:** qual identificador, se houver, é a chave canônica da análise; qual payload é persistido em `analysis_json`; e qual versão alimenta a defesa.

### `recommendedArguments`

No fluxo de geração automática do pagamento, `generateDefenseDraftForDomain()` usa `domain.analysis?.recommendedArguments` como entrada de `RagPipeline.generateDefenseDraft`.

**Fase 1 deve provar:** origem → persistência → recuperação → `recommendedArguments` → geração, sem divergência entre análise exibida e análise usada no documento.

### `payment_id`

O gateway fornece referência/order ID. O webhook PagBank normaliza a referência e tenta associá-la ao caso via `reference_id`/`referenceId`.

**Fase 1 deve provar:** uma única referência canônica relaciona gateway → webhook → `payment_orders` → caso, com idempotência e sem dupla confirmação.

### `document_id`

O contrato atual não demonstra ainda uma entidade documental independente. A geração retorna um `GenerationResult` e o caso pode conter `defenseDraft`.

**Fase 1 deve determinar explicitamente:** se existe `document_id` persistido; se não existe, qual é a identidade canônica do documento e onde seu storage/URL é persistido.

## 4. PAGAMENTO E WEBHOOK

O handler atual do webhook PagBank:

1. valida assinatura;
2. extrai referência do caso;
3. quando o status é `PAID`, marca pagamento/caso como confirmado;
4. tenta gerar automaticamente a defesa;
5. persiste o caso.

A geração automática é **não-bloqueante**: se falhar, o pagamento permanece confirmado. Isso evita fabricar uma defesa, mas deixa uma necessidade de recuperação operacional.

**Conclusão:** pagamento → documento continua não comprovado e deve permanecer como bloqueador de prova até existir evidência e contrato de recuperação.

## 5. PAGBANK EM PRODUÇÃO

Os commits `03f1f4ce3e4ecaf2c1ee0c6b55b628210c1c0f62` e `fbc83e3c7bf10da34678bde6a738dfac5f03f472` alteraram o contrato de produção: PagBank configurado pode operar em produção e o modo é derivado do ambiente Vercel.

O `prodAuth` atual documenta JWT para checkout normal, sem exigência de admin.

**Achado reconciliado:** o antigo "PagBank cidadão exige admin" está desatualizado como fato de código.  
**Pendente:** prova real em produção, com gateway configurado e usuário cidadão.

## 6. CLAIM TOKEN

O frontend atual guarda `defesai_onboarding_claim_token` em `sessionStorage` e envia `X-Claim-Token` quando disponível.

**Pendente crítico:** identificar a origem do token emitido no backend, medir entropia/imprevisibilidade, confirmar escopo, expiração, uso único e associação ao caso.

O antigo achado `claimToken = caseId` não deve ser repetido como fato atual sem verificar o backend vigente.

## 7. FALLBACKS / FALSOS POSITIVOS

### Persistência

`CaseRepository` usa Supabase write-through por padrão. Fallback em memória exige explicitamente `ALLOW_IN_MEMORY_CASE_PERSISTENCE=true`.

**Status:** 🟢 contrato fail-closed identificado; persistência real ainda precisa de prova E2E.

### Geração manual

O contrato `generateDocument()` chama `/api/cases/:id/generate-defense` e transforma o retorno em `status: 'ready'` no adapter HTTP.

**Risco de auditoria:** o adapter força `status: 'ready'` no retorno. A Fase 1 deve verificar se isso pode mascarar uma resposta incompleta ou erro sem `defenseDraft`/URL.

### Geração automática

O webhook tenta gerar a defesa, mas mantém pagamento confirmado se a geração falhar.

**Status:** 🟡 comportamento conhecido; mecanismo de recuperação não comprovado.

## 8. MATRIZ RECONCILIADA

| Domínio | Código atual | Persistência identificada | E2E comprovado |
|---|---|---|---|
| Auth | Supabase Auth/JWT | Auth + `cases.user_id` | 🟠 Não |
| Onboarding | `src/onboarding/` | estado React; caso no backend | 🟠 Não |
| Case | `createDraft` + CaseRepository | Supabase `cases` | 🟠 Não |
| Evidence/OCR | endpoint de evidence | campos de evidence/OCR no caso | 🟠 Não |
| Analysis | endpoint backend | `analysis_json` | 🟠 Não |
| Payment | PIX create/status + PagBank | `payment_orders`/caso | 🟠 Não |
| Webhook | PagBank HMAC + referência | caso/payment | 🟠 Não |
| Defense | RagPipeline + DocumentAssemblyEngine | `defense_draft_json` | 🟠 Não |
| Document | GenerationResult/caso | storage/URL ainda não confirmado | 🟠 Não |

## 9. PENDÊNCIAS QUE A FASE 1 DEVE FECHAR

1. `user_id` completo e sem identidade paralela.
2. `case_id` completo, incluindo cold start.
3. contrato real de `analysis_id`/`analysis_json`.
4. lineage `analysis → recommendedArguments → defense`.
5. contrato `payment_id`/order/reference e `payment_orders`.
6. webhook idempotente e associação ao mesmo caso.
7. origem/entropia/expiração do claim token.
8. contrato real de geração e ausência de status sintético.
9. identidade do documento e storage/URL.
10. recuperação após pagamento confirmado e geração falha.
11. mocks/fallbacks/controles de teste acessíveis em produção.
12. prova de que o fluxo atual do frontend usa somente a implementação canônica.

## 10. CONCLUSÃO

O mapa anterior ficou parcialmente obsoleto porque o frontend de onboarding foi consolidado e os contratos de pagamento/autenticação foram alterados depois da Fase 0. Este documento é a nova base para a Fase 1.

**Golden Path:** 🟠 NÃO COMPROVADO.  
**Próxima etapa:** Fase 1 — Auditoria de Contratos e Data Lineage.  
**Não executar Fase 2/3/4 automaticamente.**
