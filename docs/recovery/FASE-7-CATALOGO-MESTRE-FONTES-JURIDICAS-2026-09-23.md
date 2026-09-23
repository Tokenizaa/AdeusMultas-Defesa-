# FASE 7 — Catálogo Mestre de Fontes Jurídicas — 2026-09-23

## Objetivo
Definir a fonte de verdade para reconstrução da base jurídica do Adeus Multas, sem reutilizar conteúdo jurídico inventado ou presumido e sem inserir dados no RAG antes da validação das fontes.

## Princípio
O RAG será alimentado por fontes normativas e institucionais identificáveis, mantendo autoridade, jurisdição, tipo documental, número/data, URL oficial, publicação, vigência, revogação, versão, hash, coleta, relação com serviço/infração e validação.

## 1. Hierarquia de fontes
1. Constituição Federal, quando aplicável.
2. Lei nº 9.503/1997 — CTB e texto compilado.
3. Leis federais posteriores que alterem o CTB.
4. Decretos federais pertinentes.
5. Resoluções do CONTRAN.
6. Deliberações do CONTRAN.
7. Portarias da Senatran.
8. Atos normativos federais diretamente relacionados ao trânsito.

O portal oficial da Senatran reúne CTB, Resoluções/Deliberações do CONTRAN e Portarias da Senatran. O Planalto mantém o texto compilado do CTB.

## 2. Normas técnicas e manuais oficiais
- Manual Brasileiro de Fiscalização de Trânsito — MBFT.
- Manuais Brasileiros de Sinalização de Trânsito.
- Manual Brasileiro de Exames de Direção Veicular.
- Outros manuais e guias oficiais publicados pela Senatran/CONTRAN.

## 3. Processo administrativo
Para Defesa Prévia, JARI e recursos: CTB; resoluções sobre defesa/recurso; normas de Auto de Infração; notificações; JARI; suspensão/cassação; indicação do condutor; advertência; e normas específicas da penalidade.

## 4. Infrações e fiscalização
Cada infração deverá relacionar artigo CTB, enquadramento, código, gravidade, penalidade, medida administrativa, competência, requisitos de constatação, campos do AIT, observações, procedimento, equipamento quando aplicável, regulamentação complementar, MBFT, sinalização e vigência.

## 5. Categorias jurídicas
| Código | Família |
|---|---|
| FED-CTB | Código de Trânsito Brasileiro |
| FED-LEI | Leis federais relacionadas |
| CON-RES | Resoluções CONTRAN |
| CON-DEL | Deliberações CONTRAN |
| SEN-PORT | Portarias Senatran |
| SEN-MAN-FISC | Manual Brasileiro de Fiscalização |
| SEN-MAN-SIN | Manuais Brasileiros de Sinalização |
| SEN-MAN-OUT | Outros manuais oficiais |
| ORG-PROC | Procedimentos administrativos |
| ORG-JARI | JARI e recursos |
| ORG-SUSP | Suspensão/cassação |
| ORG-COND | Condutor/indicação de condutor |
| ORG-ADVERT | Advertência por escrito |
| EST-DET | Normas dos DETRANs |
| EST-CETRAN | Normas dos CETRANs |
| EST-ROD | Órgãos rodoviários estaduais |
| MUN-TRANS | Normas municipais pertinentes |
| JURIS | Jurisprudência com fonte e contexto identificados |

## 6. Jurisdição
- FEDERAL — nacional.
- ESTADUAL — norma estadual.
- DF — Distrito Federal.
- MUNICIPAL — competência municipal.
- RODOVIÁRIA — órgão rodoviário correspondente.

Uma regra estadual nunca será tratada como regra nacional.

## 7. Fontes oficiais nacionais
- Planalto: legislação federal e texto compilado do CTB.
- Ministério dos Transportes/Senatran: legislação de trânsito, resoluções, portarias e manuais.
- CONTRAN: catálogo oficial de atos normativos.
- Senado Federal: fonte legislativa oficial complementar para conferência.

## 8. Vigência
Todo documento deverá possuir published_at, effective_from, effective_until quando aplicável, status e referências às normas modificadoras/revogadoras. A base deve responder qual regra estava vigente na data do fato.

## 9. Alterações e revogações
Normas antigas não serão silenciosamente substituídas. A versão anterior permanece preservada, nova versão é criada, a norma modificadora é relacionada e a vigência é atualizada. Revogação fecha a vigência sem apagar o histórico.

## 10. Cobertura nacional
A camada federal é nacional. A camada estadual terá registro independente para os 26 estados e Distrito Federal, incluindo DETRAN, CETRAN, órgão rodoviário estadual quando pertinente e procedimentos oficiais específicos.

## 11. Mapeamento por serviço
- Defesa Prévia: CTB, resolução vigente, AIT, MBFT, infração e órgão autuador.
- JARI: CTB, resolução de recurso, órgão autuador, JARI e protocolo.
- CETRAN: CTB, normas federais, legislação estadual e regras do CETRAN.
- Suspensão/Cassação: CTB, resolução específica, DETRAN e processo administrativo.
- Indicação de real condutor: CTB, resolução/procedimento, órgão autuador, requisitos e prazo.
- Conversão em advertência: CTB, resolução aplicável, enquadramento/reincidência e procedimento.

## 12. Fontes prioritárias identificadas
- Resoluções CONTRAN: catálogo oficial atualizado em 26/08/2026.
- Conteúdo Senatran: portal atualizado em 04/09/2026.
- CTB compilado: Planalto.
- Manuais Senatran.
- Manuais de fiscalização e sinalização.
- Resolução CONTRAN nº 900/2022: defesa prévia e recursos.
- Resolução CONTRAN nº 985/2022 e alterações: MBFT.
- Resolução CONTRAN nº 723/2018: suspensão/cassação.
- Resolução CONTRAN nº 1031/2026: fiscalização de álcool e outras substâncias, com alterações de vigência diferenciada.

## 13. Estrutura lógica do catálogo
source_id, authority, source_type, title, document_number, publication_date, effective_from, effective_until, status, jurisdiction, scope, official_url, parent_source_id, amends_source_id, revokes_source_id, supersedes_source_id, retrieved_at, content_hash, version, validation_status.

Fluxo: source → document → version → chunks → embeddings.

## 14. Regras de segurança
- Não inserir textos sem fonte.
- Não usar fonte secundária como autoridade final.
- Não declarar vigência sem verificar situação.
- Não apagar versões anteriores.
- Não misturar normas federais e estaduais.
- Não gerar jurisprudência sintética.
- Não preencher RAG com dados fictícios.
- Não executar ingestão em massa nesta fase.

## Resultado
**FASE 7 — CATÁLOGO MESTRE DE FONTES JURÍDICAS: CONCLUÍDA.**

O modelo de autoridade, hierarquia, jurisdição, vigência, versionamento e cobertura foi definido.

## Próximo gate
**FASE 8 — COLETA E INVENTÁRIO DOCUMENTAL OFICIAL.**

A próxima fase transforma o catálogo em inventário real de documentos, começando pela camada federal e depois pelas 27 UFs, sem publicação automática no RAG antes da validação do inventário e dos documentos.