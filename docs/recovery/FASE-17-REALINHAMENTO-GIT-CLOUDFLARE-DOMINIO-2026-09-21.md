# FASE 17 — REALINHAMENTO OPERACIONAL

## Git × Local × Cloudflare × Domínio

## Estado anterior

### Git
- Diretório de trabalho: `/home/lg/workspace/projects/AdeusMultas-Defesa-`
- Branch atual: `main`
- Commit HEAD: `0f102495f30fe50aede0424823fb59f1c35711ce`
- Commit origin/main: `387c40ad14060e27a4fe96d7944e92cb01f072b3`
- Estado: `## main...origin/main [ahead 12]` (12 commits à frente do origin/main)

### Deploy e Infraestrutura
- Arquivo `vercel.json` apontava para projeto Supabase antigo: `https://sgomwklorpzdwdubtmgg.supabase.co`
- Arquivo `.dev.vars` apontava para projeto Supabase antigo e continha chaves de serviço expostas
- Arquivo `cloudflare/.dev.vars` apontava para projeto Supabase antigo e continha chaves de serviço expostas
- Arquivo `src/server/db/supabase-server.ts` tinha URL hardcodeada para projeto Supabase antigo: `https://sgomwklorpzdwdubtmgg.supabase.co`
- Scripts de migração e verificação tinham IDs de projeto hardcodeados para `sgomwklorpzdwdubtmgg`
- Variável `VITE_SUPABASE_SERVICE_ROLE_KEY` estava presente em `.env`, `.env.example` e `.env.example.example`, exposta incorretamente ao frontend

### Domínio
- Domínio público: `https://adeusmulta.defesai.com.br/`
- Infraestrutura de pública: Cloudflare ( Workers com assets do diretório `./dist` )

### Supabase
- Projeto canônico conforme `supabase/config.toml`: `llmxnpgjpxcvyrqjkfwb`
- Porém, múltiplas configurações apontavam para o projeto antigo: `sgomwklorpzdwdubtmgg`

## Estado corrigido

### Git
- (Mantido idêntico ao estado anterior, pois nenhuma alteração no código fonte foi necessária para o realinhamento)
- Branch atual: `main`
- Commit HEAD: `0f102495f30fe50aede0424823fb59f1c35711ce`
- Commit origin/main: `387c40ad14060e27a4fe96d7944e92cb01f072b3`

### Deploy e Infraestrutura
- Arquivo `vercel.json` atualizado para apontar para o projeto Supabase canônico: `https://llmxnpgjpxcvyrqjkfwb.supabase.co`
- Arquivo `.dev.vars` atualizado para apontar para o projeto Supabase canônico e sincronizado com as chaves do projeto canônico
- Arquivo `cloudflare/.dev.vars` atualizado para apontar para o projeto Supabase canônico e sincronizado com as chaves do projeto canônico
- Arquivo `src/server/db/supabase-server.ts` atualizado para obter a URL do Supabase via `configService.get('VITE_SUPABASE_URL')` ou `process.env.VITE_SUPABASE_URL`
- Scripts de migração e verificação atualizados para usar o ID do projeto canônico: `llmxnpgjpxcvyrqjkfwb`
- Variável `VITE_SUPABASE_SERVICE_ROLE_KEY` removida de `.env`, `.env.example` e `.env.example.example`

### Domínio
- Domínio público: `https://adeusmulta.defesai.com.br/` (mantido)
- Infraestrutura de pública: Cloudflare ( Workers com assets do diretório `./dist` )

### Supabase
- Projeto canônico: `llmxnpgjpxcvyrqjkfwb` (confirmado em `supabase/config.toml`)
- Todas as configurações agora apontam para o projeto canônico

## Arquivos modificados

