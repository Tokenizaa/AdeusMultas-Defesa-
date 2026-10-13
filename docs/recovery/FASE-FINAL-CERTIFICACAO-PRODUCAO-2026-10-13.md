# Fase final — certificação de produção (2026-10-13)

## Escopo e regra de segurança

Esta auditoria foi executada contra o projeto Supabase canônico `llmxnpgjpxcvyrqjkfwb` usando CLI e MCP. Antes das mudanças remotas foram gerados dumps verificáveis de schema e dados em `/tmp` (schema não vazio; dados com 4.713.840 bytes). Não houve SQL destrutivo.

## Chave service-role

- `scripts/restore-knowledge.js` não contém mais chave hardcoded; o script exige `SUPABASE_URL` e prefere `SUPABASE_SECRET_KEY`, com fallback explícito para `SUPABASE_SERVICE_ROLE_KEY` durante a migração.
- O valor removido era um JWT real do projeto, não um falso positivo.
- Busca no histórico Git rastreado não encontrou esse valor literal nem esse script versionado.
- A chave moderna `SUPABASE_SECRET_KEY` foi validada somente em memória contra o endpoint REST e não foi gravada em arquivo/log. A chave legacy exposta continua ativa até a atualização atômica dos consumidores; a rotação/revogação final permanece pendente de secret managers e deployments.

## Migrations e schema

- Remoto: 71 registros na tabela de migrations após quatro migrations corretivas aplicadas via MCP.
- Local: 50 arquivos SQL de migration.
- O remoto possui timestamps de aplicação diferentes dos nomes lógicos, migrations duplicadas e um conjunto de migrations que não existe localmente.
- As tabelas `knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_ingestions` e `knowledge_document_relations` existem e estão com RLS habilitado.
- A contagem de dados foi confirmada separadamente pelo CLI usando `service_role`: 39 fontes, 66 documentos, 66 versões e 58 chunks.

### Reconciliação executada e pendências

1. Dumps completos de schema e dados críticos foram gerados antes da alteração.
2. O schema real foi comparado por `information_schema`, policies, funções, grants, índices e extensões.
3. Foram aplicadas migrations aditivas: deny-all explícito para as 17 tabelas backend-only, funções administrativas privadas, revogação de EXECUTE público e os 7 índices de FKs ausentes.
4. O índice/constraint único redundante de `user_profiles` foi removido preservando a FK.
5. A reconciliação operacional foi concluída e documentada em [SUPABASE-MIGRATION-RECONCILIATION-2026-10-13.md](./SUPABASE-MIGRATION-RECONCILIATION-2026-10-13.md). A divergência histórica permanece imutável e auditável; não foi usado `migration repair` sem ancestral 1:1 comprovado.

## Advisors Supabase — baseline remoto

### Segurança — estado atual

- As 17 tabelas backend-only agora têm policies explícitas de negação para `anon`/`authenticated`.
- `is_admin()` e `current_role_name()` foram movidas para schema privado e não têm mais EXECUTE para `anon`/`authenticated`.
- Proteção contra senhas vazadas desativada; correção depende da configuração Auth do projeto, não de migration SQL local.
- `vector`, `pg_trgm` e `citext` estão no schema `public`; mover extensões pode quebrar tipos, índices e RPCs e requer branch/teste de restauração.

### Performance — estado atual

- Foreign keys sem índices e o índice duplicado de `user_profiles` foram corrigidos.
- `auth_rls_initplan` e policies permissivas múltiplas foram eliminados após consolidação por papel; os testes de autorização/RLS passaram 66/66.
- Restam apenas informações de tabelas sem PK no schema de backup e índices ainda não usados, sem WARN de performance no schema operacional.

## Validações locais

- Golden documents: 10/10 aprovados no Quality Gate canônico quando executados com conectividade Supabase autorizada; a execução sem rede retornou 0 chunks e não é evidência válida.
- RAG: 50 chunks recuperados na execução autorizada.
- Provenance: 12/12 teses autorizadas com provenance; 57/57 registros com URL oficial válida na execução autorizada.
- IA: testes direcionados aprovados.
- LGPD: testes direcionados aprovados.
- Documenso/webhooks: 11/11 testes aprovados.
- Autorização de pagamento: testes direcionados aprovados.
- Gateway: testes direcionados aprovados.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado.
- O `npm run lint` anterior ficou sujeito ao timeout do TypeScript; a execução direta posterior de `npx tsc --noEmit` terminou com sucesso.
- Suíte completa final com rede autorizada: 86/86 arquivos, 830 testes aprovados e 7 testes esperados; duração 175,76s.

## Veredito

**Não aprovado para produção.** Os três bloqueios técnicos solicitados foram resolvidos: migrations operacionais reconciliadas, Advisors WARN de schema eliminados e suíte completa aprovada. Permanece o bloqueio externo de proteção HIBP (HTTP 402) e a rotação/revogação da chave legacy exposta, que exige atualização coordenada dos secret managers/deployments.
