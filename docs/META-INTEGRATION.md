# Integração Meta (Facebook + Instagram + Messenger) — DefesAi

**Última atualização:** 2026-08-26  
**Status:** ✅ App criado, produtos ativados, OAuth configurado, token de longa duração obtido

---

## 1. Credenciais do App

| Campo | Valor |
|-------|-------|
| **App Name** | DefesAi Social |
| **App ID** | `1567264377574412` |
| **App Secret** | `d6fc963c34ff6f92e622276ef8daf45c` |
| **App Type** | Empresa (Business) |
| **App Mode** | Desenvolvimento (Dev Mode) |
| **Instagram App ID** | `1670834910681966` |

### Credenciais Antigas (NÃO USAR)
| Campo | Valor | Motivo |
|-------|-------|--------|
| App ID | `2059175964959320` | Categoria Lifestyle não suporta Pages/Instagram |
| App Secret | `848e88eccb2ca00838500835ed845f3f` | App antigo |

---

## 2. Permissões Concedidas (55 total)

### ✅ Permissões Essenciais (usadas pelo código)

| Permissão | Uso no Código | Necessária |
|-----------|---------------|------------|
| `pages_show_list` | Listar páginas do usuário | ✅ Obrigatória |
| `pages_read_engagement` | Ler métricas de engajamento | ✅ Obrigatória |
| `pages_manage_posts` | Criar/editar publicações na página | ✅ Obrigatória |
| `instagram_basic` | Acesso básico ao Instagram | ✅ Obrigatória |
| `instagram_content_publish` | Publicar conteúdo no Instagram | ✅ Obrigatória |
| `instagram_manage_insights` | Métricas do Instagram | ✅ Obrigatória |

### 📋 Permissões Adicionais (marcadas para uso futuro)

| Permissão | Categoria | Uso Potencial |
|-----------|-----------|---------------|
| `pages_manage_engagement` | Events/Pages | Gerenciar comentários/reações |
| `pages_manage_metadata` | Events/Pages | Atualizar informações da página |
| `pages_manage_cta` | Events/Pages | Gerenciar botões de ação |
| `pages_read_user_content` | Events/Pages | Ler conteúdo de usuários |
| `pages_messaging` | Events/Pages | Enviar mensagens via Messenger |
| `pages_manage_ads` | Events/Pages | Gerenciar anúncios (se necessário) |
| `instagram_manage_comments` | Other | Moderar comentários |
| `instagram_manage_contents` | Other | Gerenciar conteúdo |
| `instagram_manage_engagement` | Other | Gerenciar interações |
| `instagram_manage_messages` | Other | Mensagens diretas |
| `publish_video` | Other | Publicar vídeos |
| `read_insights` | Other | Ler insights/métricas |
| `email` | User Data | Acessar email do usuário |
| `business_management` | Events/Pages | Gerenciar configurações de negócios |
| `catalog_management` | Other | Gerenciar catálogos |
| `leads_retrieval` | Other | Recuperar leads |
| `threads_business_basic` | Other | Threads (se necessário) |

### 🔒 Permissões de Commerce (não necessárias agora)

| Permissão | Uso |
|-----------|-----|
| `commerce_account_manage_orders` | Gerenciar pedidos |
| `commerce_account_read_orders` | Ler pedidos |
| `commerce_account_read_reports` | Relatórios |
| `commerce_account_read_settings` | Configurações |
| `instagram_shopping_tag_products` | Tags de produto |

### 📱 Permissões de WhatsApp (futuro)

| Permissão | Uso |
|-----------|-----|
| `whatsapp_business_management` | Gerenciar WhatsApp Business |
| `whatsapp_business_messaging` | Enviar mensagens WhatsApp |
| `whatsapp_business_manage_events` | Eventos WhatsApp |

---

## 3. Páginas e Contas

| Recurso | ID | Nome |
|---------|-----|------|
| **Facebook Page** | `1199235773284220` | DefesAi-AdeusMultas |
| **Instagram Account** | `netto_farias_oficial` | @netto_farias_oficial |
| **User ID (Meta)** | `28485163207767888` | Netto Farias |
| **Business ID** | `1485600991827306` | (antigo, pode não estar mais ativo) |

---

## 4. Variáveis de Ambiente (.env)

