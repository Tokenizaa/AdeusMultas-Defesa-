# Fase 10 — Manifesto Final de Reconstrução do SGOM

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Alvo histórico:** SGOM `sgomwklorpzdwdubtmgg`  
**Fonte operacional preservada:** LLMX `llmxnpgjpxcvyrqjkfwb`  
**Natureza:** manifesto forense, sem criação de projeto e sem alteração de banco.

## 1. Objetivo

Transformar as evidências das Fases 1–9 em uma especificação única para reconstrução do banco histórico.

A regra central é:

> reconstruir somente aquilo que possui evidência; não preencher lacunas por suposição.

O manifesto não afirma que o novo banco será uma cópia histórica 100% idêntica ao SGOM. Ele define o maior estado recuperável e identifica explicitamente as perdas.

---

## 2. Estado de recuperação

| Camada | Evidência disponível | Classificação |
|---|---|---|
| Projeto SGOM original | excluído | D — fonte perdida |
| Schema público | 52 tabelas no LLMX + Git/histórico | C |
| Constraints | 202 no LLMX | A/C |
| Índices | 180 no LLMX | A/C |
| RLS | 49/52 no LLMX | A/C |
| Policies | 148 no LLMX | A/C |
| Funções públicas | 207, sendo 11 próprias | A/C |
| Triggers públicos | 11 | A/C |
| Enum `user_role` | recuperado | A/B |
| Extensões | 8 | A/C |
| Realtime | publicação preservada no LLMX | A, equivalência histórica não comprovada |
| Storage | 6 buckets / 8 objetos no LLMX | A/C |
| Dados | 351 registros públicos + 4 Auth users | A |
| Histórico de migrations SGOM | somente prova de 88 migrations | D |
| Git atual | 34 migrations SQL | B |
| Histórico LLMX | 58 registros / 54 nomes únicos | A |
| Backup/PITR SGOM | perdido com exclusão | D |
| Dump externo completo | não localizado | E |

---

## 3. Base estrutural

O LLMX preserva:

- **52 tabelas públicas**
- **202 constraints**
- **180 índices**
- **148 policies**
- **49/52 tabelas com RLS**
- **11 triggers públicos**
- **207 funções públicas**
- **1 enum**
- **8 extensões**
- **1 publicação Realtime**
- **6 buckets Storage**

O snapshot estrutural reproduzível da Fase 3 permanece como fonte técnica:

`docs/recovery/llmx-structural-snapshot-2026-09-21.sql`

e:

`docs/recovery/LLMX-STRUCTURAL-SNAPSHOT-2026-09-21.md`

Esses artefatos devem ser tratados como a referência estrutural primária do estado preservado.

---

## 4. Dados recuperáveis

Existem **351 registros** em 19 tabelas públicas não vazias:

| Tabela | Registros |
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

Além disso:

- `auth.users`: 4 usuários;
- Storage: 6 buckets;
- Storage: 8 objetos.

**Importante:** esses dados são recuperáveis do LLMX, mas não são declarados como cópia comprovada do SGOM.

---

## 5. Tabelas sem dados preservados

33 tabelas públicas estão atualmente vazias no LLMX.

Isso não será interpretado como “historicamente vazias”.

Na reconstrução:

- a estrutura poderá ser recriada quando comprovada;
- os dados somente serão importados quando houver fonte;
- ausência de dados será registrada como lacuna quando não houver outra evidência.

---

## 6. Funções e triggers

As 11 funções próprias recuperáveis são:

- `admin_update_user_role(uuid,text)`
- `admin_update_user_role_by_email(text,text)`
- `current_user_id()`
- `domain_to_uuid(text)`
- `emit_event(...)`
- `handle_new_user()`
- `handle_user_update()`
- `match_knowledge_chunks(...)`
- `set_updated_at()`
- `update_documenso_envelopes_updated_at()`
- `update_updated_at_column()`

Existem 11 triggers públicos não internos no estado preservado.

Os triggers de `auth.users` também devem ser reconstruídos quando o schema Auth for configurado, usando as funções `handle_new_user()` e `handle_user_update()`.

As definições completas estão preservadas no snapshot estrutural.

---

## 7. Segurança e RLS

Estado preservado:

- 49/52 tabelas públicas com RLS;
- 3 sem RLS:
  - `messaging_contacts`
  - `messaging_conversations`
  - `messaging_messages`
- 148 policies.

### Regra de reconstrução

Não copiar cegamente o estado de segurança do LLMX para produção.

O LLMX contém findings de Security Advisor que precisam ser avaliados durante a reconstrução, incluindo:

- tabelas com RLS sem policy;
- funções com search_path mutável;
- tabelas públicas sem RLS;
- extensões em `public`;
- proteção contra senhas vazadas desabilitada.

Esses pontos são **evidências e alertas**, não autorização para modificar o LLMX agora.

---

## 8. Extensões

Extensões preservadas:

- `citext 1.6`
- `pg_stat_statements 1.11`
- `pg_trgm 1.6`
- `pgcrypto 1.3`
- `plpgsql 1.0`
- `supabase_vault 0.3.1`
- `uuid-ossp 1.1`
- `vector 0.8.2`

A instalação deverá ocorrer somente quando a nova infraestrutura estiver criada e a compatibilidade das versões tiver sido verificada.

---

