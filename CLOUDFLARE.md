# Deploy — Adeus Multa no Cloudflare

## Estado atual (agosto/2026)

- **Worker de produção:** `tokenizaa-defesa-f-cil`
- **URL:** https://tokenizaa-defesa-f-cil.olfnetto.workers.dev
- **Domínio customizado:** https://multa.emprestamais.shop
- **Build:** Vite + esbuild gerado em `dist/` via `npm run build`

## Rotas no domínio `emprestamais.shop`

| Pattern                                            | Worker                   |
| -------------------------------------------------- | ------------------------ |
| `multa.emprestamais.shop/*`                        | `tokenizaa-defesa-f-cil` |
| `multa.emprestamais.shop/api/webhooks/pagbank`     | `tokenizaa-defesa-f-cil` |
| `www.multa.emprestamais.shop/api/webhooks/pagbank` | `tokenizaa-defesa-f-cil` |

## Deploy (procedimento)

```bash
# 1. Build (gera dist/client e dist/server.cjs)
npm run build

# 2. Deploy
wrangler deploy

# 3. Verificar rotas da zona (o token do .env não tem permissão de rotas; usar OAuth)
#    Listar:  GET  /zones/{ZONE}/workers/routes
#    Criar:   POST /zones/{ZONE}/workers/routes {"pattern": "multa.emprestamais.shop/*", "script": "tokenizaa-defesa-f-cil"}
```

> **Atenção:** o `CLOUDFLARE_API_TOKEN` do `.env` tem permissão de workers
> (`workers_scripts:write`) mas **não** de rotas da zona. Se o deploy precisar
> atualizar rotas, usar o OAuth do wrangler (`wrangler whoami`) ou o dashboard.

## Secrets / env

Não commitar segredos no repositório. Configurados no worker `tokenizaa-defesa-f-cil`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAGBANK_EMAIL`
- `PAGBANK_ENVIRONMENT`
- `PAGBANK_TOKEN`
- `PAGBANK_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `NVIDIA_API_KEY`
- `NINEROUTER_KEY`
- `NINEROUTER_UPSTREAM`

Use `wrangler secret put <NOME> --name tokenizaa-defesa-f-cil` ou o painel do Cloudflare.

## Verificação pós-deploy

```bash
# Marca correta (Adeus Multa) e HTTP 200
curl -s https://multa.emprestamais.shop/ | grep -o "<title>[^<]*</title>"
# Webhook PagBank ativo (401 sem assinatura válida = HMAC ativo)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://multa.emprestamais.shop/api/webhooks/pagbank
```
