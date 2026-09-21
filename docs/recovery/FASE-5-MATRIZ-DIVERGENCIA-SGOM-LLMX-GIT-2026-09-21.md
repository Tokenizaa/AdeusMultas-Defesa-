# Fase 5 — Matriz de divergência SGOM × LLMX × Git

**Data:** 2026-09-21  
**Branch:** recovery/sgom-db-reconstruction  
**Natureza:** auditoria forense somente leitura.

## Objetivo
Determinar qual evidência existe para reconstrução do SGOM histórico usando SGOM documental, LLMX acessível e Git.

## Classificação
- **A — Recuperação direta:** estado ainda disponível no LLMX.
- **B — Recuperação por Git:** definição comprovada no Git.
- **C — Reconstrução combinada:** LLMX + Git/evidência permitem reconstrução.
- **D — Backup/PITR/Suporte:** evidência atual insuficiente; depende de recuperação externa.
- **E — Não comprovado:** evidência insuficiente.

## Matriz

| Domínio/objeto | LLMX | Git | SGOM histórico | Classe |
|---|---|---|---|---|
| Schema público / tabelas | 52 | parcial | SGOM validado em 15/09 | C |
| Colunas/tipos/defaults | presente | parcial | indireta | C |
| PK/FK/UNIQUE/CHECK | 202 constraints | parcial | indireta | C |
| Índices | 180 | parcial | indireta | C |
| RLS | 49/52 | parcial | cases/profiles documentados | C |
| Policies | 148 | parcial | pontual | C |
| Triggers | 11 | parcial | indireta | C |
| Funções public | 207 | parcial | indireta | C |
| Enum user_role | presente | presente/parcial | relacionada | C |
| Extensões | inventariadas | parcial | indireta | C |
| Realtime | supabase_realtime | parcial | indireta | C |
| Storage buckets | 6 | parcial | indireta | C |
| Storage objetos | 8 | parcial | não comprovada | A/C |
| Edge Functions | nenhuma identificada | nenhuma | nenhuma | E |
| Dados cases | 47 | schema parcial | cases documentado | C |
| Dados user_profiles | 4 | migrations relacionadas | profiles documentado | C |
| Dados pagamentos | 14 + 2 eventos | parcial | indireta | C |
| Dados marketing | várias tabelas | parcial | indireta | C |
| Dados messaging | 2/2/13 | migration histórica + Git | indireta | C |
| Dados editoriais | 7 + 12 versões | migrations | indireta | C |
| Histórico migrations SGOM | inacessível | incompleto | 88 documentadas | D |
| Histórico migrations LLMX | 58/54 únicos | comparável | não é SGOM | A |
| Dados SGOM ausentes no LLMX | desconhecido | parcialmente inferíveis | não completo | D/E |
| Estado exato pré-exclusão SGOM | não | não | parcial | D |

## Dados recuperáveis já identificados

| Tabela | LLMX |
|---|---:|
| app_settings | 28 |
| cases | 47 |
| collection_runs | 45 |
| content_versions | 12 |
| e2e_test_results | 36 |
| e2e_test_runs | 3 |
| editorial_content | 7 |
| marketing_automation_state | 1 |
| marketing_campaigns | 14 |
| marketing_lead_campaigns | 7 |
| marketing_leads | 102 |
| messaging_contacts | 2 |
| messaging_conversations | 2 |
| messaging_messages | 13 |
| payment_orders | 14 |
| payment_webhook_events | 2 |
| promotions | 1 |
| service_pricings | 11 |
| user_profiles | 4 |
| auth.users | 4 |

Esses registros são fontes recuperáveis do LLMX e não são declarados como cópia comprovada do SGOM.

## Divergências críticas

### 1. SGOM tinha 88 migrations
A evidência G1-01 de 2026-09-15 registra 88 migrations no SGOM. O LLMX acessível contém 58 registros. A lista completa das 88 não foi recuperada.

### 2. Git atual não é o histórico completo
O Git contém 34 migrations SQL e um teste SQL. Portanto não representa sozinho o SGOM.

### 3. Há renomeações e reaplicações
Existem correspondências semânticas entre nomes diferentes, como create_marketing_leads, create_marketing_automation e create_messaging_tables. Comparação literal gera falsos negativos.

### 4. Timestamps duplicados
O Git possui dois pares com timestamp duplicado: 20260827000002 e 20260908000001. A ordem não pode ser determinada apenas pelo timestamp.

## Itens que passam para recuperação externa

1. lista completa das 88 migrations SGOM;
2. registros SGOM ausentes no LLMX;
3. objetos Storage existentes somente no SGOM;
4. dados SGOM que não sobreviveram no LLMX;
5. estado exato das policies/RLS no instante anterior à exclusão;
6. configurações SGOM não preservadas em Git ou LLMX.

Esses itens devem ser investigados na Fase 9.

## Decisão

A evidência permite uma reconstrução técnica parcial e controlada, mas ainda não permite declarar equivalência histórica 100% com o SGOM.

Não criar o novo banco nem importar dados nesta fase. Primeiro executar Fases 6, 7, 8 e 9; depois consolidar o manifesto da Fase 10.

## Critério de conclusão

**ATENDIDO.**

A matriz distingue o que existe, sua origem, o que pode ser reconstruído e o que depende de recuperação externa.
