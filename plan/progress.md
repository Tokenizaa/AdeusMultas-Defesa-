# FASE 8 — Coleta e Inventário Documental Oficial — 2026-09-23

> **FASE 8 — AUDITORIA DE INTEGRIDADE: CONCLUÍDA** (2026-09-24) — 71 arquivos físicos auditados em `legal_collected_2026_09_23/` (sem modificação). Relatório completo: `docs/recovery/FASE-8-AUDITORIA-INTEGRIDADE-69-ARQUIVOS-2026-09-24.md`.

> **FASE 8 — RECONCILIAÇÃO DOCUMENTAL: CONCLUÍDA** (2026-09-24) — inventário reconciliado com a realidade física de 71 arquivos (15 federal + 56 estadual): 50 válidos, 3 alertas MIME, 9 inválidos, 2 grupos de duplicata, 12 órfãos registrados, 5 payloads de falha reclassificados, hash CONTRAN corrigido, BA reclassificada como FORA_DO_ESCOPO_TRANSITO. Zero arquivos físicos alterados; nenhuma nova raspagem. Relatório: `docs/recovery/FASE-8-RECONCILIACAO-DOCUMENTAL-2026-09-24.md`.

> **FASE 8 — RECUPERAÇÃO DE PAYLOADS INVÁLIDOS: CONCLUÍDA** (2026-09-24) — 4 alvos: CONTRAN 796/2020 RECUPERADO (`contran_res_796_2020_recuperado.pdf`) e Memo 753/2026 AM RECUPERADO (`memo_753_2026_recuperado.pdf`); CTB PDF e Defesa Prévia AC RECUPERACAO_BLOQUEADA (fonte oficial não disponibiliza o PDF nos caminhos atuais). Arquivos de falha originais preservados. Relatório: `docs/recovery/FASE-8-RECUPERACAO-PAYLOADS-INVALIDOS-2026-09-24.md`.

> **FASE 8 — AUDITORIA DOS RECUPERADOS: CONCLUÍDA** (2026-09-24) — 2 PDFs auditados: CONTRAN 796/2020 e Memo 753/2026 AM → ambos `VALIDO_RECUPERADO` (magic `%PDF-`, file PDF 1.4/1.7, SHA-256 idêntico ao inventário, zero divergências). Evidências inválidas originais preservadas. Relatório: `docs/recovery/FASE-8-AUDITORIA-RECUPERADOS-2026-09-24.md`.

> **FASE 8 — RECUPERAÇÃO DE UF BLOQUEADA AP: CONCLUÍDA** (2026-09-24) — DETRAN-AP recuperado: 2 formulários oficiais coletados (Requerimento de Infração, Solicitação de Serviços). CETRAN-AP permanece bloqueado (DNS não resolve). `AP: PROCESSADA — COBERTURA PARCIAL`. Relatório: `docs/recovery/FASE-8-COLETA-BLOQUEADA-AP-2026-09-24.md`.

## Resultado

*PARCIAL — primeira rodada estadual em andamento.*

A Fase 8 mantém a separação entre **processamento da UF** e **cobertura documental da UF**. Uma UF ter documentos coletados não significa que sua cobertura de trânsito esteja completa.

Situação atual da primeira rodada:
- AC: PROCESSADA — COBERTURA PARCIAL
- AL: PROCESSADA — COBERTURA PARCIAL
- AM: PROCESSADA — COBERTURA PARCIAL
- BA: PROCESSADA — SEM COBERTURA DE TRÂNSITO VALIDADA (o documento coletado não é relevante para o escopo)
- CE: PROCESSADA — COBERTURA PARCIAL
- DF: PROCESSADA — BLOQUEADA (0 documentos)
- ES: PRÓXIMA UF DA PRIMEIRA RODADA

A documentação existente é preservada como evidência de coleta. Não serão realizadas complementações das UFs anteriores durante a primeira rodada nacional.

O inventário documental foi atualizado e registrado em:
`docs/recovery/FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md`

