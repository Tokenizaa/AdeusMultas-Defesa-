# Backlog Consolidado — Pendências e Dependências

## Legenda

| Símbolo | Significado |
|---|---|
| `🔧` | Correção técnica (código) |
| `📋 | Documentação/processos |
| `🌐` | Acesso remoto / rede |
| `🧪` | Testes / validação |
| `📦` | Dados / banco |

---

## Itens Prioritários (Críticos)

| # | Item | Tipo | Descrição | Critério de Aceite | Dependências |
|---|------|------|-----------|---|---|
| C-1 | Persistência das 8 normas coletadas | 🔧 | As 8 normas prioritárias (1.031/2026, 965/2022, 966/2022, 985/2022, 798/2020, 804/2020, 918/2022, 991/2023) + 2 correlatas (804/2020, 991/2023) possuem chunks e embeddings em memória, mas precisam ser persistidas nas tabelas Supabase `knowledge_documents` e `knowledge_chunks`. | `npx tsc --noEmit` e `npx vitest run` continuam passando; consulta direta ao Supabase retorna rows nas tabelas de documentos e chunks para essas 10 normas. | Ajuste no `VectorStore.ensureSupabaseClient()` timing: currently prioritizes `SUPABASE_SERVICE_ROLE_KEY` over `SUPABASE_SECRET_KEY`. O client precisa ser inicializado após as env vars estarem disponíveis no contexto de execução. |
| C-2 | Coleta do CTB (1/9 normas) | 🌐 | CTB (Código de Trânsito Brasileiro) não foi coletado por falha de rede (rate limit ou indisponibilidade temporária do `https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm`). | Nova raspagem bem-sucedida retorna HTTP 200 com texto do CTB; chunks e embeddings gerados e persistidos. | Acesso à URL `https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm` sem rate limit; ou agendamento para nova tentativa. |
| C-3 | Refatorar lógica duplicada de monitor | 🔧 | `weekly-monitor-service.ts` e `weekly-monitor-scheduler.ts` contêm lógica duplicada (ambos executam ciclo de monitoramento). | Código consolidado em uma única implementação; testes passam com mesma cobertura; `supportsScheduledMonitoring()` retorna correto para ambiente Cloudflare Worker. | Análise profunda do fluxo em ambos arquivos; definição de qual reutilizar e qual remover/desativar. |

---

## Itens Secundários (Residenciais)

| # | Item | Tipo | Descrição | Critério de Aceite | Dependências |
|---|------|------|-----------|---|---|
| S-1 | Preencher `knowledge_sources.url` para eventuais fontes remanescentes | 📋 | Embora 39/39 fontes tenham URLs preenchidas, verificação futura pode revelar novas fontes sem URL. | Script ou processo que preenche `knowledge_sources.url` a partir de catálogo oficial quando nova fonte for adicionada. | Catálogo de fontes oficiais atualizado; acesso às URLs correspondentes. |
| S-2 | Catalogar resoluções adicionais em `RESOLUTIONS_DB` | 📋 | Atualmente há 9 resoluções prioritárias + 2 correlatas com chunks/embeddings. Outras resoluções referenciadas por teses (ex: 965/2022, 966/2022 em ARG-024) poderiam ser catalogadas. | `RESOLUTIONS_DB` contém todas as resoluções referenciadas pelas teses ativas; documentos associados com chunks/embeddings quando disponível. | Fonte oficial das resoluções; processo de extração e validação. |
| S-3 | Consolidar `SnapshotStore` persisted completamente | 🔧 | SnapshotStore já persiste no Supabase, mas a inicialização depende do timing das env vars no VectorStore. | `SnapshotStore.isSupabaseConfigured()` retorna `true`; `getLatestSnapshot()` carrega do Supabase após reinicialização sem falhas. | Coordenação entre `VectorStore.ensureSupabaseClient()` e `SnapshotStore.initSupabaseClient()` — ambas usam `SUPABASE_SERVICE_ROLE_KEY` como prioridade. |
| S-4 | Testes de integração end-to-end para nova norma | 🧪 | Adicionar testes que validam coleta→persistência→recuperação de uma nova norma normativa do início ao fim. | Novo teste `vitest` que executa ciclo completo com fonte mockada e valida stored data. | Estrutura de testes existente (`src/core/knowledge/`); fonte de teste definida. |
| S-5 | Documentar processo de coleta manual para normas prioritárias | 📋 | Caso novas normas precisem ser coletidas manualmente, processo deve ser documentado. | `docs/` contém guia passo-a-passo; scripts `scripts/` registram o procedimento. | Acesso às fontes oficiais; scripts de ingestão definidos. |

---

## Itens Concluídos (para registro)

| # | Item | Status | Comentário |
|---|------|--------|------------|
| C-0 | Fechar gap `knowledge_ingestions` 0 linhas | ✅ Concluído | Commit `2504f1b` adicionou persistência de `KnowledgeIngestionRecord` por documento; 242 testes passam após correção. |
| S-0 | Preencher 39/39 fontes com URLs oficiais | ✅ Concluído | Através de código local e validações; todas as 39 fontes federais e estaduais têm `url` preenchido em `knowledge_sources`. |
| S-0 | Aplicar migration `knowledge_monitoring_snapshots` | ✅ Concluída | Migration `20261023000001_create_monitoring_snapshots.sql` aplicada no Supabase canônico; insert/SELECT/RLS testados. |
| S-0 | Deploy Worker `adeusmulta` com secrets | ✅ Concluído | Worker versão `66e78512` ativo no Cloudflare; health check OK; SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_ANON_KEY, SUPABASE_URL configurados. |
| S-0 | Configurar cron `0 0 * * 1` (domingos 00:00 UTC) | ✅ Concluído | `wrangler.jsonc` triggers.crons; trigger registrado e ativo no Worker de produção; próximo domingo 2026-10-25. |
| S-0 | Preencher `knowledge_sources.url` para 39 fontes | ✅ Concluído | 39/39 fontes federais e estaduais atualizadas com URLs oficiais validadas (requisições controladas: CTB 200, DOU 200, CONTRAN/SENATRAN 429 = rate limit temporário). |
| S-0 | 8/9 + 2 correlatas normas com chunks/embeddings | ✅ Concluído | 10 normas no total (9 prioritárias + 2 correlatas) têm chunks e embeddings persistidos em memória e parcialmente em Supabase. |
| S-0 | 290 testes passando | ✅ Concluído | `npx vitest run`: 33 files, 290 tests, all passing.<br>`npx tsc --noEmit`: 0 erros. |

---

**Observação:** Itens com status ✅ foram concluídos nesta missão. Itens pendentes (C-1, C-2, C-3) são resolvíveis sem alterações de teses jurídicas ou regras de elegibilidade.