```bash
# =============================================================================
# FACEBOOK / META OAUTH
# =============================================================================
META_APP_ID="1567264377574412"
META_APP_SECRET="d6fc963c34ff6f92e622276ef8daf45c"
META_REDIRECT_URI="https://www.defesai.shop/api/integrations/meta/callback"
META_API_VERSION=v26.0
META_ACCESS_TOKEN="EAAWRayxZBlAwBSX5jsBgZ..."  # Long-lived Page token (~60 dias)
META_WEBHOOK_VERIFY_TOKEN="EAAdQz0Pr4lgBSe7Wk..."

# Legacy Facebook variables (mantidos para compatibilidade)
FACEBOOK_APP_ID="1567264377574412"
FACEBOOK_APP_SECRET="d6fc963c34ff6f92e622276ef8daf45c"
FACEBOOK_REDIRECT_URI="${META_REDIRECT_URI}"
FACEBOOK_PAGE_ID="1199235773284220"
INSTAGRAM_PROFILE_ID="netto_farias_oficial"
```

### Variáveis que o Código Espera

| Variável | Código Fonte | Observação |
|----------|-------------|------------|
| `META_ACCESS_TOKEN` | `meta-adapter.ts` | ✅ Configurada |
| `META_PAGE_ID` | `meta-adapter.ts` | ⚠️ Usando fallback `109847291847192` |
| `INSTAGRAM_ACCOUNT_ID` | `meta-adapter.ts` | ⚠️ Usando fallback `17841400928374829` |
| `META_APP_ID` | `meta-auth-service.ts` | ✅ Configurada |
| `META_APP_SECRET` | `meta-auth-service.ts` | ✅ Configurada |
| `META_API_VERSION` | `meta-graph-client.ts` | ✅ Configurada |

**⚠️ Ação Necessária:** Adicionar `META_PAGE_ID` e `INSTAGRAM_ACCOUNT_ID` ao `.env`

---

## 4. Webhooks (ESSENCIAL para Messenger e Instagram Direct)

**Os webhooks são OBRIGATÓRIOS** para receber mensagens em tempo real via Messenger e Instagram Direct.

### Endpoint do Webhook
```
GET/POST /api/meta/webhook
```

### Verificação (hub.challenge)
- **Verify Token:** `EAAdQz0Pr4lgBSe7WkkNP2Y2n89jBXzjvZBaK1wKwWfUTiNnZCe37pq4T9uujBlb4iQEhdJhNHu8bM03c9SlaIwHcosVuL1dlxdVnlN6e7BWagUrTZBoFLouDdOOXRHodAxeteN90Os4Uamw3Nqs1nFmwJ5qHKNN53JOZBb799LVdE4UGcjsHTEw8ivjKsCt1` (META_WEBHOOK_VERIFY_TOKEN)

### Campos Inscritos (Page + Instagram)
| Campo | Uso |
|-------|-----|
| `messages` | Mensagens recebidas (Messenger + Instagram Direct) |
| `messaging_postbacks` | Cliques em botões (quick replies, postbacks) |
| `message_reads` | Confirmação de leitura |
| `message_deliveries` | Confirmação de entrega |
| `messaging_optins` | Opt-in via mensagem |
| `message_mention` | Menções em stories (Instagram) |
| `mention` | Menções genéricas |

### Inscrição Confirmada
```json
{
  "id": "1567264377574412",
  "subscribed_fields": [
    "messages",
    "messaging_postbacks",
    "message_reads",
    "message_deliveries",
    "messaging_optins",
    "message_mention",
    "mention"
  ]
}
```

### Fluxo Webhook
```
Meta envia POST para https://www.defesai.shop/api/meta/webhook
    ↓
Valida assinatura X-Hub-Signature-256 (HMAC SHA-256)
    ↓
Verifica idempotência (eventId único)
    ↓
Processa eventos de messaging
    ↓
Envia para messagingService.handleMetaMessagingWebhook()
    ↓
Responde 200 OK
```

### Teste de Webhook
Para testar se o webhook está funcionando, você precisa:
1. Servidor rodando em `https://www.defesai.shop` (ou usar ngrok/tunnel para local)
2. Enviar uma mensagem para a página do Facebook ou Instagram Direct
3. Verificar logs do backend

### Importante
- O webhook **NÃO funciona em localhost** — precisa de URL pública HTTPS
- Em produção, usar `https://www.defesai.shop/api/meta/webhook`
- Em desenvolvimento local, usar ngrok: `https://<ngrok-id>.ngrok.io/api/meta/webhook`

