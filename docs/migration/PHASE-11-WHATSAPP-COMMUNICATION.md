# Fase 11 — WhatsApp / Comunicação no Cloudflare

Data: 2026-09-15

## Objetivo

Migrar a superfície HTTP de WhatsApp/Comunicação do runtime legado para o Cloudflare Worker, mantendo a Evolution API como gateway externo e sem criar uma segunda fonte de verdade para conversas e mensagens.

## Implementado

- `/api/communication/whatsapp/send` → Evolution API.
- `/api/communication/whatsapp/send-media` → Evolution API.
- `/api/communication/whatsapp/send-document` → Evolution API.
- `/api/communication/whatsapp/status` → estado real da instância Evolution.
- `/api/communication/whatsapp/qrcode` → QR da instância, admin.
- `/api/communication/whatsapp/webhook-config` → leitura/configuração do webhook, admin para alteração.
- `GET/POST /api/webhooks/whatsapp` → endpoint canônico no Worker com validação opcional de `EVOLUTION_WEBHOOK_SECRET`.
- Credenciais Evolution são bindings/secrets do Cloudflare, nunca código-fonte.
- Não existe fallback para Vercel.

## Fonte de verdade

O Worker não persiste cópias de conversas ou mensagens nas tabelas `messaging_contacts`, `messaging_conversations` ou `messaging_messages`. Isso evita duplicação do histórico da Evolution/Chatwoot e mantém um único sistema de comunicação como fonte de verdade.

## Gate autoritativo

1. Envio de texto chega à Evolution com número normalizado.
2. Envio de documento PDF chega ao endpoint de mídia da Evolution.
3. Status consulta a instância configurada.
4. Webhook sem segredo válido é rejeitado quando o secret está configurado.
5. Webhook válido é aceito sem persistência duplicada no Supabase.
6. Ausência de credenciais falha fechado com HTTP 503.
7. `cloudflare/routes/communication.test.ts` é a suíte autoritativa.
8. GitHub Actions deve executar a suíte e o deploy Cloudflare antes de fechar o gate.

## Configuração externa

Secrets necessários no ambiente Cloudflare:

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE_NAME` (opcional; default `defesai`)
- `EVOLUTION_WEBHOOK_SECRET` (recomendado)

A integração com Chatwoot/n8n permanece externa ao Worker. O Worker não duplica o histórico dessas ferramentas.

## Regra de testes

Testes legados de Express/Vercel que representem arquitetura removida não devem ser corrigidos apenas para ficar verdes. Se obsoletos, devem ser removidos; se o comportamento continuar importante, deve existir teste novo para o runtime Cloudflare.

## Próximo passo

Após o gate da Fase 11, seguir para Fase 12 — automações, scraping e auxiliares. Nenhuma família Vercel deve ser removida antes de seus consumidores terem cobertura no Cloudflare.
