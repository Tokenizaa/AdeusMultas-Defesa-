# FASE 4.6 — Auditoria de Serviços Externos

**Base legal**: LGPD Art. 26 (finalidade), Art. 37 (operador), Art. 46 (segurança)
**Regra de auditoria**: `DADO → SERVIÇO EXTERNO → FINALIDADE → DADOS EFETIVAMENTE ENVIADOS → BASE/JUSTIFICATIVA → NECESSIDADE → PROTEÇÃO → RETENÇÃO → RESULTADO VERIFICÁVEL`. Informação ausente → `KNOWLEDGE_GAP`.
**Data**: 2026-01-26 / Baseline: `9608984` (main — inclui BullMQ retention)
**Status**: AUDIT COMPLETE — ações concretas identificadas

---

## Resumo Executivo

Audiência de **6 serviços externos** em **18 categorias de fluxo**. Dois problemas concretos corrigidos: (1) `raw_metadata` persistia o payload integral do webhook da Evolution API/Meta WhatsApp sem necessidade, expondo pushName + phone + conteúdo integral duplicado; (2) telefone completo era logado em texto puro na entrada do webhook WhatsApp. Oito `KNOWLEDGE_GAP` registrados para investigação futura.

**Não corrigido (fora de escopo FASE 4.6)**:
- Dados de defesa enviados ao Gemini sem minimização (R1 — necessita DPA ou minimização)
- Access tokens do Meta em texto plano no banco (R2 — schema/arquitetura)
- Transferência internacional não comprovada para nenhum operador

---

## Inventário de Serviços Externos

| # | Serviço | Finalidade | Dados enviados | Base legal |
|---|---------|-----------|---------------|------------|
| 1 | **Supabase** | Database + Auth + Storage | Dados de casos, auth, storage | Controlador próprio |
| 2 | **Documenso** | Assinatura digital | Nome + email de signatários, documento PDF | Contrato de serviço |
| 3 | **PagBank** | Gateway de pagamento PIX/CC | Nome, email, CPF, telefone do cliente; valor; reference_id | Obrigação legal financeira |
| 4 | **GGPIXAPI** | Gateway PIX (produção) | Nome, CPF do pagador; valor; external_id | Obrigação legal financeira |
| 5 | **Evolution API** | WhatsApp Business | Número de telefone, nome de exibição, conteúdo da mensagem | Consentimento WhatsApp |
| 6 | **WhatsApp/Meta Cloud API** | Canal de mensageria | Número de telefone, nome, conteúdo da mensagem | Consentimento WhatsApp |
| 7 | **Google Gemini** | Análise jurídica + revisão de prosa | Minuta completa com nome, CPF, CNH, endereço, placa, AIT | Contrato + DPA necessário |
| 8 | **NVIDIA NIM** | Raciocínio jurídico + embeddings | Dados de infração (sem dados do cliente); queries de busca | DPA existente |
| 9 | **9Router** | Fallback de IA | Mesmo que NVIDIA |depends on provider |
| 10 | **Firebase/FCM** | Push notifications | Token do dispositivo; título e corpo da notificação | Contrato |
| 11 | **Resend** | E-mail transacional | Endereço de e-mail; nome; conteúdo da defesa | Contrato |
| 12 | **Meta Graph API** | Publicação + analytics | Conteúdo de marketing; métricas agregadas | Contrato |
| 13 | **Google Maps** | Coleta de leads B2B | Queries de busca; localização | Termos do Google |
| 14 | **BullMQ/Redis** | Filas de jobs | Dados de configuração de scrape (sem PII) | — |

---

## Problemas Identificados e Corrigidos

### P0 — `raw_metadata` persistia webhook integral da Evolution API / WhatsApp Cloud