---

## 5. Produtos Instalados no App

| Produto | Status | URL/Configuração |
|---------|--------|----------------|
| **Login do Facebook para Empresas** | ✅ Ativo | `/business-login/settings/` |
| **Instagram Business** | ✅ Ativo | `/instagram-business/` |
| **Messenger** | ✅ Ativo | `/messenger/` |
| **API de Marketing** | ✅ Ativo | `/marketing-api/` |
| **App Events** | ✅ Ativo | `/analytics/quickstart/` |
| **Webhooks** | ✅ Ativo | `/webhooks/` |
| **Jobs** | ✅ Adicionado | Requer configuração adicional |

### Configuração OAuth Facebook Login
- **URIs de redirecionamento válidos:**
  - `https://www.defesai.shop/api/integrations/meta/callback` (app)
  - `https://llmxnpgjpxcvyrqjkfwb.supabase.co/auth/v1/callback` (Supabase)
- **Domínios SDK JavaScript:** `https://www.defesai.shop/`
- **OAuth Web:** ✅ Ativo
- **HTTPS obrigatório:** ✅ Ativo
- **Modo estrito:** ✅ Ativo

---

## 5. Configuração Supabase (Auth Provider)

### Callback URL do Supabase
```
https://llmxnpgjpxcvyrqjkfwb.supabase.co/auth/v1/callback
```

### Configuração no Dashboard
1. Acesse: https://supabase.com/dashboard/project/llmxnpgjpxcvyrqjkfwb/auth/providers
2. Clique em **Facebook**
3. Configure:
   - **Client ID (App ID):** `1567264377574412`
   - **Client Secret:** `d6fc963c34ff6f92e622276ef8daf45c`
   - **Redirect URL:** `https://llmxnpgjpxcvyrqjkfwb.supabase.co/auth/v1/callback`
4. Clique em **Save**

### Configuração no Facebook App
1. Acesse: https://developers.facebook.com/apps/1567264377574412/fb-login/settings/
2. Em **Configurações da API com login do Facebook**:
   - Adicione a **Callback URL do Supabase** em "URLs de redirecionamento OAuth válidos"
3. Em **Configurações**:
   - Domínio do aplicativo: `www.defesai.shop`
   - Modo de login do OAuth: ✅ Habilitado
   - Forçar HTTPS: ✅ Habilitado
   - Uso do SDK JavaScript: ✅ Habilitado

---

## 6. Tokens

### Token Obtido

| Tipo | Duração | Expira em |
|------|---------|-----------|
| User Access Token (curto) | ~1 hora | Imediato |
| User Access Token (longo) | ~60 dias | ~25/10/2026 |
| Page Access Token (curto) | ~1 hora | Imediato |
| **Page Access Token (longo)** | **~60 dias** | **~25/10/2026** |

### Page Access Token (Long-lived)
```
EAAWRayxZBlAwBSX5jsBgZBNOLD5FZBPv7UAxd8FxoHFgwLj1b0taaAZANYbL2aqZBdEiCV3rsgCQsab88AtbAjZBsrWF1JQy9O9ZA16AUHJ9WiUWmMMpI8jqn766WVj1cC1VzHbrTsfXYfLMcuuQFQwhrcgg2C8G9ZBJXxN9Ep68CvfMeIkyFfBZAESUboPISwjihQ5fZB
```

### Como Renovar o Token

O token de longa duração expira em ~60 dias. Para renovar:

```bash
# 1. Obter novo User Access Token via Graph API Explorer
# https://developers.facebook.com/tools/explorer/1567264377574412/

# 2. Converter para long-lived User Token
curl -s "https://graph.facebook.com/v26.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=1567264377574412&\
client_secret=d6fc963c34ff6f92e622276ef8daf45c&\
fb_exchange_token=SEU_SHORT_USER_TOKEN"

# 3. Obter Page Access Token
curl -s "https://graph.facebook.com/v26.0/me/accounts?\
fields=name,id,access_token&\
access_token=SEU_LONG_USER_TOKEN"

# 4. Converter Page Token para long-lived
curl -s "https://graph.facebook.com/v26.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=1567264377574412&\
client_secret=d6fc963c34ff6f92e622276ef8daf45c&\
fb_exchange_token=SEU_PAGE_TOKEN"

# 5. Atualizar .env com o novo token
```

