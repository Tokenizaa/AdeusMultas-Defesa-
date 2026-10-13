# Fase final — certificação de produção (2026-10-13)

## Escopo e regra de segurança

Esta auditoria foi executada contra o projeto Supabase canônico `llmxnpgjpxcvyrqjkfwb` usando CLI e MCP. O banco remoto permaneceu somente leitura. Não foram aplicadas migrations, não houve alteração de histórico e nenhum SQL destrutivo foi executado.

## Chave service-role

- `scripts/restore-knowledge.js` não contém mais chave hardcoded; o script exige `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente.
- O valor removido era um JWT real do projeto, não um falso positivo.
- Busca no histórico Git rastreado não encontrou esse valor literal nem esse script versionado.
- Rotação não foi executada: não há operação de rotação exposta pelo CLI/MCP disponível nesta sessão. A chave deve ser revogada/rotacionada no painel/API de credenciais do Supabase e atualizada no secret manager, Cloudflare/Vercel e CI.

## Migrations e schema

- Remoto: 67 registros na tabela de migrations.
- Local: 46 arquivos de migration (45 rastreados mais 1 arquivo local não rastreado).
- O remoto possui timestamps de aplicação diferentes dos nomes lógicos, migrations duplicadas e um conjunto de migrations que não existe localmente.
- As tabelas `knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_ingestions` e `knowledge_document_relations` existem e estão com RLS habilitado.
- A contagem de dados foi confirmada separadamente pelo CLI usando `service_role`: 39 fontes, 66 documentos, 66 versões e 58 chunks.

### Plano seguro de reconciliação

1. Gerar dump completo de schema e dados críticos, armazenar em local versionado/criptografado e testar restauração em branch Supabase.
2. Comparar schema real (`information_schema`, `pg_policies`, funções, grants, índices e extensões) com cada migration, não apenas comparar timestamps.
3. Identificar o ancestral comum e congelar o remoto como baseline imutável.
4. Gerar uma migration de reconciliação aditiva, com pré-condições e `DO`/`IF EXISTS`, somente depois de validar a restauração em branch.
5. Executar a migration primeiro em branch/staging, rodar Advisors e testes de autorização/RAG.
6. Aplicar em produção com janela, backup verificável e plano de rollback. Até essas evidências existirem, o histórico permanece pendente.

## Advisors Supabase — baseline remoto

### Segurança

- 17 tabelas com RLS sem policy. A análise de código indica que parte delas é backend-only e o padrão deny-all para `anon`/`authenticated` é intencional; não devem receber policies genéricas.
- `public.is_admin()` e `public.current_role_name()` são `SECURITY DEFINER` e continuam executáveis por `anon`/`authenticated`. A correção exige revisar as policies que dependem dessas funções antes de revogar EXECUTE ou mover as funções.
- Proteção contra senhas vazadas desativada; correção depende da configuração Auth do projeto, não de migration SQL local.
- `vector`, `pg_trgm` e `citext` estão no schema `public`; mover extensões pode quebrar tipos, índices e RPCs e requer branch/teste de restauração.

### Performance

- Há foreign keys sem índices, policies permissivas duplicadas e índice duplicado em `user_profiles`.
- Esses itens precisam de inventário por tabela e teste de carga antes de qualquer remoção/alteração.

## Validações locais

- Golden documents: 10/10 aprovados no Quality Gate canônico.
- RAG: 50 chunks recuperados.
- Provenance: 12/12 teses autorizadas com provenance; 57/57 registros com URL oficial válida.
- IA: testes direcionados aprovados.
- LGPD: testes direcionados aprovados.
- Documenso/webhooks: 11/11 testes aprovados.
- Autorização de pagamento: testes direcionados aprovados.
- Gateway: testes direcionados aprovados.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado.
- O `npm run lint` anterior ficou sujeito ao timeout do TypeScript; a execução direta posterior de `npx tsc --noEmit` terminou com sucesso.
- A suíte completa ainda precisa de uma execução final após estas alterações; não há certificação global enquanto isso não ocorrer.

## Veredito

**Não aprovado para produção.** O núcleo jurídico/RAG está aprovado, mas permanecem bloqueios críticos: rotação da chave real, reconciliação de migrations/schema, correções verificadas dos Advisors e certificação da suíte completa.
