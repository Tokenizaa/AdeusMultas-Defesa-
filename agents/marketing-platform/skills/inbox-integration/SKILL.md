---
name: inbox-integration
description: Contrato da caixa de entrada unificada (Interações) — tipos, API simulada e guia de integração com as APIs oficiais das redes sociais.
---

# Inbox Integration (Interações)

Skill do agente `marketing-platform` — contrato do módulo de Interações e
guia de conexão com APIs oficiais.

## Contrato (em `src/features/marketing/api/inbox.ts`)

```ts
interface InboxApi {
  listThreads(): Promise<InboxThread[]>;
  listMessages(threadId: string): Promise<InboxMessage[]>;
  getContact(contactId: string): Promise<InboxContact | null>;
  sendReply(threadId: string, text: string): Promise<InboxMessage>;
  getAISuggestions(thread: InboxThread): Promise<AIResponseSuggestion[]>;
}
```

Tipos: `InboxNetwork` (instagram/facebook/tiktok/linkedin/youtube),
`InboxMessageKind` (comment/message/mention), `InboxStatus` (new/open/closed),
`InboxSentiment` (positive/neutral/negative), `InboxThread`, `InboxMessage`,
`InboxContact`, `AIResponseSuggestion`.

A implementação atual (`inboxApi`) é **simulada** (dados locais em memória),
tipada pelo mesmo contrato que as APIs oficiais devem cumprir.

## Para conectar dados reais

1. **Instagram**: Graph API — `GET /{ig-user-id}/conversations` (mensagens),
   `GET /{media-id}/comments` (comentários), `GET /mentions` (menções).
   Paginação com `after` cursors; webhooks em `messages` e `comments`.
2. **Facebook**: Graph API — Messenger (`/me/conversations`, webhook
   `messages`), comentários de páginas (`/{page-id}/comments`).
3. **TikTok / LinkedIn / YouTube**: respectivas APIs oficiais, mesmo padrão
   (webhooks de eventos + polling de listas).
4. Manter os mesmos tipos de saída do contrato. `sendReply` deve registrar o
   envio na rede E retornar `InboxMessage` com `from: "brand"`.
5. `getAISuggestions` pode delegar para o provedor de geração
   (`src/features/marketing/providers/generation-provider.ts`) com prompt de
   atendimento + Brand Context.

## UI

- Rota: `/marketing/inbox` (lista de conversas à esquerda + painel de
  atendimento à direita).
- Painel: mensagens, sugestões IA (tom + confiança), composer de resposta,
  dados do usuário (histórico de interações).
- Filtros: Todas / Novas / Em aberto / Encerradas + busca.
- Badges: sentimento, oportunidade, rede, "Nova".

## Não fazer

- Não persistir mensagens de terceiros fora das redes (LGPD) — o histórico
  vive na rede; o app agrega em memória com cache curto.
- Não simular envio de resposta como se fosse real — quando o contrato real
  ainda não estiver conectado, a UI deve indicar "simulado".

## Produção (inbox com IA)

O inbox em produção usa IA para classificar/responder:
- **Classificação de mensagens**: `9router-chat`
- **Respostas sugeridas**: `9router-chat` (combo)
- **Busca semântica**: `9router-embeddings` (NVIDIA)

Substituir a API simulada mantendo o contrato (`inboxApi`).