### Evidências de Coleta Federal
- Arquivo ctb.html com hash SHA-256: 6a5e7d4ce6bd582acb0244b4b8a75837bb4cabc634842bbee2c99a58194e7d2e
- Arquivo ctb.pdf com hash SHA-256: 623f0a987426022735c217262f78ad0eae6e2058dc2077f725200f956031e7d6
- Arquivo senatran.html com hash SHA-256: 3ec76f081ecd9ba75599ca8106be16c1039c15df7b11d6a3b8d74bc9265a1c4d
- Arquivo contran_resolutions.html com hash SHA-256: abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0
- Arquivo contran_res_796_2020.pdf com hash SHA-256: 6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258
- Arquivo prf.html com hash SHA-256: 6d4ab6b742457c58ad4c8f3c2d5ddad2643d4e9f32ead6bba69aa67b61fd102d
- Arquivo dnit.html com hash SHA-256: 67debf6e429639a2e6f504e5f78434ca68b3e34961a971d6bcd9cdafb612ad7a
- Arquivo anttr.html com hash SHA-256: a7c1d5a923af59c401aab4b95e89f94ac3f10e4ce9bbe556f63c72510790efd5
- Arquivo inmet.html com hash SHA-256: e67d72bfcf159b1a79cbd89560fca53fa85e8748c84c3e671da998cf3b62e239
- Arquivo dou.html com hash SHA-256: 31d48bd3a918942e8233cfcd40cbac5cfc8807ecfa837060752af2eb0021f13a
- Arquivo stj.html com hash SHA-256: caea3a0b1ab3a8dd6d41d9c185f1ea5dcccb3cccbc116926b166b297286a73fb

### Evidências de Coleta Estadual (AC)
- Arquivo defesa_previa_pf.pdf com hash SHA-256: 15950ab7e5de613d9b086baae6894f7b452d8085edefcf4459276e7aa2b7d4f7
- Arquivo nova-portaria-PROCURAA_A_O.pdf com hash SHA-256: 11ef1de1afb04c0100e1162b0b07ed052c7228e1029a5e66b9a6f1c6c52441ce
- Arquivo Portaria_n__1159_2024_alteracao_portaria_assinatura_digital.pdf com hash SHA-256: 991e9fcb9edd07550298b4f81a88de13282263968da47f800244e587bf7b438c
- Arquivo Portaria_1723.pdf com hash SHA-256: 175e22e4daa442ff3115804f7319e8a3c3979be1847252d32a972788f6a2794d

### Evidências de Coleta Estadual (AL)
- Arquivo resolucao_cetran_al_01_2000.pdf com hash SHA-256: eb391d7f014c7d09950329b601bcc3152bcafa2097529daf98667c7302af75c0
- Arquivo resolucao_cetran_al_04_2002.pdf com hash SHA-256: f5b987626dde593893ce794da517d15271ef140b16ca3e0ab854175cbdde9796
- Arquivo resolucao_cetran_al_02_2000.pdf com hash SHA-256: 2abb3ef1254836bf41eabf59c950fe2a80b7828e60d690dd2f4e63fc05ae06f0

### Evidências de Coleta Estadual (AM)
- Arquivo portaria_normativa_015_2026.pdf com hash SHA-256: 08add6a30898435dd9ab9ef4c16921d46fd4a79ab0ab9325ae0e9154ee14b020
- Arquivo portaria_normativa_014_2026.pdf com hash SHA-256: 84772aed1d7464653f236b6e4d8fde92325de0f303687da7845a24e361a4f057
- Arquivo memo_753_2026_opttran_detran.pdf com hash SHA-256: c52bb2a6c4c005407bce225a26f4be15ea0e38dc4f96d25b94feb62e93dd70b8
- Arquivo portaria_01_03_011210_078105_2026_96.pdf com hash SHA-256: 5192f8b88dc0466a0993b667eb4f05b209bde835368d19aa3d8765cdf1c637c3
- Arquivo portaria_01_03_011210_083647_2026_80.pdf com hash SHA-256: 82e54883faf4d63177788b9ff629d8b0907a6a98cb50e2d81b129471ed3af0de

