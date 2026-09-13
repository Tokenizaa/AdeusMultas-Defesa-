# Agent: @comunicacao-whatsapp

## Use this skill when
- Configurar/gerenciar instâncias Evolution API (Baileys)
- Enviar mensagens WhatsApp: texto, mídia, documentos, listas, botões interativos
- Processar webhooks de mensagens recebidas
- Implementar roteador de jornadas conversacionais (whatsapp-journey-router)
- Gerenciar templates HSM aprovados pelo Meta
- API: /api/whatsapp/*, /api/webhooks/whatsapp

## Do not use when
- Precisar modificar onboarding, Rule Engine, geração de documentos
- Trabalhar em pagamentos, marketing (exceto integração), OCR, conhecimento RAG
- Modificar shared kernel

## Papel

Integração WhatsApp via Evolution API. Gerencia instâncias, envio/recebimento, webhooks, jornadas conversacionais para notificações de casos, automação de leads (via @marketing-aquisicao), templates HSM.

## Diretórios Próprios

- src/server/routes/whatsapp.ts
- src/server/routes/whatsapp-webhook.integration.test.ts
- src/server/services/whatsapp-service.ts
- src/server/services/whatsapp-journey-router.ts
- src/server/services/messaging-service.ts
- src/server/integrations/evolution-api/**

## Pode Importar de

- @compartilhado (types, auth-middleware)
- @defesa-transito (contexto casoId para mensagens)
- @marketing-aquisicao (automação de leads)

## NUNCA Importa de

- @pagamentos-comercial
- @ocr-evidencias
- @conhecimento-juridico
- @base-legal
- @marketing-aquisicao (rotas/serviços internos)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build
- evolution-api skill

## Skills Obrigatórias

- evolution-api
- backend-patterns
- api-and-interface-design

## Contratos Públicos (Expõe)

- POST /api/whatsapp/send — Enviar mensagem
- POST /api/whatsapp/send-document — Enviar documento
- POST /api/whatsapp/send-media — Enviar mídia
- POST /api/webhooks/whatsapp — Webhook Evolution API
- GET /api/whatsapp/instances — Gerenciar instâncias

## Critérios de Sucesso

- Instância WhatsApp conectada e estável (>99.5% uptime)
- Webhook processa mensagens em < 2s
- Jornadas conversacionais cobrem 100% dos 5 tipos de serviço
- Templates HSM aprovados pelo Meta para todos os gatilhos
- Idempotência em webhooks (dedup message_id)

## Anti-Padrões

- ❌ Hardcoded tokens Evolution API — usar variáveis de ambiente
- ❌ Processar lógica de negócio no webhook — apenas rotear
- ❌ Enviar mensagens sem template HSM aprovado (risco banimento)
- ❌ Acoplar com Rule Engine ou geração de documentos