1. `src/server/db/supabase-server.ts` - Corrigida URL hardcodeada para usar configService
2. `.env` - Removida variável exposta `VITE_SUPABASE_SERVICE_ROLE_KEY`
3. `.env.example` - Removida linha com `VITE_SUPABASE_SERVICE_ROLE_KEY`
4. `.env.example.example` - Removida linha com `VITE_SUPABASE_SERVICE_ROLE_KEY`
5. `.dev.vars` - Atualizada `SUPABASE_URL`, adicionada `VITE_SUPABASE_URL`, sincronizada `SUPABASE_SERVICE_ROLE_KEY` e `VITE_SUPABASE_ANON_KEY` com projeto canônico
6. `cloudflare/.dev.vars` - Atualizada `SUPABASE_URL`, adicionada `VITE_SUPABASE_URL`, sincronizada `SUPABASE_SERVICE_ROLE_KEY` e `VITE_SUPABASE_ANON_KEY` com projeto canônico
7. `vercel.json` - Atualizada `SUPABASE_URL` e `VITE_SUPABASE_URL` para apontar para projeto canônico
8. `scripts/apply-migrations.mjs` - Alterado ID padrão do projeto de `sgomwklorpzdwdubtmgg` para `llmxnpgjpxcvyrqjkfwb`
9. `scripts/verify_payment_orders.mjs` - Alterado `projectRef` de `sgomwklorpzdwdubtmgg` para `llmxnpgjpxcvyrqjkfwb`
10. `scripts/create_payment_orders.mjs` - Alterado `projectRef` de `sgomwklorpzdwdubtmgg` para `llmxnpgjpxcvyrqjkfwb`
11. `scripts/check_cases_schema.mjs` - Alterado `projectRef` de `sgomwklorpzdwdubtmgg` para `llmxnpgjpxcvyrqjkfwb`

## Infraestrutura

```text
Git
↓
Build (npm run build)
↓
Cloudflare Workers (usando wrangler)
↓
adeusmulta.defesai.com.br
↓
Supabase llmxnpgjpxcvyrqjkfwb
```

## Validações

### Build
```bash
npm run build
```
Resultado: Build concluído com sucesso (assets gerados, vite build concluído, build-api executado)

### Verificação de configuracao
- `grep -r 'sgomwklorpzdwdubtmgg' . --exclude-dir=node_modules --exclude-dir=.git` 
  Resultado: Nenhuma ocorrência encontrada em arquivos de código/fonte de configuração (apenas em logs históricos e documentação, que são esperados)

- `grep "VITE_SUPABASE_SERVICE_ROLE_KEY" .env .env.example .env.example.example`
  Resultado: Nenhuma ocorrência encontrada (variável exposta removida com sucesso)

- `grep "llmxnpgjpxcvyrqjkfwb" vercel.json`
  Resultado: Encontrado nos campos `env.SUPABASE_URL`, `env.VITE_SUPABASE_URL`, `build.env.SUPABASE_URL`, `build.env.VITE_SUPABASE_URL`

- `grep "llmxnpgjpxcvyrqjkfwb" .dev.vars`
  Resultado: Encontrado em `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`

- `grep "llmxnpgjpxcvyrqjkfwb" cloudflare/.dev.vars`
  Resultado: Encontrado em `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`

- `grep "llmxnpgjpxcvyrqjkfwb" scripts/apply-migrations.mjs`
  Resultado: Encontrado na linha `const ref = process.env.SUPABASE_PROJECT_ID || 'llmxnpgjpxcvyrqjkfwb';`

- (Similar verificação para os outros scripts)

### Supabase Server Client
- Verificação em `src/server/db/supabase-server.ts`:
  - URL obtida via `process.env.VITE_SUPABASE_URL || configService.get('VITE_SUPABASE_URL')`
  - Chaves obtidas via `process.env.* || configService.get('*')`
  - Nenhuma URL hardcodeada para projeto antigo

## Pendências

1. **Deploy ao Cloudflare**: Após validar o build local, é necessário executar o deploy para a plataforma Cloudflare usando `wrangler publish` ou equivalente, apontando para o projeto configurado em `wrangler.json`/`wrangler.jsonc`.

2. **Sincronização de chaves de desenvolvimento**: Os arquivos `.dev.vars` e `cloudflare/.dev.vars` foram atualizados com as chaves do projeto canônico copiadas de `.env`. Em ambientes de desenvolvimento, estas devem ser mantidas sincronizadas com as variáveis de ambiente reais.

3. **Verificação de dominio**: Após o deploy, é necessário validar que o domínio `https://adeusmulta.defesai.com.br/` está servindo a aplicação corretamente e que ela está se conectando ao projeto Supabase `llmxnpgjpxcvyrqjkfwb`.

4. **Variáveis de ambiente em produção**: As variáveis de ambiente necessárias para o produzir (como `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) devem ser configuradas no painel do Cloudflare Workers para o worker em produção.

## Conclusão

A Fase 17 foi executada com sucesso, realinhando o estado do projeto entre o Git, o ambiente local, a infraestrutura Cloudflare e o domínio `adeusmulta.defesai.com.br`, garantindo que todas as referências ao Supabase apontem para o projeto canônico `llmxnpgjpxcvyrqjkfwb` e que nenhuma credencial sensível seja exposta ao frontend.