### Evidências de Coleta Estadual (CE)
- Arquivo is004_2007_cohab.pdf com hash SHA-256: 176f2ff596d4c54cb170acc2817952a17842ae0766ef206751caa9c302efba74
- Arquivo defesa_autuar_infracao_transito.html com hash SHA-256: ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a
- Arquivo recurso_jari_detran_ce.html com hash SHA-256: ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a
- Arquivo resolucao_cetran_ce_003_2019.pdf com hash SHA-256: 8825a645a52be3e5a5428b3f9929d48c946a60536970d4f8d1ec597e5661590d
- Arquivo resolucao_cetran_ce_001_2014.pdf com hash SHA-256: 27aa5bc7b7ad3bff97fbaf336a0bf72a4dca9244b3a4e68dfb69bab8a3cf15aa
- Arquivo resolucao_cetran_ce_001_2013.pdf com hash SHA-256: 6e2835b007ad87f393623aa1e3095daf9eeb6a9560a0f59d55acbd48d08c8712
- Arquivo regimento_interno_cetran_ce_2020.pdf com hash SHA-256: 676bbd60f4379d8641a132c41fbe5a77b5692ec2cd219808e6b1d3795e1e13c6

### Evidências de Coleta Estadual (DF)
Nenhum documento coletado. Fontes bloqueadas:
- DETRAN-DF: todas as tentativas de acesso falharam com erro de transporte (conexão recusada ou timeout).
- CETRAN-DF: todas as tentativas de acesso falharam com erro de transporte (conexão recusada ou timeout).

### Evidências de Coleta Estadual (BA)
- Arquivo decreto_legislabahia_23792_2025.pdf com hash SHA-256: 4f319596d274eb379771b61e4390881c3200d489d9d8ec0aa38ba2e3745079f2

- **COLETADO FEDERAL:** 9 fontes oficiais federais, total de 10 documentos coletados (incluindo variações).
- **COLETADO ESTADUAL (AC):** DETRAN-AC - 4 documentos coletados (1 formulário de defesa prévia, 3 portarias). Coleta inicial concluída; documentos adicionais requerem busca mais aprofundada ou acesso a sistemas internos.
- **COLETADO ESTADUAL (AL):** CETRAN-AL - 3 documentos coletados (resoluções CETRAN-AL). DETRAN-AL acessível porém sem links óbvios para formulários de defesa em inspeção superficial.
- **COLETADO ESTADUAL (AM):** DETRAN-AM - 5 documentos coletados (2 portarias normativas, 1 memo, 2 portarias numeradas). CETRAN-AM inaccessível.
- **COLETADO ESTADUAL (CE):** DETRAN-CE - 7 documentos coletados (1 instrução de serviços, 1 formulário de defesa, 1 recurso JARI, 3 resoluções, 1 regimento interno). Coleta em progresso; documentos adicionais incluem portarias, resoluções e manuais de defesa.
- **COLETADO ESTADUAL (DF):** DETRAN-DF e CETRAN-DF - 0 documentos coletados. Ambas as fontes inaccessíveis devido a erros de transporte.
- **BLOQUEADO/INACESSÍVEL ESTADUAL:** 
  - CETRAN-AC (DNS não resolve) - requer investigação de URL alternativa ou confirmação de inaccessibilidade.
  - DETRAN-AP (acesso restrito, possivelmente bloqueio ou reestruturação).
  - CETRAN-AP (sem resposta).
  - CETRAN-AM (sem resposta).
  - DETRAN-DF (erro de transporte).
  - CETRAN-DF (erro de transporte).
- **PRÓXIMO ESTADO:** ES — primeira rodada nacional.
- **PENDENTE:** Restante dos estados (ES, GO, MA, MT, MS, MG, PA, PB, PE, PI, PR, RJ, RN, RO, RS, SC, SE, SP, TO, RR, AP em investigação, BA - coleta iniciada (1 documento coletado)).

## Próximos passos dentro da FASE 8

