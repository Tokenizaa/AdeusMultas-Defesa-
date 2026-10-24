# Terceiros e Atribuições Obrigatórias — DefesAi

Este documento consolida as dependências de software, serviços de terceiros,
APIs externas, modelos de IA e ativos incorporados na plataforma DefesAi,
junto com as respectivas licenças, termos de uso e obrigações de atribuição.

---

## 1. Dependências de Software (npm / package.json)

Todas as dependências diretas abaixo utilizam licenças permissivas (MIT,
Apache-2.0 ou ISC), compatíveis com uso comercial e incorporação.

| Dependência | Versão | Licença | Obrigação de Atribuição |
|-------------|--------|---------|-------------------------|
| @google/genai | ^2.4.0 | Apache-2.0 | Manter aviso de licença |
| @supabase/supabase-js | ^2.112.4 | MIT | Manter aviso de licença |
| @tailwindcss/vite | ^4.1.14 | MIT | Manter aviso de licença |
| @tanstack/react-query | ^5.102.2 | MIT | Manter aviso de licença |
| @vitejs/plugin-react | ^5.0.4 | MIT | Manter aviso de licença |
| autoprefixer | ^10.4.21 | MIT | Manter aviso de licença |
| bullmq | ^6.3.4 | MIT | Manter aviso de licença |
| cors | ^2.8.6 | MIT | Manter aviso de licença |
| dotenv | ^17.2.3 | MIT | Manter aviso de licença |
| esbuild | ^0.25.0 | MIT | Manter aviso de licença |
| express | ^4.21.2 | MIT | Manter aviso de licença |
| express-rate-limit | ^8.6.2 | MIT | Manter aviso de licença |
| firebase | ^12.17.1 | Apache-2.0 | Manter aviso de licença |
| firebase-admin | ^14.2.0 | Apache-2.0 | Manter aviso de licença |
| helmet | ^8.3.0 | MIT | Manter aviso de licença |
| hono | ^4.13.7 | MIT | Manter aviso de licença |
| ioredis | ^6.0.0 | MIT | Manter aviso de licença |
| lucide-react | ^0.546.0 | ISC | Manter aviso de licença |
| motion | ^12.23.24 | MIT | Manter aviso de licença |
| pdf-parse | ^1.1.1 | MIT | Manter aviso de licença |
| qrcode | ^1.5.4 | MIT | Manter aviso de licença |
| react | ^19.0.1 | MIT | Manter aviso de licença |
| react-dom | ^19.0.0 | MIT | Manter aviso de licença |
| resend | ^6.20.0 | MIT | Manter aviso de licença |
| selenium-webdriver | ^4.48.0 | Apache-2.0 | Manter aviso de licença |
| sharp | ^0.35.4 | Apache-2.0 | Manter aviso de licença |
| tailwindcss | ^4.1.14 | MIT | Manter aviso de licença |
| tsx | ^4.21.0 | MIT | Manter aviso de licença |
| typescript | ~5.8.2 | Apache-2.0 | Manter aviso de licença |
| vite | ^6.2.3 | MIT | Manter aviso de licença |
| vitest | ^4.1.11 | MIT | Manter aviso de licença |
| xlsx | ^0.18.5 | Apache-2.0 | Manter aviso de licença |

**Nota:** O arquivo `package-lock.json` registra a árvore completa de
dependências transitivas. Todas as licenças individuais estão disponíveis em
`node_modules/<pacote>/package.json`.

---

## 2. Serviços e APIs de Terceiros

O uso desses serviços está sujeito aos respectivos termos de uso, políticas de
privacidade e contratos de cada provedor. A DefesAi não é parte nesses
contratos e recomenda que o usuário os revise antes da utilização em produção.

| Serviço | Finalidade | Termos / Documentação | Atribuição Obrigatória |
|---------|------------|----------------------|------------------------|
| **Google GenAI (Gemini)** | Enriquecimento de texto jurídico, geração de imagens (gemini-3-pro-image-preview), animação de vídeo (veo-3.1-fast-generate-preview) | https://ai.google.dev/terms | Sim — exibir que o conteúdo foi gerado por IA quando aplicável |
| **Supabase** | Banco de dados PostgreSQL, Auth, Realtime, Storage | https://supabase.com/terms | Não obrigatória |
| **Firebase** | Auth adicional, Cloud Messaging | https://firebase.google.com/terms | Não obrigatória |
| **Cloudflare** | Hosting (Workers/Pages), KV, D1, R2, Vectorize | https://www.cloudflare.com/terms/ | Não obrigatória |
| **VenoPag** | Gateway de pagamento PIX | https://venopagments.com (termos do provedor) | Não obrigatória |
| **PagBank** | Gateway de pagamento alternativo | https://pagbank.com.br | Não obrigatória |
| **Meta (Facebook/Instagram)** | Marketing OS, Graph API, Business Manager, Planner | https://www.facebook.com/terms/ | Sim — identificar conteúdo publicado via Meta |
| **Google Maps** | Prospecção B2B (scraper de leads) | https://www.google.com/maps/terms | Sim — exibir "Map data © Google" quando exibir mapas |
| **Resend** | Envio de e-mails transacionais | https://resend.com/terms | Não obrigatória |
| **Evolution API** | Integração WhatsApp | https://evolution-api.com | Não obrigatória |

---

## 3. Textos Normativos (Domínio Público — Brasil)