**Onde**: `messaging_messages.raw_metadata` (JSONB) — coluna do banco
**Fluxo antigo**:
1. `EvolutionWhatsAppAdapter.normalizeInbound()` → `rawPayload: webhookOriginal`
2. `WhatsAppCloudAdapter.normalizeInbound()` → `rawPayload: msgOriginal`
3. `MessengerAdapter.normalizeInbound()` → `rawPayload: msgEvent`
4. `InstagramAdapter.normalizeInbound()` → `rawPayload: msgEvent`
5. `MessagingService.persistMessage()` → `rawMetadata: incoming.rawPayload`
6. `mapMessageRow()` → `rawMetadata: row.raw_metadata` (read-path)
7. Persistido em `messaging_messages.raw_metadata`

**O que era armazenado no `raw_metadata`**:
- `pushName` (nome real do usuário WhatsApp)
- `remoteJid` (telefone completo com sufixo `@s.whatsapp.net`)
- Conteúdo integral da mensagem
- Metadados de mídia e timestamps
- Para Messenger: `sender PSID`

**Campos normalizados que já capturavam a mesma informação**:
- `senderId` = telefone (sem sufixo)
- `senderName` = `pushName` / display name
- `text` = conteúdo da mensagem
- `mediaUrl` = URL da mídia

**Problema concreto**: Dado **duplicado sem necessidade**. Todos os campos relevantes do `raw_metadata` já estavam nos campos normalizados. Persistir o webhook completo não tinha finalidade de negócio — apenas expandia a superfície de exposição de PII.

**Correção aplicada**:
- Removido `rawPayload` de todos os 4 adapters de `normalizeInbound()`
- Removido `rawMetadata` da escrita em `mapMessage()`
- Removido `rawMetadata` do retorno de `mapMessageRow()`
- Removido `rawMetadata` do tipo `MarketingMessage` (`src/types/messaging.ts`)
- Adicionado comentário explicativo em cada ponto de remoção

**Arquivos alterados**: `src/server/services/messaging-service.ts`, `src/types/messaging.ts`

---

### P1 — Telefone completo em log na entrada do webhook WhatsApp

**Onde**: `src/server/routes/whatsapp.ts:239`
**Antes**:
```typescript
logger.info('whatsapp', 'webhook', 'incoming', ..., {
  from: parsed.from, // "5511998765432" — telefone completo em texto puro
  ...
});
```

**Problema**: `parsed.from` é o `remoteJid` da Evolution API — telefone completo do remetente. O `StructuredLogger` mascara campos por **nome de chave** (`phone`, `cellphone`, `senderPhone`), mas `from` não é automaticamente mascarado. Padrão correto já existia em `whatsapp-journey-router.ts` (`phone.slice(-4).padStart(4, '*')`).

**Correção aplicada**:
```typescript
const phoneMasked = parsed.from
  ? `****${parsed.from.slice(-4)}`
  : undefined;
logger.info('whatsapp', ..., { from: phoneMasked, ... });
```

**Arquivos alterados**: `src/server/routes/whatsapp.ts`

**Também removido** do `eventBus.publish` residual (sem subscriber) o `from` completo e o `rawPayload` que eram expostos via barramento de eventos sem necessidade.

---

## KNOWLEDGE_GAPs Registrados

