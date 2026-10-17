# Deploy — Adeus Multas no Cloudflare

## Estado atual (produção)

- **Worker de produção:** `cloudflare-worker` (wrangler `name`: `adeusmulta`)
- **Entrada do worker:** `cloudflare/worker.ts`
- **URL:** https://adeusmulta.defesai.com.br
- **Build:** `bun run build` (gera `dist/`)
- **Config de deploy:** `wrangler.jsonc` (source of truth)
- **Gateway de pagamento:** VenoPag (`VENO_PRIMARY_GATEWAY=venopag`, `PAYMENT_MODE=production`, `PAGBANK_ENV=production`)
- **Banco:** Supabase conectado

## Configuração (`wrangler.jsonc`)

```jsonc
{
  "name": "adeusmulta",
  "main": "cloudflare/worker.ts",
  "workers_dev": false,
  "compatibility_date": "2026-09-13",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "vars": {
    "API_ORIGIN_PRIMARY": "https://adeusmulta.defesai.com.br",
    "SUPABASE_URL": "https://llmxnpgjpxcvyrqjkfwb.supabase.co",
    "PAGBANK_ENV": "production",
    "PAYMENT_MODE": "production",
    "VENO_PRIMARY_GATEWAY": "venopag"
  },
  "build": { "command": "bun run build" },
  "ai": { "binding": "AI" },
  "vectorize": [{ "binding": "VECTORIZE", "index_name": "adeusmulta-knowledge" }],
  "ratelimits": [{ "name": "ANONYMOUS_CASE_LIMITER", "namespace_id": "2026101301", "simple": { "limit": 10, "period": 60 } }],
  "triggers": { "crons": ["*/5 * * * *"] }
}
```

> `wrangler.jsonc` **não declara `routes` nem `zone_name`**; as rotas da zona são gerenciadas separadamente no Cloudflare. Não confundir com `wrangler.json` (desatualizado, veja abaixo).

## Deploy (procedimento)

O deploy é condicional e só ocorre em **push para `main`** quando a mensagem do commit contém `[DEPLOY-PRODUCTION]` (workflow `.github/workflows/cloudflare-deploy.yml`). Outros pushes/PRs apenas rodam testes.

```bash
# 1. Build (gera dist/)
bun run build

# 2. Deploy (apenas main com marcador [DEPLOY-PRODUCTION])
wrangler deploy --config wrangler.jsonc
```

> Os segredos (`SUPABASE_SERVICE_ROLE_KEY`, chaves PagBank/Gemini/NVIDIA etc.) são configurados no worker via painel Cloudflare / `wrangler secret put`. Não commitar segredos no repositório.

## Verificação pós-deploy

```bash
# SPA
curl -s https://adeusmulta.defesai.com.br/ | grep -o "<title>[^<]*</title>"

# Health (deve retornar gateway venopag, environment production, database connected)
curl -s https://adeusmulta.defesai.com.br/api/health

# Service Worker
curl -s -o /dev/null -w "%{http_code}\n" https://adeusmulta.defesai.com.br/sw.js
```

## Arquivos relacionados

- `wrangler.jsonc` — source of truth do deploy (produção).
- `wrangler.json` — desatualizado (declara `routes`/`zone_name` antigas, sem `vars`/`build`/bindings do VenoPag). Não usado no deploy atual.
- `.wranglerignore` — não deve ignorar `dist/` (é o diretório de assets do worker).
- `scripts/dev-cloudflare.mjs` — script de desenvolvimento local do worker Cloudflare.
