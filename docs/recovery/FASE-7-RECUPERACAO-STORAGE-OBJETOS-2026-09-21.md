# Fase 7 — Recuperação de Storage e objetos

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Projeto auditado:** LLMX `llmxnpgjpxcvyrqjkfwb`  
**Modo:** somente leitura.

## 1. Objetivo

Determinar exatamente quais buckets, configurações, objetos e políticas de Storage ainda existem no LLMX, cruzando esse estado com o Git, e separar:

- Storage diretamente recuperável;
- Storage cuja estrutura está comprovada pelo Git;
- objetos que precisam ser recuperados externamente;
- lacunas que não podem ser resolvidas sem o SGOM/backup.

## 2. Buckets preservados

| Bucket | Público | Limite | MIME | Objetos LLMX |
|---|---|---:|---|---:|
| ai-policy | não | 20 MiB | PDF, Markdown, texto | 0 |
| case-documents | não | 10 MiB | PDF | 0 |
| lgpd-exports | não | 50 MiB | PDF, JSON | 0 |
| marketing-assets | sim | 50 MiB | PNG, JPEG, WebP, MP4 | 8 |
| skill-assets | não | 5 MiB | sem restrição declarada | 0 |
| whatsapp-media | não | 50 MiB | sem restrição declarada | 0 |

Os seis buckets permanecem no LLMX.

## 3. Objetos preservados

Foram encontrados **8 objetos**, todos em `marketing-assets`.

Total informado pelo metadata dos objetos: **407.611 bytes**.

Objetos:

| Objeto | MIME | Bytes | Criado |
|---|---|---:|---|
| 17e1f2ef-e775-4478-b4e6-38cfa960eb9f_dia1.png | image/png | 33.556 | 27/08/2026 |
| 22bd4696-1feb-4465-a640-577fc356e9b3_dia4.png | image/png | 65.035 | 27/08/2026 |
| 40bd46d6-12ed-41df-a41e-d6e1ec62db64_dia3.png | image/png | 35.571 | 28/08/2026 |
| 5d26abae-63c1-4298-9395-7876b40b1515_dia7.png | image/png | 47.317 | 27/08/2026 |
| 5d26abae-fc97-418a-a8ec-ebde0ee4cae3_dia7.png | image/png | 77.989 | 28/08/2026 |
| 6d246b93-d6e7-466d-a2d5-b1a2efdd1324_dia2.png | image/png | 41.342 | 27/08/2026 |
| be623f95-af80-425b-b60a-45b0e8e76a2d_dia6.png | image/png | 63.926 | 28/08/2026 |
| e8e498f4-509d-4e7c-902e-2f0aac56cbdd_dia5.png | image/png | 42.875 | 27/08/2026 |

O inventário identifica os objetos por nome e metadata. O conteúdo binário não foi alterado nem copiado para o Git.

## 4. Políticas de Storage preservadas

O LLMX possui as seguintes políticas relevantes em `storage.objects`:

- Public read marketing assets
- Admin insert marketing assets
- Admin update marketing assets
- Admin delete marketing assets
- Admin read ai policy assets
- Admin read lgpd exports
- Admin read skill assets
- Admin read whatsapp media

O padrão é privado, com `marketing-assets` como único bucket público.

As políticas administrativas exigem usuário autenticado com registro correspondente em `public.user_profiles` e role `admin`.

## 5. Evidência no Git

A migration:

`20260905000002_storage_access_policies_baseline.sql`

reproduz explicitamente as oito políticas atualmente observadas no LLMX.

Ela confirma que o modelo esperado pelo código era:

- somente `marketing-assets` público;
- demais buckets privados;
- leitura administrativa dos buckets privados;
- escrita/alteração/exclusão administrativa de `marketing-assets`.

Portanto, a **estrutura de autorização do Storage é recuperável por Git + LLMX**.

Também existe evidência anterior no histórico Git relacionada ao bucket privado `case-documents`, indicando que esse bucket fazia parte do domínio de documentos de casos.

## 6. Classificação de recuperação

### A — Recuperação direta

**8 objetos de `marketing-assets`** permanecem registrados no LLMX.

Metadados, nomes, timestamps, MIME types, tamanhos e ETags estão disponíveis.

### B — Recuperação estrutural por Git

Os seis buckets e as políticas principais podem ser reconstruídos a partir do estado LLMX e das migrations/documentação versionadas.

### D — Recuperação externa

Ainda não há evidência suficiente para afirmar que:

- `ai-policy` sempre esteve vazio;
- `case-documents` sempre esteve vazio;
- `lgpd-exports` sempre esteve vazio;
- `skill-assets` sempre esteve vazio;
- `whatsapp-media` sempre esteve vazio;
- os oito objetos de `marketing-assets` representam todos os objetos que existiram no SGOM.

Essa distinção é importante: **zero objetos no LLMX não equivale a zero objetos históricos no SGOM**.

## 7. Limitação operacional

A conexão Supabase disponível para esta auditoria permite consultar o catálogo de Storage e seus metadados, mas não disponibiliza nesta sessão uma operação de download/exportação binária dos objetos.

Consequentemente, nesta fase:

- nenhum objeto foi baixado;
- nenhum objeto foi recriado;
- nenhum bucket foi modificado;
- nenhum arquivo foi colocado no Git.

A recuperação binária deverá ocorrer somente na fase de reconstrução, ou por uma fonte externa de backup/exportação, preservando os objetos originais.

## 8. Decisão

O Storage do LLMX deve ser tratado como uma **fonte preservada**, não como uma reconstrução completa do SGOM.

Para a futura reconstrução:

1. recriar os seis buckets conforme o manifesto;
2. restaurar as políticas conforme Git + snapshot;
3. recuperar os oito objetos existentes;
4. verificar referências desses objetos na aplicação e no banco;
5. investigar objetos históricos adicionais via backup/PITR/Suporte;
6. somente depois validar integridade dos arquivos.

## 9. Conclusão

**FASE 7 — CONCLUÍDA.**

Foi comprovado:

- 6 buckets preservados;
- 8 objetos preservados;
- 407.611 bytes de objetos registrados;
- 8 políticas de Storage relevantes;
- correspondência direta entre políticas do LLMX e migration Git;
- existência histórica documentada de `case-documents`.

A principal lacuna continua sendo determinar se existiam objetos no SGOM que não sobreviveram no LLMX.

Nenhuma alteração foi realizada no LLMX.
