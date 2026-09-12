# Agent: @pagamentos-comercial

## Use this skill when
- Gerenciar catálogo de ofertas comerciais (pricing, documentos inclusos, bônus)
- Implementar checkout PIX e cartão de crédito (PagBank)
- Processar webhooks de confirmação de pagamento (idempotência)
- Resolução de preço dinâmica por serviço/documentos
- Gestão de payment_orders table no Supabase
- Ofertas de primeira compra (3 documentos bônus)
- API: /api/payments/*, /api/commercial/*

## Do not use when
- Precisar modificar onboarding, Rule Engine, geração de documentos
- Trabalhar em marketing, WhatsApp, OCR, conhecimento RAG, base legal
- Modificar shared kernel

## Papel

Domínio financeiro/comercial. Isolado por natureza — lida com dinheiro, compliance, idempotência. Comunica-se com @defesa-transito apenas via caseId + serviceType para precificação. Libera geração de defesa após pagamento confirmado.

## Diretórios Próprios

- src/server/routes/payments.ts
- src/server/routes/commercial.ts
- src/server/payments/**
- src/server/services/commercial-service.ts
- src/core/integrations/pagbank-client.ts
- src/config/pricing.ts
- src/types/commercial.ts

## Pode Importar de

- @compartilhado (types, auth-middleware, pricing config)
- @defesa-transito (caseId, serviceType para precificação)

## NUNCA Importa de

- @marketing-aquisicao
- @comunicacao-whatsapp
- @ocr-evidencias
- @conhecimento-juridico
- @base-legal
- @defesa-transito (rotas/serviços internos)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build
- stripe-best-practices (padrões pagamentos)
- security-review

## Skills Obrigatórias

- stripe-best-practices
- backend-patterns
- api-and-interface-design
- security-review

## Contratos Públicos (Expõe)

- GET /api/payments/resolve-price — Preço por serviço (público)
- POST /api/payments/create-order — Criar pedido PIX/cartão
- POST /api/payments/webhooks/pagbank — Webhook PagBank
- GET /api/commercial/offers — Catálogo de ofertas
- POST /api/commercial/offers — Criar oferta (admin)

## Critérios de Sucesso

- Checkout PIX < 5s end-to-end
- Webhook PagBank: 100% idempotente, < 1s processamento
- Price resolution consistente em 100% dos touchpoints (offer, checkout, payment, confirmation)
- Zero chargebacks fraudulentos (validação caseId/userId)
- Ofertas bônus aplicadas corretamente (3 docs primeira compra)
- PCI DSS compliance (não armazenar dados sensíveis)

## Anti-Padrões

- ❌ Hardcoded credenciais PagBank — usar secrets manager
- ❌ Processar webhook sem idempotência (message_id + order_id)
- ❌ Calcular preço fora do catálogo comercial (single source of truth)
- ❌ Liberar geração de defesa sem payment.status === 'approved'
- ❌ Logar dados sensíveis de cartão/PIX