1. Executar **somente a raspagem/coleta documental da UF ES**.
2. Não complementar AC, AL, AM, BA, CE ou DF durante a primeira rodada.
3. Após ES, avançar sequencialmente para a próxima UF ainda não processada.
4. Ao final da primeira rodada nacional, iniciar uma rodada separada de complementação das UFs com cobertura parcial.
5. A classificação de cobertura será feita após a coleta nacional; a ausência de um documento específico durante a raspagem não deve gerar pesquisa aberta ou loop.

## Próxima fase (após conclusão da FASE 8)

**FASE 9 — Validação e versionamento documental** (se aplicável): após coleta de todos os documentos oficiais, validar integridade, verificar versionamento e preparar para possível ingestão futura no sistema de conhecimento.

## Classificação

- **COLETADO FEDERAL:** 9 fontes oficiais federais, total de 10 documentos coletados (incluindo variações).
- **COLETADO ESTADUAL (AC):** DETRAN-AC - 4 documentos coletados (1 formulário de defesa prévia, 3 portarias). Coleta inicial concluída; documentos adicionais requerem busca mais aprofundada ou acesso a sistemas internos.
- **COLETADO ESTADUAL (AL):** CETRAN-AL - 3 documentos coletados (resoluções CETRAN-AL). DETRAN-AL acessível porém sem links óbvios para formulários de defesa em inspeção superficial.
- **COLETADO ESTADUAL (AM):** DETRAN-AM - 5 documentos coletados (2 portarias normativas, 1 memo, 2 portarias numeradas). CETRAN-AM inaccessível.
- **COLETADO ESTADUAL (CE):** DETRAN-CE - 7 documentos coletados (1 instrução de serviços, 1 formulário de defesa, 1 recurso JARI, 3 resoluções, 1 regimento interno). Coleta em progresso; documentos adicionais incluem portarias, resoluções e manuais de defesa.
- **COLETADO ESTADUAL (DF):** DETRAN-DF e CETRAN-DF - 0 documentos coletados. Ambas as fontes inaccessíveis devido a erros de transporte.
- **BLOQUEADO/INACESSÍVEL ESTADUAL:** 
  - CETRAN-AC (DNS não resolve) - requer investigação de URL alternativa ou confirmação de inaccessibilidade.
  - DETRAN-AP (acesso restrito, possivelmente bloqueio ou reestruturação).
  - CETRAN-AP (sem resposta).
  - CETRAN-AM (sem resposta).
  - DETRAN-DF (erro de transporte).
  - CETRAN-DF (erro de transporte).
- **PRÓXIMO ESTADO:** Pronto para iniciar coleta com ES (Espírito Santo) seguindo a mesma metodologia.
- **PENDENTE:** Restante dos estados (ES, GO, MA, MT, MS, MG, PA, PB, PE, PI, PR, RJ, RN, RO, RS, SC, SE, SP, TO, RR, AP em investigação, BA - coleta iniciada (1 documento coletado)).

## Próximos passos dentro da FASE 8
1. Documentar oficialmente a inaccessibilidade do CETRAN-AC após tentativa de verificação via fontes oficiais de transparência e contato indireto (se possível).
2. Continuar a coleta de documentos do DETRAN-AC: acessar o portal de recursos e baixar mais documentos específicos de defesa de multas (manuais, resoluções, leis estaduais).
3. Para o AL, considerar a coleta de mais documentos do CETRAN-AL (outras resoluções, portarias, leis) e do DETRAN-AL (se houver links específicos para defesa).
4. Para o AM, considerar a coleta de mais documentos do DETRAN-AM (outras portarias, resoluções, leis) e buscar acesso ao CETRAN-AM por meios alternativos.
5. Para o DF, documentar oficialmente a inaccessibilidade do DETRAN-DF e CETRAN-DF após tentativa de verificação via fontes oficiais de transparência e contato indireto (se possível).
6. Após concluir DF, passar para o estado seguinte (ES) seguindo a mesma sequência.
7. Atualizar o inventário e este plano de progresso conforme avançar na coleta estadual.