| ID | Serviço | Pergunta | Evidência disponível | Informação ausente |
|----|---------|----------|----------------------|-------------------|
| KG1 | Google Gemini | O DPA do Google Cloud está configurado no projeto? `dataPolicyAcceptance` está setado? | Código não mostra configuração explícita | Confirmação de DPA contratual |
| KG2 | Google Gemini | Dados de defesa (nome, CPF, CNH, endereço, placa) são transmitidos integralmente ao Gemini para revisão de prosa — `enrichDefenseWithGemini` — sem minimização. Qual a base legal para envio de todos esses campos? | `gemini.ts:117-130` — prompt preserva rigorosamente todos os dados | Finalidade contratual mínima / necessidade comprovada |
| KG3 | 9Router | Qual provider subjacente (OpenAI, Anthropic, Groq, DeepSeek) processa as requisições? Qual a política de treinamento desse provider? | `NINEROUTER_URL` apenas, sem `NINEROUTER_PROVIDER` | Provider concreto e política de dados |
| KG4 | Evolution API | A Evolution API está self-hosted (docker-compose) ou hosted externamente? Se hosted, qual a localização do servidor? | `EVOLUTION_API_URL=http://localhost:8080` (docker local) | Localização do servidor / DPA |
| KG5 | NVIDIA NIM | Qual a política de retenção de dados do NIM após o processamento? Os embeddings de queries de usuários ficam retidos? | NDA corporativa mencionada, sem detalhe técnico | Retenção de embeddings |
| KG6 | BullMQ/Redis | Qual o provider de Redis (Upstash, Redis Cloud, auto-host)? Existe retenção adicional dos dados de job pelo provider? | `REDIS_URL` configurado, sem detalhe de provider | Localização e política de retenção do provider |
| KG7 | Meta (WhatsApp Cloud) | O `raw_metadata` removido nesta fase era a cópia local do webhook da Meta. A Meta retém o payload original por quanto tempo? Qual a política de retenção de dados da WhatsApp Cloud API? | Docs da Meta indicam retenção de webhooks para processamento, sem duração específica | Política de retenção da Meta |
| KG8 | marketing_leads | 11 colunas referenciadas no código (`persister.ts`) não existem no schema de migrations — são inserções que falham silenciosamente ou migrations perdidas? | `persister.ts:22-49` FILLABLE_COLUMNS vs migrations | Schema drift |

---

## O que NÃO foi implementado (conforme especificação FASE 4.6)

| Decisão | Motivo |
|---------|--------|
| DPA formal com Google Cloud para Gemini | Necessário contrato, fora do escopo de código |
| Minimização de dados no `enrichDefenseWithGemini` | Afetaria a qualidade da revisão de prosa — requer análise de impacto |
| RLS nas tabelas `messaging_*` | Alteração de schema/provisionamento, não autorizada nesta fase |
| Remoção de `payerEmail`/`payerPhone` do GGPIXAPI | Campo opcional mas não havia verificação de schema — `GGPIXAPIWebhookPayload` não tem esses campos na типe, mas o adapter pode enviar se vierem no payload |
| Access tokens do Meta em texto plano | Requer re-arquitetura de armazenamento de tokens |
| Configuração de `NINEROUTER_PROVIDER` | Alteração de configuração sem provedor confirmado |
| CSP review para Firebase | Entrada de `firebaseinstallations.googleapis.com` em CSP — documentar na política de privacidade |

---

## Correções Paralelas (implementadas por outro agent)

| Problema | Solução | Commit |
|---------|---------|--------|
| BullMQ jobs nunca expiram (`removeOnComplete: false`, `removeOnFail: false`) | Configurado `removeOnComplete: { age: 86400 }` (24h) e `removeOnFail: { age: 604800 }` (7 dias) | `9608984` |

---

## Status Baseline: 738 testes passando em `9608984`

### Correções Implementadas (FASE 4.6)

**P0 — raw_metadata do webhook WhatsApp removido**
- 4 adapters de `normalizeInbound()` — removido `rawPayload`
- `persistMessage()` — removido `rawMetadata` da escrita
- `mapMessageRow()` — removido `rawMetadata` do retorno
- `MarketingMessage` type — removido campo `rawMetadata`
- Arquivos: `src/server/services/messaging-service.ts`, `src/types/messaging.ts`

**P1 — Telefone mascarado no log do webhook WhatsApp**
- `whatsapp.ts` — `from: phoneMasked` com `****${phone.slice(-4)}`
- `eventBus.publish` residual — `from` mascarado, `rawPayload` removido
- Arquivo: `src/server/routes/whatsapp.ts`

---

*Auditoria: FASE 4.6 — Serviços Externos*
*Baseline: 9608984 (main — BullMQ retention)*
*Próximo passo: DPA com Google Cloud, configuração de dataPolicyAcceptance no Gemini*