## 9. Realtime

Existe a publicação:

`supabase_realtime`

com:

- puballtables = false;
- INSERT habilitado;
- UPDATE habilitado;
- DELETE habilitado;
- TRUNCATE habilitado.

As relações exatas do SGOM histórico não foram preservadas. Portanto, a publicação será reconstruída a partir de Git + código + validação funcional, não por suposição.

---

## 10. Storage

Estado preservado no LLMX:

- 6 buckets;
- 8 objetos;
- 407.611 bytes;
- 8 políticas relevantes.

Todos os 8 objetos observados estão em `marketing-assets`.

O bucket `case-documents` possui evidência histórica adicional no Git.

### Regra

Database backup e Storage objects são tratados como fontes distintas.

Os objetos existentes no LLMX poderão ser recuperados diretamente; objetos que existiam somente no SGOM e não possuem cópia externa são considerados perdidos.

---

## 11. Migrations

Há três níveis de evidência:

### SGOM

Evidência histórica de 2026-09-15:

**88 migrations registradas.**

A lista textual completa não sobreviveu.

### LLMX

**58 registros / 54 nomes únicos.**

Há migrations repetidas e reaplicadas, portanto o histórico não deve ser reduzido a nomes únicos.

### Git atual

**34 migrations SQL.**

O Git é fonte normativa para o que está versionado atualmente, mas não é o histórico completo do SGOM.

### Regra de reconstrução

A ordem será determinada por:

1. dependências de schema;
2. constraints;
3. referências entre tabelas;
4. efeitos reais das migrations;
5. histórico LLMX;
6. migrations Git.

Timestamp sozinho não será usado como ordem absoluta porque existem timestamps duplicados no Git.

---

## 12. Classificação definitiva

### A — Recuperação direta

Estado/data existente no LLMX:

- 19 tabelas com 351 registros;
- 4 Auth users;
- 52 tabelas como estrutura;
- constraints;
- índices;
- funções;
- triggers;
- RLS;
- policies;
- extensões;
- Storage preservado.

### B — Recuperação por Git

- migrations versionadas;
- regras de segurança;
- alterações de schema;
- definições SQL presentes no repositório;
- evidências de integração.

### C — Reconstrução combinada

Necessária para:

- schema final;
- relações;
- constraints;
- policies;
- triggers;
- Auth;
- Storage;
- Realtime;
- ordem das migrations.

### D — Evidência perdida

- banco SGOM original;
- backups/PITR associados ao projeto excluído;
- dados exclusivos do SGOM sem cópia;
- lista completa das 88 migrations;
- objetos Storage exclusivos sem cópia.

### E — Não comprovado

Qualquer objeto para o qual não exista evidência suficiente será mantido nessa classe até surgir nova fonte.

---

## 13. O que NÃO será feito

Antes da validação:

- não importar dados diretamente para produção;
- não apontar o frontend para um banco novo;
- não sobrescrever LLMX;
- não presumir que LLMX = SGOM;
- não inventar registros ausentes;
- não inventar migrations;
- não transformar achados de segurança em alterações automáticas;
- não apagar artefatos históricos.

---

## 14. Ordem oficial da reconstrução

A partir deste manifesto:

1. **Criar novo projeto Supabase isolado**
2. **Fixar versão/região/configuração compatíveis**
3. **Recriar extensões necessárias**
4. **Recriar schema base**
5. **Recriar constraints e índices**
6. **Recriar enum e funções**
7. **Recriar triggers**
8. **Recriar RLS/policies**
9. **Recriar Auth necessário**
10. **Recriar Storage/buckets/policies**
11. **Recriar Realtime**
12. **Importar os dados recuperáveis**
13. **Preservar IDs e relações**
14. **Executar validação estrutural**
15. **Executar validação funcional**
16. **Comparar novo estado com o manifesto**
17. **Somente depois avaliar cutover**

Nenhuma etapa posterior autoriza automaticamente a seguinte.

---

## 15. Critérios para criação do novo projeto

A criação só será considerada válida quando houver:

- manifesto versionado;
- branch de reconstrução preservada;
- snapshot estrutural preservado;
- inventário de dados preservado;
- lista de lacunas explícita;
- ordem de reconstrução definida;
- separação clara entre fonte recuperada e inferência técnica.

Esses critérios foram atendidos nesta fase.

---

## 16. Limitação histórica final

A reconstrução resultante deverá ser denominada:

**SGOM RECONSTRUÍDO POR EVIDÊNCIAS**

e não:

**SGOM ORIGINAL RESTAURADO**

porque o projeto original e seus backups foram excluídos.

Isso é uma distinção documental obrigatória para evitar que o novo banco seja posteriormente tratado como cópia histórica comprovada.

---

## 17. Resultado da Fase 10

**FASE 10 — CONCLUÍDA.**

O manifesto final foi produzido e consolida:

- estrutura;
- dados;
- Storage;
- funções;
- triggers;
- RLS;
- policies;
- extensões;
- Realtime;
- migrations;
- classificação de recuperação;
- lacunas;
- ordem de reconstrução;
- critérios para criação do novo projeto.

### Próxima fase

**FASE 11 — Criação do novo projeto de reconstrução.**

A criação deverá ocorrer em ambiente isolado, sem alterar o LLMX e sem qualquer cutover de produção.