Os seguintes textos são atos normativos oficiais de domínio público nos termos
do Artigo 8º da Lei nº 9.610/98 (Lei de Direitos Autorais). São reproduzidos
meramente para consulta e fundamentação de defesas, com indicação de fonte
oficial.

| Fonte | URL oficial | Natureza |
|-------|-------------|----------|
| Código de Trânsito Brasileiro (Lei 9.503/1997) | https://www.planalto.gov.br/ccivil_03/leis/L9503.htm | Lei Federal |
| Resoluções CONTRAN | https://www.gov.br/contran/pt-br/assuntos/resolucoes | Resolução Normativa |
| Jurisprudência STJ | https://www.stj.jus.br/ | Precedente Judicial |
| Diário Oficial da União | https://www.in.gov.br/leiturajornal | Diário Oficial |
| SENATRAN | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran | Órgão Executivo |
| INMETRO (PSInmetro) | https://cronotacografo.rbmlq.gov.br/certificados/consultar | Certificação Metrológica |
| DETRANs / CETRANs (27 UFs) | Diversos portais estaduais | Órgãos Executivos Estaduais |

**O uso de nomes de órgãos governamentais (CONTRAN, DETRAN, STJ, SENATRAN,
INMETRO, PRF, DNIT, ANTT) é meramente referencial e não implica afiliação,
endosso ou autorização desses órgãos.**

---

## 4. Modelos de IA e Datasets

| Recurso | Provedor | Tipo | Restrição de Redistribuição |
|---------|----------|------|----------------------------|
| Gemini 3.7 Flash (texto) | Google GenAI | Modelo de linguagem | Sujeito aos termos do Google |
| Gemini 3 Pro Image Preview | Google GenAI | Geração de imagem | Sujeito aos termos do Google |
| Veo 3.1 Fast Generate Preview | Google GenAI | Geração de vídeo | Sujeito aos termos do Google |
| Base de conhecimento CTB/CONTRAN/STJ | DefesAi (próprio) | Dataset jurídico organizado | Propriedade da DefesAi |
| Infraction Catalog (códigos de infração) | DefesAi (próprio) | Catálogo derivado do CTB | Propriedade da DefesAi |

O conteúdo gerado por modelos de IA é fornecido "como está", sem garantia de
precisão jurídica. O usuário deve revisar qualquer conteúdo gerado antes de
protocolá-lo perante órgãos públicos.

---

## 5. Ativos de Mídia (Próprios — DefesAi)

Todos os ativos a seguir são criações originais da DefesAi, sem dependência de
terceiros:

| Ativo | Caminho | Tipo | Titularidade |
|-------|---------|------|--------------|
| Logo principal | public/logo.svg | SVG vetorial | DefesAi |
| Logo light/dark/icon | public/logo-*.svg | SVG vetorial | DefesAi |
| Favicon | public/favicon.svg | SVG vetorial | DefesAi |
| Ícones PWA | public/icons/icon-*.svg | SVG vetorial | DefesAi |
| Open Graph image | public/og-image.svg | SVG vetorial | DefesAi |
| Página offline | public/offline.html | HTML/CSS | DefesAi |
| Service Worker | public/sw.js | JavaScript | DefesAi |
| Firebase messaging SW | public/firebase-messaging-sw.js | JavaScript | DefesAi |

**Fontes:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
Helvetica Neue, Arial, sans-serif (fontes do sistema operacional — sem licença
de incorporação requerida).

**Emojis:** ⚖️ (Unicode — sem licença específica requerida).

---

## 6. Problemas Identificados e Corrigidas (Auditoria de PI)

| # | Problema | Severidade | Status | Correção |
|---|----------|------------|--------|----------|
| 1 | Badge "CONTRAN" em og-image.svg sugerindo afiliação oficial com órgão governamental | ALTA | Corrigido | Substituído por "CTB 9.503/97" (referência à lei, não ao órgão) |
| 2 | Confusão de identidade entre marcas "DefesAi" e "Adeus Multas" | MÉDIA | Documentado | Padronização em processo; domínio defesai.shop é a marca canônica |
| 3 | Ausência de páginas de Termos de Uso e Política de Privacidade (referenciadas no auth mas inexistentes) | MÉDIA | Corrigido | Criados /termos-de-uso e /politica-de-privacidade com links no footer e cookie banner |
| 4 | Ausência de arquivo LICENSE na raiz do repositório | BAIXA | Corrigido | Criado LICENSE (MIT) |
| 5 | Ausência de documentação de atribuições de terceiros | MÉDIA | Corrigido | Criado THIRD-PARTY-NOTICES.md |
| 6 | Vídeo de fallback do Google Commons (commondatastorage.googleapis.com) sem atribuição | BAIXA | Documentado | Vídeo de exemplo do Google, uso livre; atribuição recomendada |
| 7 | Modelos de IA mencionados com nomes possivelmente não-oficiais (gemini-3.7-flash, veo-3.1) | MÉDIA | Documentado | Verificar nomes reais dos modelos na documentação do Google |

---

## 7. Ativos com Dúvida Material de Titularidade

Nenhum ativo identificado com dúvida material de titularidade. Todos os ativos
de mídia são criações originais da DefesAi. Os textos normativos são de
domínio público. As dependências de software têm licenças permissivas
claramente declaradas.

---

## 8. Declaração Importante

"Não conclua que conteúdo da internet pode ser copiado livremente." Todo
conteúdo de terceiros (imagens, textos, vídeos, código) incorporado ou
referenciado nesta plataforma deve ser verificado quanto à sua licença e
restrições de redistribuição antes de qualquer uso além do escopo original.