## Próxima fase (após conclusão da FASE 8)

**FASE 9 — Validação e versionamento documental** (se aplicável): após coleta de todos os documentos oficiais, validar integridade, verificar versionamento e preparar para possível ingestão futura no sistema de conhecimento.

## FECHAMENTO DA FASE 8 (2026-09-24)

> **FASE 8 — RECUPERAÇÃO DOCUMENTAL OFICIAL**

- Primeira rodada nacional: CONCLUÍDA
- Auditoria física: CONCLUÍDA
- Reconciliação: CONCLUÍDA
- Recuperação de payloads inválidos: CONCLUÍDA (2/4 recuperados; CTB PDF e Defesa Prévia AC bloqueados)
- Recuperação de UFs bloqueadas: CONCLUÍDA (AP recuperada — 2 formulários; DF, MA, MT, PE, RN, RO, SE permanecem RECUPERACAO_BLOQUEADA)
- Validação de cobertura nacional: CONCLUÍDA

**Status final (derivado da evidência):**
- 75 arquivos físicos | 65 documentos válidos (10 federal + 55 estadual)
- 7 UFs sem evidência: DF, MA, MT, PE, RN, RO, SE (bloqueio infraestrutura)
- 13 CETRANs sem domínio acessível
- BA: FORA_DO_ESCOPO_TRANSITO (sem cobertura de trânsito)
- PA e demais COBERTURA_PARCIAL não implicam cobertura jurídica completa

**Lacunas remanescentes:**
- UFs bloqueadas por infraestrutura (DNS/Cloudflare/Akamai/TLS): DF, MA, MT, PE, RN, RO, SE
- CTB em PDF e Defesa Prévia AC (fonte oficial não disponibiliza)
- Verificação online de origens (ORIGEM_NAO_VERIFICADA)
- Avaliação de cobertura jurídica por UF (etapa posterior, distinta da coleta)

**Próxima fase:**
- FASE 9 — definição derivada do estado real: acesso a UFs bloqueadas (IP/ASN/VPN alternativo, contornar Akamai/Cloudflare com navegador real) e/ou início da preparação para ingestão jurídica (RAG) — decidir após análise deste fechamento.

## FASE 9 — AUDITORIA/ESPECIFICAÇÃO (2026-09-24)

> **[ESTADO HISTÓRICO ANTERIOR]** — **FASE 9 — AUDITORIA/ESPECIFICAÇÃO: CONCLUÍDA** (2026-09-24)
> **Implementação: NÃO INICIADA** | **RAG: NÃO INICIADO** | **Supabase: SOMENTE AUDITORIA**

- Commit-base da auditoria: `8863ecfe504c580a34ce46fedadd30b73e12fd2d`
- Modelo canônico: reutilizar schema Supabase existente (knowledge_sources → knowledge_documents → knowledge_document_versions → knowledge_chunks → knowledge_embeddings + knowledge_ingestions), com tabela aditiva de relações normativas.
- Achado-chave: drift de migrations (6 tabelas knowledge existem no DB, mas não versionadas em supabase/migrations) — a fechar na Fase 9.1.
- Artefatos: `FASE-9-ESPECIFICACAO-NORMALIZACAO-JURIDICA-2026-09-24.md`, `FASE-9-ROADMAP-IMPLEMENTACAO-2026-09-24.md`.
- Próxima implementação: Fase 9.1–9.5 (roadmap) — aguardando análise.

## FASE 9.1 — SCHEMA JURÍDICO / MIGRATION DRIFT (2026-09-24)

> **FASE 9.1: CONCLUÍDA** — schema jurídico versionado e drift fechado.
> **Implementação RAG: NÃO INICIADA** | **Supabase: migration aditiva aplicada (sem DROP/DELETE)**.

