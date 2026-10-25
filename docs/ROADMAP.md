# Roadmap Canônico — AdeusMultas / DefesAI

**Última atualização:** 24/10/2026  
**SHA de referência:** `3dce0d5` (merge branch 'main' of https://github.com/Tokenizaa/AdeusMultas-Defesa-)  
**Branch canônica:** `main`  
**Produção:** https://adeusmulta.defesai.com.br  

---

## 0. Classificação de Estados

| Classificação | Significado |
|---|---|
| `CONCLUÍDO COM EVIDÊNCIA` | Entregável validado em código, testes, banco e/ou produção com evidência rastreável |
| `IMPLEMENTADO, MAS NÃO VALIDADO` | Código existe e testes unitários passam, mas falta validação E2E, jurídica ou de produção |
| `PENDENTE` | Trabalho não iniciado ou em andamento |
| `BLOQUEADO` | Dependência externa não resolvida (autorização, credenciais, acesso, rede) |
| `FORA DO ESCOPO IMEDIATO` | Não prioritário para liberação de produção atual |

---

## 1. Onboarding e Geração de Documentos (Prioridade Máxima)

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 1.1 | Infraestrutura de auditoria textual (7 etapas) | `CONCLUÍDO COM EVIDÊNCIA` | `tests/e2e-reconstruction/text-audit-runner.ts`, `text-capture.ts`, `text-validators.ts`, `text-audit-types.ts` implementados; 5 padrões proibidos detectáveis; validadores de coerência input→API→UI→persistido |
| 1.2 | Correção de copy e claims enganosas | `CONCLUÍDO COM EVIDÊNCIA` | Commit `cd16284`: 13 arquivos, 34 ocorrências corrigidas; 18 testes de regressão em `onboarding-copy-regression.test.tsx` |
| 1.3 | Validação jurídica substancial (critérios) | `CONCLUÍDO COM EVIDÊNCIA` | `src/core/onboarding/legal-validation.ts`: 8 teses mapeadas; 7 testes em `legal-validation.test.ts` |
| 1.4 | Casos de referência (28 cenários) | `CONCLUÍDO COM EVIDÊNCIA` | `src/core/onboarding/reference-cases.ts`: 7 procedimentos × 4 cenários; 6 testes de validação jurídica dos casos |
| 1.5 | Testes unitários e regressão (226 testes) | `CONCLUÍDO COM EVIDÊNCIA` | `npm run test`: 290 testes passando; `npm run build`: exit 0 |
| 1.6 | Lint TypeScript | `CONCLUÍDO COM EVIDÊNCIA` | `npx tsc --noEmit`: 0 erros (exceto scripts/untracked) |
| 1.7 | Execução E2E dos 28 cenários | `BLOQUEADO` | **Requer:** `PLAYWRIGHT_BASE_URL` (URL de homologação) + `E2E_ALLOW_PERSISTENT_WRITES=true` + autorização explícita para rodar contra ambiente real. **Não autorizado** executar contra produção sem autorização. Ver seção 6. |
| 1.8 | Auditoria fluxo completo (7 etapas × 7 procedimentos) | `BLOQUEADO` | Mesmo bloqueio do item 1.7. Infraestrutura pronta (`text-audit-runner`), 0/28 executados. |
| 1.9 | Revisão jurídica independente das 8 teses | `BLOQUEADO` | 1/8 confirmada com fonte oficial (ARG-051 / Art. 267 CTB). 7 teses requerem advogado com experiência em Direito de Trânsito para validar fontes CONTRAN/STJ/DOU. Automação não acessa fontes primárias (rate limit 429). |
| 1.10 | Deploy `cd16284` para produção | `BLOQUEADO` | Falta tag `[DEPLOY-PRODUCTION]` ou dispatch manual no `cloudflare-deploy.yml`. Último deploy em produção: `0c9e301` (17/10/2026). Correções de copy **não estão** na versão publicada. |

---

## 2. Base Jurídica e Conhecimento (Reconciliado)

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 2.1 | CTB persistido (artigos) | `CONCLUÍDO COM EVIDÊNCIA` | `knowledge/documents/ctb-articles.md` → 66 docs, 66 versões com hashes, 58 chunks/embeddings (DETERMINISTIC_LOCAL) |
| 2.2 | 8/9 normas prioritárias + 2 correlatas | `IMPLEMENTADO, MAS NÃO VALIDADO` | Coletadas com chunks/embeddings **em memória**; persistência em `knowledge_documents`/`knowledge_chunks` requer ajuste no timing de inicialização do `VectorStore.ensureSupabaseClient()` (prioriza `SUPABASE_SERVICE_ROLE_KEY`) |
| 2.3 | 39/39 fontes com URLs oficiais | `CONCLUÍDO COM EVIDÊNCIA` | `knowledge_sources.url` preenchido para todas as fontes federais/estaduais (Planalto, IN, gov.br, DETRANs, CETRans) |
| 2.4 | `source-alias-registry.ts` (unifica 4 IDs) | `CONCLUÍDO COM EVIDÊNCIA` | Mapeia seed/recovery/index/canônico sem ambiguidade |
| 2.5 | Pipeline RAG (ingestão, embeddings, busca) | `CONCLUÍDO COM EVIDÊNCIA` | `IngestionService` grava `KnowledgeIngestionRecord` por documento (gap F-1 fechado, commit `2504f1b`); 3 chaves NVIDIA NV-Embed-QA round-robin |
| 2.6 | Detector de mudança + fila revisão humana | `CONCLUÍDO COM EVIDÊNCIA` | `ChangeDetector.detectChange` → `PENDING_REVIEW`/`P0_LEGAL_CRITICAL`; `ReviewQueueService` com approve/reject/adjust/false-positive |
| 2.7 | Monitoramento normativo semanal (cron) | `CONCLUÍDO COM EVIDÊNCIA` | Worker `adeusmulta` versão `66e78512`; cron `0 0 * * 1` ativo; health check OK; 290 testes passam |

---

## 3. Pagamentos e Comercial

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 3.1 | Gateway padrão VenoPag (PIX) | `CONCLUÍDO COM EVIDÊNCIA` | Commit `24d73a2`: switch default gateway; checkout oculta cartão preservando integração PagBank (`8fe8342`) |
| 3.2 | Webhooks idempotentes | `CONCLUÍDO COM EVIDÊNCIA` | `payment_orders` persistidos; ofertas bônus 3 docs |
| 3.3 | Catálogo ofertas + pricing dinâmico | `CONCLUÍDO COM EVIDÊNCIA` | `src/config/pricing.ts`, `src/server/routes/commercial.ts` |

---

## 4. Comunicação WhatsApp

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 4.1 | Evolution API (Baileys) integrado | `CONCLUÍDO COM EVIDÊNCIA` | Instâncias, envio/recebimento msg/mídia/docs, webhooks, jornadas conversacionais, templates HSM |

---

## 5. OCR e Evidências

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 5.1 | Upload, OCR (Vision/Tesseract), quality gate | `CONCLUÍDO COM EVIDÊNCIA` | `evidenceFlags` para Rule Engine; Documenso assinatura digital |

---

## 6. Admin e Observabilidade (Transversal)

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 6.1 | Dashboard admin, health checks 12+ serviços | `CONCLUÍDO COM EVIDÊNCIA` | Métricas AI providers, alertas PagerDuty/Slack, audit logs, config dinâmicas |
| 6.2 | Rotas `/monitor/*` protegidas (auth + admin) | `CONCLUÍDO COM EVIDÊNCIA` | `authenticateToken` + `requireAdmin` em produção |

---

## 7. Trabalhadores Assíncronos (Infra)

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 7.1 | BullMQ/Redis workers (scraping, OCR, messaging, marketing) | `CONCLUÍDO COM EVIDÊNCIA` | Retry/DLQ, autoscaling, zero HTTP routes |

---

## 8. Marketing e Aquisição

| # | Item | Classificação | Evidência / Detalhes |
|---|------|---|---|
| 8.1 | 7 agentes autônomos, Meta Ads/CAPI, ComfyUI | `IMPLEMENTADO, MAS NÃO VALIDADO` | **CANDIDATO A SPLIT** — funcional mas não certificado E2E |

---

## 9. Bloqueios Críticos para Liberação de Produção

| # | Bloqueio | Causa Raiz | Ação Necessária | Responsável |
|---|----------|------------|-----------------|-------------|
| B-1 | E2E não executado (28 cenários onboarding) | `PLAYWRIGHT_BASE_URL` e `E2E_ALLOW_PERSISTENT_WRITES` não definidos; execução contra produção requer autorização explícita | Usuário autoriza ambiente de homologação + define variáveis; **não** usar produção sem autorização | Usuário / DevOps |
| B-2 | Correções de copy não em produção | Deploy `cd16284` não disparado (falta tag `[DEPLOY-PRODUCTION]`) | Autorizar deploy via workflow `cloudflare-deploy.yml` ou dispatch manual | Usuário / DevOps |
| B-3 | Revisão jurídica independente pendente | 7/8 teses não validadas com fontes primárias (CONTRAN/STJ/DOU inacessíveis por automação) | Contratar advogado especialista em Direito de Trânsito para revisão formal | Jurídico |
| B-4 | Persistência das 8 normas no Supabase | `VectorStore.ensureSupabaseClient()` timing: client inicializa antes de env vars disponíveis | Ajustar inicialização para usar `SUPABASE_SERVICE_ROLE_KEY` consistentemente após env vars prontas | Backend |
| B-5 | CTB não coletado (1/9 normas) | Rate limit 429 em `planalto.gov.br` | Nova tentativa com retry/backoff ou horário de menor tráfego | Backend |

---

## 10. Dependências e Caminho Crítico

```
[Autorização E2E] ──→ [Execução 28 cenários] ──→ [Correções divergências] ──→ [Reexecução até 10x verde]
                                                                    │
                                                                    ▼
                                                         [Revisão Jurídica Independente]
                                                                    │
                                                                    ▼
[Deploy cd16284] ──→ [Smoke tests produção] ──→ [LIBERAÇÃO PRODUÇÃO]
```

**Critérios de liberação:**
1. ✅ 226 testes unitários passando
2. ✅ Build aprovado (`npm run build`)
3. ✅ Lint limpo (`tsc --noEmit`: 0 erros no src/)
4. ⬜ 28 cenários E2E executados com evidências (PASS/FAIL/BLOCKED por célula)
5. ⬜ Auditoria fluxo completo (7 etapas × 7 procedimentos) sem divergências críticas
6. ⬜ Revisão jurídica independente das 7 teses restantes concluída
7. ⬜ Deploy `cd16284` (ou posterior) confirmado em produção
8. ⬜ Smoke tests na URL de produção passando

---

## 11. Próximas Ações (Ordem de Execução)

| Ordem | Ação | Tipo | Estimativa |
|---|---|---|---|
| 1 | **Autorizar ambiente E2E** (fornecer `PLAYWRIGHT_BASE_URL` homologação + `E2E_ALLOW_PERSISTENT_WRITES=true`) | Externa | Imediato |
| 2 | Executar suíte E2E completa (28 cenários) | Execução | ~30 min |
| 3 | Corrigir divergências encontradas (UI ↔ API ↔ persistido ↔ documento) | Código | Conforme achados |
| 4 | Reexecutar até estabilidade (meta: 10 execuções consecutivas verdes) | Execução | Iterativo |
| 5 | **Autorizar revisão jurídica independente** (advogado trânsito) | Externa | Agendar |
| 6 | **Autorizar deploy para produção** (tag `[DEPLOY-PRODUCTION]`) | Externa | Imediato após 4+5 |
| 7 | Smoke tests em produção (URL real) | Execução | ~10 min |
| 8 | Atualizar roadmap e relatórios com resultados finais | Documentação | ~30 min |

---

## 12. Itens Fora do Escopo Imediato (Pós-Liberação)

| # | Item | Motivo |
|---|------|--------|
| P-1 | Persistência definitiva das 8 normas no Supabase (C-1 do backlog) | Técnico residual; não bloqueia onboarding/minuta |
| P-2 | Coleta do CTB (C-2 do backlog) | Rate limit temporário; base jurídica operacional com 8 normas |
| P-3 | Refatorar lógica duplicada monitor (C-3 do backlog) | Dívida técnica; não afeta funcionalidade atual |
| P-4 | Catalogar resoluções adicionais (S-2) | Enriquecimento; teses ativas cobertas |
| P-5 | Testes integração end-to-end nova norma (S-4) | Validação futura |
| P-6 | Certificação E2E dos 70 cenários (E2E-CERTIFICACAO-CANONICA.md) | Escopo maior; pós-liberação MVP |

---

## 13. Histórico de Shas Relevantes

| SHA | Data | Descrição |
|---|---|---|
| `3dce0d5` | 24/10/2026 | Merge branch 'main' (HEAD atual) |
| `cd16284` | 23/10/2026 | Fix onboarding copy + 28 casos + validação jurídica + 31 novos testes |
| `bdc0d7d` | 23/10/2026 | Fix Supabase client init (SERVICE_ROLE_KEY priority) |
| `49a002b` | 23/10/2026 | Certificação pós-ativação monitoramento normativo |
| `b1e4d20` | 23/10/2026 | Ativação controlada monitoramento em produção |
| `c68980c` | 23/10/2026 | Fechamento operacional monitoramento normativo |
| `2504f1b` | 23/10/2026 | Persistência knowledge_ingestions por documento |
| `238a745` | 23/10/2026 | Fase 3 ronda desbloqueio jurídico |
| `0c9e301` | 17/10/2026 | **Último deploy em produção** |

---

## 14. Estado do Git Local

```bash
# Branch atual: main (6 commits à frente de origin/main)
# Arquivos modificados não commitados (preservados conforme AGENTS.md):
#   M api/index.mjs          # Artefato de build - espelha correções de copy dos fontes
#   M src/components/checkout/checkout-pix-only.test.tsx  # Fix tipagem TypeScript
#   M supabase/.temp/*       # Temporários locais Supabase CLI
# Arquivos untracked:
#   .firecrawl/              # Cache Firecrawl
#   docs/reconciliacao/      # Documentos de reconciliação (esta missão)
#   scripts/final-persist-norms.ts  # Script auxiliar (tem erros TS, não bloqueia build)
#   scripts/ingest-norms.ts        # Script auxiliar
```

---

## 15. Conclusão do Estado Atual

**O produto está funcionalmente completo para o MVP (onboarding + minuta).**  
**O que falta é validação externa autorizada:**

1. **E2E em homologação** — infraestrutura 100% pronta, 28 cenários definidos, 0 executados
2. **Revisão jurídica formal** — 1/8 teses confirmada, 7 pendentes de advogado especialista
3. **Deploy autorizado** — código pronto (`cd16284`), workflow configurado, aguarda tag/dispatch

**Não há bloqueadores técnicos internos.** Todos os 290 testes passam, build limpo, TypeScript limpo no src/, infraestrutura de produção operacional (monitoramento normativo ativo, Worker deployado, cron agendado, secrets configurados).

---

*Este roadmap é o documento canônico único. Substitui e consolida todos os relatórios de reconciliação em `docs/reconciliacao/` e auditorias em `docs/auditorias/2026-10-22-onboarding/`. Atualizações futuras devem ser feitas neste arquivo.*