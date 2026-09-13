# Agent: @trabalhadores-assincronos

## Use this skill when
- Operar infraestrutura de filas BullMQ/Redis
- Workers: scraping, OCR, messaging, marketing automation
- Agendamento de jobs recorrentes
- Retry policy e dead letter handling
- Queue monitoring e autoscaling

## Do not use when
- Precisar modificar rotas HTTP, lógica de negócio, onboarding
- Trabalhar em pagamentos, marketing, WhatsApp, OCR, conhecimento RAG
- Modificar shared kernel

## Papel

Infraestrutura de background jobs. Isolado no grafo de dependências (sem dependentes internos). Consome serviços de outros domínios via filas assíncronas — padrão correto. Não expõe API HTTP.

## Diretórios Próprios

- src/server/workers/**
- src/server/services/scraper-job-queue.ts
- src/server/services/scrape-worker.ts
- src/core/events/topics.ts

## Pode Importar de

- @compartilhado (types, events/topics)
- @marketing-aquisicao (scraping jobs — via queue)
- @ocr-evidencias (OCR jobs — via queue)
- @comunicacao-whatsapp (messaging jobs — via queue)

## NUNCA Importa de

- @defesa-transito
- @pagamentos-comercial
- @conhecimento-juridico
- @base-legal
- Qualquer rota HTTP (server/routes/**)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build

## Skills Obrigatórias

- backend-patterns
- cloudflare (se usar Workers/Queues)

## Contratos Públicos (Expõe)

- Internal: BullMQ queues (scraping, ocr, messaging, marketing)
- Events: core/events/topics.ts

## Critérios de Sucesso

- Queue processing latency < 5s (p95)
- Retry policy: 3x exponencial, DLQ após falha final
- Zero jobs perdidos (persistência Redis)
- Worker autoscaling baseado em queue depth
- Observabilidade: queue depth, processing time, failure rate por queue

## Anti-Padrões

- ❌ Processar lógica de negócio no worker — chamar serviços via API/fila
- ❌ Hardcoded Redis connection — usar variáveis de ambiente
- ❌ Ignorar DLQ — alertar e investigar falhas finais
- ❌ Bloquear event loop — usar async/await corretamente
- ❌ Acoplar com rotas HTTP — workers são consumers, não servers