- Migration: `supabase/migrations/20260924233015_fase_9_1_knowledge_schema.sql` (6 tabelas knowledge + nova `knowledge_document_relations`, idempotente).
- 7 tabelas `knowledge_*` com RLS ON; contagens preservadas (tudo 0); relations com 6 constraints + 4 índices.
- Gaps registrados: policies RLS ausentes nas knowledge_* (padrão atual service-role), extensions em public, `updated_at` ausente em document_versions.
- Relatório: `docs/recovery/FASE-9.1-MIGRATION-DRIFT-2026-09-24.md`.

## FASE 9 — IMPLEMENTAÇÃO COMPLETA (2026-09-24)

> **FASE 9 — IMPLEMENTAÇÃO: CONCLUÍDA COM GAPS DOCUMENTADOS**
> RAG: NÃO INICIADO | Supabase: metadados populados via service role (sem DDL nova; sem policy aberta; chunks/embeddings intactos)

- sources: **39** | documents: **66** | versions: **66** | relations: **0** (nenhuma inventada)
- reconciliação: **66** | unresolved: **0** | duplicata CE: **1** (duplicate_of) | recuperados: **2** (CONTRAN 796, Memo 753 AM; +2 AP como COLLECTED)
- candidatos estruturais ao RAG: **66** | bloqueados p/ RAG: **10** (9 payloads de falha + 1 fora do escopo BA)
- vigência UNKNOWN: 66/66 (sem inferência); jurisdição: 0 UNKNOWN; content não armazenado (camada de ingestão futura)
- Contrato de ingestão definido (dimensional) e no relatório: `docs/recovery/FASE-9-IMPLEMENTACAO-NORMALIZACAO-2026-09-24.md`
- Roadmap atualizado: 9.1–9.5 ✅ (pacote único).

**Próxima fase:** **FASE 10 — VALIDAÇÃO JURÍDICA / COBERTURA** (não iniciada).

## FASE 10 — VALIDAÇÃO JURÍDICA E COBERTURA NACIONAL (2026-09-24)

> **FASE 10: CONCLUÍDA COM GAPS DOCUMENTADOS**
> Checkpoint inicial: `6649cb322a2d437c227a8e4773838d82bb585070`

- 39 sources ✓ | 66 documents ✓ | 66 versions ✓ | current_version 66/66 ✓
- relations: 0 (sem evidência) | chunks: 0 | embeddings: 0 | RAG: NÃO INICIADO
- RLS: 7/7 ON | policies públicas: 0 | deleted rows: 0 | hash changes: 0 | inventory ids lost: 0
- Cobertura nacional: 12 UFs CONFIRMADA doc. | 7 PARCIAL | 7 BLOQUEADA_POR_ACESSO (DF, MA, MT, PE, RN, RO, SE) | BA FORA_DO_ESCOPO | Federal PARCIAL
- Procedimentos: Defesa Prévia/JARI/CETRAN PARTIALLY_CONFIRMED (por UF); suspensão/cassação/conversão UNKNOWN (sem evidência)
- Classificação RAG: 66 RAG_REQUIRES_HUMAN_VALIDATION (conteúdo não extraído + vigência UNKNOWN); 10 RAG_BLOCKED (9 payloads + BA)
- Gap 1 fechado: `supabase/recovery/FASE-9-RECONCILIACAO-DETERMINISTICA.sql` (artefato idempotente 39/66/66)
- Gap 2 fechado: blocos históricos marcados `ESTADO HISTÓRICO ANTERIOR` (additivo; nada apagado)
- Relatório: `docs/recovery/FASE-10-VALIDACAO-JURIDICA-COBERTURA-2026-09-24.md`
- Próxima fase: **FASE 11 — INGESTÃO/CONTEÚDO (NÃO INICIADA)** — decisão após análise.

## FASE 11 — PIPELINE JURÍDICO E RAG (2026-09-25)

> **FASE 11: CONCLUÍDA COM GAPS DOCUMENTADOS** — extração→validação→canonicalização→chunks→embeddings→indexação→Golden Path.
> Checkpoint inicial: `6649cb3` (planejamento `e64da3f`).

