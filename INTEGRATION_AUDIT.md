# INTEGRATION AUDIT
## Projeto: DefesAi / Adeus Multa

### 1. PagBank (Gateways de Pagamento)
- **Modos Suportados**: PIX Dinâmico (com QR Code Base64 e Chave Copia e Cola EMV), Cartão de Crédito com Tokenização e Boleto Bancário.
- **Ambientes**: Sandbox (`https://sandbox.api.pagseguro.com`) e Produção (`https://api.pagseguro.com`).
- **Segurança**: Assinatura HMAC de Webhook validada no backend; segredos nunca transitam para o navegador.

### 2. Meta Graph API (Facebook & Instagram)
- **Protocolo**: OAuth 2.0 com fluxo de autorização (`/oauth/access_token` e troca por Long-Lived Token de 60 dias).
- **Publicação**: Agente de Publicação cria contêineres de mídia (`/media`) e despacha publicações no feed e stories do Instagram Business.

### 3. Google Gemini 3.7 Flash
- **SDK**: `@google/genai` oficial integrado no backend (`server/gemini.ts` e `server/knowledge/rag-service.ts`).
- **Uso**: Análise de autos de infração (OCR), enriquecimento de fundamentação jurídica e geração de posts para o Marketing OS.

### 4. Evolution API / WhatsApp
- **Endpoint**: `/api/communication/whatsapp/send`.
- **Uso**: Notificação em tempo real de status da defesa (análise concluída, pagamento confirmado, protocolo protocolado).
