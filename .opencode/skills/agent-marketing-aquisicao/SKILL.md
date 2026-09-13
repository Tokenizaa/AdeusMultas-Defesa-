# Agent: @marketing-aquisicao

## Use this skill when
- Orquestrar 7 agentes autônomos de marketing (estratégico, planejamento, criador, qualidade, publicação, inteligência, aprendizado)
- Gerar conteúdo: carrosséis Instagram, artigos SEO, roteiros Reels, infográficos, newsletters
- Gerenciar Meta Ads (Facebook/Instagram Graph API, Conversions API)
- Automação de leads: capture, nurturing, scoring
- Prospecção via scraping (Firecrawl)
- Email marketing (Resend)
- Geração de imagens ComfyUI para campanhas
- API: /api/marketing/*, /api/marketing/automation/*, /api/scrape/*

## Do not use when
- Precisar modificar onboarding, Rule Engine, geração de documentos
- Trabalhar em pagamentos, WhatsApp (exceto envio), OCR, conhecimento RAG, base legal
- Modificar shared kernel

## Papel

Growth & aquisição. 7 agentes autônomos operam em ciclo semanal. Integração pesada com Meta (Ads, WhatsApp Business, Conversions API), ComfyUI para criativos, Firecrawl para prospecção, Resend para email. Depende de temas jurídicos do @defesa-transito para conteúdo relevante.

## Diretórios Próprios

- src/server/routes/marketing.ts
- src/server/routes/marketing-automation.ts
- src/server/services/marketing-service.ts
- src/server/services/marketing-automation/**
- src/server/services/ai-media-service.ts
- src/server/services/scraper-job-queue.ts
- src/server/services/scrape-worker.ts
- src/server/integrations/meta/**
- src/server/integrations/comfyui/**
- src/scraper-prospecting/**
- src/data/marketing-agents-data.ts

## Pode Importar de

- @compartilhado (types, auth-middleware)
- @defesa-transito (temas jurídicos, infraction codes para targeting)
- @comunicacao-whatsapp (envio WhatsApp para nutrição)

## NUNCA Importa de

- @pagamentos-comercial
- @ocr-evidencias
- @conhecimento-juridico
- @base-legal
- @comunicacao-whatsapp (rotas/serviços internos)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build
- agent-marketing skill
- firecrawl-deep-research
- comfyui-api

## Skills Obrigatórias

- agent-marketing
- evolution-api
- comfyui-api
- firecrawl-deep-research
- backend-patterns

## Contratos Públicos (Expõe)

- GET /api/marketing/agents — Status dos 7 agentes
- POST /api/marketing/content — Criar conteúdo
- POST /api/marketing/automation/leads — Capturar lead
- GET /api/marketing/meta/status — Status integração Meta
- POST /api/scrape/jobs — Agendar scraping

## Critérios de Sucesso

- 7 agentes autônomos operacionais (ciclo semanal completo)
- Meta Ads ROAS > 3.0
- Lead-to-case conversion > 15%
- ComfyUI gera 50+ imagens/semana para campanhas
- Scraping: 100+ prospects/semana qualificados
- Email open rate > 25%, click rate > 3%

## Anti-Padrões

- ❌ Hardcoded Meta tokens — usar variáveis de ambiente + rotação
- ❌ Gerar conteúdo sem base em teses reais do @defesa-transito
- ❌ Scraping sem rate limiting / respeito a robots.txt
- ❌ Acoplar lógica de pagamento ou geração de documentos
- ⚠️ **CANDIDATO A SPLIT** — Isolamento baixo. Considerar:
  - @marketing-conteudo (agentes criadores, SEO, carrosséis, Reels)
  - @aquisicao-ads (Meta Ads, prospecção, scraping, ROAS)
  - @automacao-whatsapp (jornadas, nutrição, templates HSM)

## Split Recommendation

Se implementar split:
- @marketing-conteudo → src/server/services/marketing-service.ts (parcial), src/data/marketing-agents-data.ts (parcial)
- @aquisicao-ads → src/server/routes/marketing.ts (ads), src/server/services/scraper-*, src/server/integrations/meta/**
- @automacao-whatsapp → src/server/routes/marketing-automation.ts, src/server/services/marketing-automation/**