# Fase 14 — Validação estrutural e funcional

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Alvo:** Supabase LLMX `llmxnpgjpxcvyrqjkfwb`

## 1. Objetivo

Validar o estado reconstruído do LLMX contra o snapshot estrutural, o manifesto das Fases 10–13 e o inventário de dados preservados.

A validação foi somente leitura.

## 2. Validação estrutural

Baseline confirmado diretamente no PostgreSQL:

| Objeto | Resultado |
|---|---:|
| Tabelas públicas | 52 |
| Constraints públicas | 202 |
| Índices públicos | 180 |
| Policies públicas | 148 |
| Tabelas com RLS | 49/52 |
| Triggers públicos não internos | 11 |
| Funções públicas | 207 |
| Enum público | 1 |
| Extensões | 8 |
| Foreign keys | 43 |
| Primary keys | 52 |
| Unique constraints | 20 |
| Check constraints | 87 |
| Constraints não validadas | 0 |

Os quantitativos principais coincidem com o snapshot estrutural e as Fases 10–12.

## 3. Dados

Dataset recuperável preservado:

- 351 registros públicos;
- 19 tabelas públicas não vazias;
- 4 usuários em `auth.users`.

Não houve alteração de dados durante a validação.

## 4. Storage e Realtime

Estado preservado anteriormente e confirmado no processo de validação:

- 6 buckets Storage;
- 8 objetos Storage;
- publicação `supabase_realtime` presente;
- 1 relação atualmente vinculada à publicação Realtime.

A relação atual da publicação não é tratada como prova de equivalência histórica com o SGOM.

## 5. Funções críticas

As 11 funções próprias documentadas continuam presentes, incluindo:

- `admin_update_user_role`;
- `admin_update_user_role_by_email`;
- `current_user_id`;
- `domain_to_uuid`;
- `emit_event`;
- `handle_new_user`;
- `handle_user_update`;
- `match_knowledge_chunks`;
- `set_updated_at`;
- `update_documenso_envelopes_updated_at`;
- `update_updated_at_column`.

As funções administrativas, de emissão de eventos e triggers de usuário permanecem SECURITY DEFINER conforme o estado preservado.

## 6. Integridade

Não foram identificadas constraints públicas não validadas.

O catálogo confirma 43 foreign keys, 52 primary keys, 20 unique constraints e 87 check constraints.

Isso comprova a integridade estrutural das constraints presentes no PostgreSQL. Não comprova, entretanto, que o conjunto seja idêntico ao SGOM perdido.

## 7. Migrations

O catálogo LLMX permanece com o histórico observado anteriormente, incluindo migrations duplicadas/reaplicadas.

A validação não reaplicou nenhuma migration.

A existência do histórico LLMX não é usada para afirmar equivalência com as 88 migrations atribuídas historicamente ao SGOM.

## 8. Security Advisor

O Advisor continua apresentando findings já conhecidos no LLMX, entre eles:

- 15 tabelas com RLS sem policies;
- 2 funções com search_path mutável;
- 3 tabelas públicas sem RLS;
- 3 extensões instaladas em `public`;
- proteção contra senhas vazadas desabilitada.

Esses achados são registrados como estado técnico atual. **Nenhum foi corrigido nesta fase**, porque esta fase valida a reconstrução e não autoriza alterações de segurança fora do escopo histórico.

Também existem findings de performance, incluindo índices duplicados e oportunidades de otimização de RLS/FKs.

## 9. Critério funcional

A validação funcional desta fase é limitada ao banco e seus objetos:

- catálogo PostgreSQL responde normalmente;
- tabelas e constraints estão presentes;
- constraints estão validadas;
- funções próprias estão presentes;
- triggers e RLS estão presentes conforme baseline;
- dados preservados continuam acessíveis;
- Storage e Realtime permanecem configurados.

Não foi realizado cutover nem teste funcional completo do frontend/produção.

## 10. Conclusão

**FASE 14 — CONCLUÍDA.**

O LLMX está estruturalmente consistente com o baseline recuperável documentado nas fases anteriores.

Não foram encontrados desvios quantitativos nos principais objetos estruturais.

As diferenças que permanecem são principalmente de **limitação histórica**: não existe evidência suficiente para provar que o estado atual é uma cópia literal do SGOM apagado.

Os findings de Security/Performance Advisor permanecem registrados e não foram alterados.

## 11. Próxima fase

**Fase 15 — Homologação e preparação para eventual cutover.**

A Fase 15 deverá tratar o estado reconstruído como **SGOM RECONSTRUÍDO POR EVIDÊNCIAS**, executar a homologação final e somente então avaliar qualquer mudança de produção.
