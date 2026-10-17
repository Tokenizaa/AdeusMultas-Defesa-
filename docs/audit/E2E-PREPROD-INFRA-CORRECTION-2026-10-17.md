# Correção da infraestrutura E2E pré-produção — 2026-10-17

**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `integration/preproduction-e2e-gates`  
**Escopo:** harness de 70 cenários, cinco identidades compartilhadas, validador de contaminação, evidência HTTP 429 e ciclo de servidor local.

## Evidência do banco antes da correção

Consulta somente leitura ao projeto Supabase `llmxnpgjpxcvyrqjkfwb`:

- 70 registros de preparação foram criados em torno de 05:01 UTC em 2026-10-17, com títulos por serviço/cenário e status `draft`.
- Entre 05:49 e 06:14 UTC foram registrados 21 casos adicionais de `defesa_previa` com análise e minuta.
- Às 06:15 UTC foi registrado mais um caso de `defesa_previa`.
- O identificador `E2E-PREPROD-CERT-20261017B` não foi encontrado nas tabelas `e2e_test_runs` e `e2e_test_results`.
- Nenhum registro foi apagado ou alterado durante a consulta.

Os registros existentes e evidências locais devem ser preservados. A ausência de run ID no banco impede atribuir automaticamente cada registro à execução específica.

## Alterações nesta branch

- `tests/e2e-infrastructure.ts`: normaliza estados históricos para cinco e-mails únicos; prepara 70 cenários em memória; novas preparações fazem upsert de cinco perfis e não inserem 70 casos-semente.
- `tests/e2e-validator.ts`: remove dependência de `cases.infraction_json`; usa `ait_number` e `service_type`, com resolução do caso real criado pelo fluxo quando o ID do fixture é apenas de correlação.
- `tests/e2e-onboarding-executor.ts`: registra método, URL exata, `Retry-After` e corpo limitado da resposta quando ocorre HTTP 429. Isso preserva a evidência necessária para confirmar o limitador real sem desativar controles de produção.
- `scripts/e2e-server-manager.mjs`: verifica Vite em 3000 e Worker em 8787; reutiliza o par saudável; inicia o servidor apenas quando ambos estão ausentes; recusa substituir um estado parcial e não mata processos.
- `playwright.config.ts` e `package.json`: localhost só é permitido com opt-in explícito; adiciona `test:e2e:managed-local`.
- `scripts/audit-e2e-real.mjs`: remove a referência obsoleta à porta 3100 e usa 3000 por padrão, com override `E2E_BASE_URL`.
- `tests/e2e-setup.ts` e `tests/e2e/SHARED-USERS.md`: alinham logs e documentação ao modelo de identidades compartilhadas e cenários em memória.

## Validações e bloqueios restantes

- **Não executado nesta sessão:** lint, testes automatizados, smoke test de navegador contra a implantação publicada e as baterias de 70 cenários. A integração GitHub disponível não expôs um comando de disparo de workflow; os commits consultados não retornaram execuções de Actions associadas.
- **HTTP 429:** o harness agora preserva URL e resposta. A correção operacional final depende de observar a URL real que falha na próxima execução; não foi implementado bypass de rate limit nem desativada proteção de produção.
- **Servidor:** o gerenciador foi adicionado, mas sua execução local ainda precisa ser validada no ambiente que contém as dependências e segredos.
- **Dados:** nenhuma limpeza foi executada. Os 70 registros históricos não devem ser apagados em lote; qualquer ajuste futuro precisa ser identificado por ID e revisado individualmente.

## Critério para retomar a certificação

1. Atualizar o checkout local para esta branch e preservar `tests/e2e-results/` da execução anterior.
2. Verificar que o estado local da execução contém cinco identidades únicas.
3. Executar lint/testes de infraestrutura e o smoke test HTTPS sem iniciar preparação completa.
4. Inspecionar qualquer evento `HTTP_429` em evidência, confirmando URL, `Retry-After` e corpo antes de escolher a correção específica.
5. Prosseguir com baterias sequenciais apenas após o smoke test passar.