### Automação de Renovação (Recomendado)
Criar um cron job ou edge function que:
1. Verifica a data de expiração do token
2. Renova automaticamente 7 dias antes de expirar
3. Atualiza o `.env` ou variáveis de ambiente

---

## 7. Testes Realizados

| Teste | Data | Resultado |
|-------|------|-----------|
| GET /me | 2026-08-26 | ✅ OK |
| GET /me/accounts | 2026-08-26 | ✅ 15 páginas retornadas |
| GET /{page-id} | 2026-08-26 | ✅ DefesAi-AdeusMultas |
| POST /{page-id}/feed | 2026-08-26 | ✅ Post ID: 1199235773284220_122105768733444995 |
| DELETE /{post-id} | 2026-08-26 | ✅ Post de teste removido |

---

## 8. Checklist de Produção

- [x] Novo App Meta criado (Empresa, não Lifestyle)
- [x] Produtos instalados (Facebook Login, Instagram, Messenger, Marketing API, App Events, Webhooks, Jobs)
- [x] OAuth configurado (domínio + redirect URI + HTTPS + strict mode)
- [x] 55 permissões selecionadas
- [x] User Access Token gerado
- [x] Page Access Token obtido
- [x] Long-lived Page Token (60 dias)
- [x] Teste de publicação OK
- [x] `.env` atualizado
- [x] `META_PAGE_ID` e `INSTAGRAM_ACCOUNT_ID` adicionados ao `.env`
- [x] Callback URL do Supabase adicionada ao Facebook App
- [ ] **Supabase Dashboard:** Configurar Facebook Auth Provider (manual)
- [ ] **Produção:** Configurar verificação da empresa (Business Verification)
- [ ] **Produção:** Publicar app (sair do modo desenvolvimento)
- [ ] **Cron:** Implementar renovação automática de token

---

## 9. URLs Importantes

| Recurso | URL |
|---------|-----|
| Facebook Developers | https://developers.facebook.com/apps/1567264377574412/ |
| Graph API Explorer | https://developers.facebook.com/tools/explorer/1567264377574412/ |
| App Settings | https://developers.facebook.com/apps/1567264377574412/settings/basic/ |
| Facebook Login Settings | https://developers.facebook.com/apps/1567264377574412/business-login/settings/ |
| Marketing API | https://developers.facebook.com/apps/1567264377574412/marketing-api/ |
| App Events | https://developers.facebook.com/apps/1567264377574412/analytics/ |
| Webhooks | https://developers.facebook.com/apps/1567264377574412/webhooks/ |
| Jobs | https://developers.facebook.com/apps/1567264377574412/jobs/ |
| Supabase Dashboard | https://supabase.com/dashboard/project/llmxnpgjpxcvyrqjkfwb |
| Supabase Auth Providers | https://supabase.com/dashboard/project/llmxnpgjpxcvyrqjkfwb/auth/providers |
| Facebook Page | https://www.facebook.com/profile.php?id=61593349865857 |
| Instagram Profile | https://www.instagram.com/netto_farias_oficial/ |

---

## 10. Notas Técnicas

### Fluxo OAuth
```
Frontend → gera state + PKCE
    ↓
Facebook Auth Dialog (login + consent)
    ↓
Redirect para /api/integrations/meta/callback?code=...
    ↓
Backend troca code → short-lived token
    ↓
Backend troca short-lived → long-lived token (60 dias)
    ↓
Token salvo em META_ACCESS_TOKEN (env) ou banco
```

### Endpoints da Graph API Utilizados
- `GET /me` — Info do usuário
- `GET /me/accounts` — Listar páginas
- `GET /{page-id}` — Info da página
- `GET /{page-id}/feed` — Listar posts
- `POST /{page-id}/feed` — Criar post
- `POST /{ig-user-id}/media` — Criar mídia Instagram
- `POST /{ig-user-id}/media_publish` — Publicar no Instagram
- `GET /debug_token` — Verificar validade do token

### Erros Comuns
| Erro | Causa | Solução |
|------|-------|---------|
| `(#100) Tried accessing nonexisting field` | Token sem permissão | Adicionar permissão no App |
| `OAuthException: Invalid OAuth access token` | Token expirado | Renovar token |
| `(#200) Permissions error` | App em modo desenvolvimento | Adicionar usuário como tester |
| `(#190) Error validating access token` | Token revogado | Gerar novo token |