- Reuso total da infra existente: chunking-service, embedding-service (NVIDIA/determinístico), vector-store (pgvector canônico), search/rag services.
- documentos 66 | extraídos 53 | falhas 13 (PDFs scan/VAZIO, não indexados) | canonicalizados 53 | chunks 58 | embeddings 58 | órfãos 0 | duplicados 0
- Golden Path: "defesa prévia multa" → 5 resultados com provenance ✓; caso bloqueado "suspensão/cassação" → nada de fonte bloqueada ✓
- RLS preservado (7/7 ON); 0 DROP/delete; 39/66/66 intactos; dependência nova: pdf-parse@1.1.1
- Testes: `src/core/knowledge/fase11-pipeline.test.ts` 4/4 ✓
- Relatório: `docs/recovery/FASE-11-IMPLEMENTACAO-RAG-2026-09-25.md`
- Gaps: OCR p/ 13 PDFs scan; validação humana dos 66 (vigência/status); RLS policies; relações (0).
- Próxima: **FASE 12 — NÃO INICIADA** (decisão após auditoria).

## AUDITORIA PÓS-FASE 11 — 2026-09-25

- Checkpoint auditado: `5cc22b2d8f46b507d3a8f746b3f81b9baf9f1cff` (HEAD == origin/main)
- 39/66/66 preservados · 58 chunks · 58 embeddings · órfãos 0 · chunk IDs únicos 58/58 · embedding IDs únicos 58/58
- 1 content_hash compartilhado (CE): `73740653…` entre `chk_SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO_0000` e `chk_SRC_CE_DETRAN_RECURSO_JARI_0000` — **classificado: duplicata exata já registrada na Fase 9 (DUPLICATA_EXATA + duplicate_of)**; nenhum DELETE; métrica ajustada (duplicate chunk IDs=0; hash compartilhado=1)
- Provider efetivo embeddings: **DETERMINISTIC_LOCAL** (`defesai-legal-vectorizer-v1`, 1024) — NVIDIA primário indisponível no ambiente
- Testes: `vitest run src/core/knowledge/fase11-pipeline.test.ts` → 6/6 ✓
- Golden Path: in-process OK (5 + 5, sem fonte bloqueada); **gap: RPC `match_knowledge_chunks` ausente** (retrieval cross-process via pgvector pendente — registrado)
- Gaps: OCR 13 PDFs scan · validação humana vigência/status · RLS policies · relações · verificação online · RPC retrieval
- Relatório: `docs/recovery/FASE-11-AUDITORIA-POS-IMPLEMENTACAO-2026-09-25.md`

## FASE 12.1 — AUDITORIA DO ONBOARDING E CAPTURA DO CASO (2026-09-25)

> **FASE 12.1: CONCLUÍDA** — auditoria integral do fluxo onboarding → captura → OCR → confirmação → Case.
> Exclusivamente de AUDITORIA. **Nenhuma correção de código de aplicação. Nenhuma alteração no Supabase. Nenhuma migration. Nenhuma branch.**

- Checkpoint auditado: `2cff13aa034f06b7644dae1e6804292220af8726` (HEAD == origin/main, 0/0 ahead/behind)
- 0 arquivos rastreados modificados · 29 untracked pré-existentes (baseline md5 `e9a138254e2b0b2b0432a77b69c9a3b4`)
- Agents: `backend` (escopo @defesa-transito) · `backend` (escopo @ocr-evidencias) · `banco` · `frontend` · `testes` · `explore` (escopo @base-legal, read-only) · `qualidade` · supervisor (orquestração e verificação)
- Nota de topologia: `@defesa-transito`, `@ocr-evidencias` e `@base-legal` estão documentados em `AGENTS.md` mas **não existem no registro de subagents**; escopo declarado foi aplicado aos subagents reais correspondentes

### Resposta às duas perguntas da fase

**"Quais dados entram, de onde vêm, como são transformados, quais são confirmados, onde são persistidos, quais chegam ao Case e quais são perdidos antes da análise?"**
Entrada pelo wizard V1 (`OnboardingWizard.tsx`, `App.tsx:420`); transformação por `CanonicalMapper.onboardingPayloadToDomain` → `domainToRow` → `case-repository.ts:125 toPayload()` → `case-repository.ts:128 upsert`. A cadeia se parte em três: 15 flags de fato + `real_driver_*` + `commercial_offer_id` descartadas no `toPayload`; `applicant_json` gravada e nunca lida de volta; `notificationDeliveryDate` sem coluna; leitura do Express serve um Map em memória nunca populado no boot.

**"Quais limitações ainda são consequência da antiga base jurídica incompleta?"**
`INFRACTION_CATALOG` com 34 entradas vs 27 DETRANs read-only para citação e não para decisão · `jurisdiction: 'federal'` em 10/10 regras com `getActiveRules` filtrando só por data · `validUntil: null` em 10/10 regras (engine temporal inerte) · `new Date()` como data de referência quando a data da infração falta · `EVIDENCE_DEPENDENT_ARGUMENTS` com 3 entradas enquanto o motor produz argumentos por `legalArgumentId` fixo — a KB cresce e o repertório de teses não.

### Achados principais

- **Runtime de produção é o Cloudflare Worker** (`wrangler.jsonc:4`), não o Express. E o Worker **apaga `analysis` sem recomputar** (`cloudflare/routes/cases.ts:126`) → peça com zero teses; e **grava `commercial_offer_id`, coluna que não existe em `cases`** → insert falha
- `loadAllFromSupabase()` **nunca é chamado** → `GET /cases` vazio e 404 em casos legítimos após restart
- `POST /cases` aceita `isPaid` do body; `PUT /cases/:id` aceita o domain inteiro
- `uf` e `municipality` **não existem** (declarados, descartados no mapper, sem coluna) → `filterJurisdiction` sem entrada
- **KB nacional 100% desacoplada do Case**: zero FK, coluna, rota ou chamada no fluxo de decisão
- `evidenceFlags` sem produtor funcional (método inexistente) → ARG-012/019/020 permanentemente mortas
- `findInfraction('')` retorna o primeiro item do catálogo → OCR mudo carimba multa de `745-50`
- Upload de OCR decorativo (nunca envia bytes, sem Authorization, contrato divergente do Cloudflare) e **falha apresentada em caixa verde de sucesso**
- Órgão autuador nunca é perguntado; `procedureType` escolhido pelo cidadão é ignorado pelo motor
- 3 procedimentos vendidos (`suspensao_cnh`, `cassacao_cnh`, `conversao_advertencia`) com **0 documentos** na KB
- **22 testes de IDOR/autoridade jurídica/LGPD vermelhos**; `tsc --noEmit` = 63 erros
- Código morto: `src/onboarding/**` (6 arquivos), `onboarding-v2.ts` (7 rotas), `defense.ts`, `transitions.ts`, `ocr.worker.ts` (quebrado), `image-quality.service.ts` (órfão)
- ~405 referências normativas literais no domínio de trânsito; KB nova consumida por 1 arquivo fora do onboarding
- `cases`: 45 colunas núcleo sem `CREATE TABLE` versionado; ordering de migrations quebrado; 5 policies versionadas vs 6 canônicas (falta `cases_own_all` com `WITH CHECK`); `app_ref UNIQUE` inexistente

### Decisões que o supervisor precisa tomar antes da 12.2

1. Qual runtime é o canônico (Cloudflare vs Express)? **Requer ADR.**
2. Promover ou remover `src/onboarding/**` + `onboarding-v2.ts`?
3. A `RULES_MATRIX` serve frontend, backend ou os dois? Hoje existem **três** fontes divergentes.
4. Persistência das 15 flags: coluna dedicada ou `jsonb`?
5. A KB é vinculável ao Case na 12.2 ou na 12.3? Se agora, a **UF precisa ser capturada primeiro**.

- Relatório completo (17 seções, matriz de dados, TOP 20 achados, riscos de regressão): `docs/recovery/FASE-12.1-AUDITORIA-ONBOARDING-2026-09-25.md`
- **Próxima fase: FASE 12.2 — NÃO INICIADA.** Aguardando as 5 decisões acima.
