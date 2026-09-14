# Migração 100% Cloudflare — Remoção do legado Vercel

**Status:** FASE 0 CONCLUÍDA — execução da Fase 1 autorizada  
**Objetivo:** eliminar completamente a dependência operacional do Vercel e do backend legado `api/index.mjs`, deixando o Cloudflare Worker como único runtime de API e aplicação.

> Evidência da Fase 0: [`docs/migration/PHASE-0-BASELINE-2026-09-14.md`](../migration/PHASE-0-BASELINE-2026-09-14.md)

## 1. Objetivo final

A arquitetura final deve ser:

```text
Browser
  │
  ▼
Cloudflare
  ├── Static Assets / SPA
  ├── Worker / Hono
  │    ├── Auth
  │    ├── Onboarding
  │    ├── Cases
  │    ├── OCR
  │    ├── Knowledge / RAG
  │    ├── AI
  │    ├── Commercial
  │    ├── Payments / Webhooks
  │    ├── Documents
  │    ├── Notifications
  │    ├── Audit
  │    ├── Admin
  │    ├── Marketing
  │    ├── Meta
  │    ├── WhatsApp
  │    ├── Automation / Cron
  │    └── Auxiliary APIs
  │
  └── Supabase
       ├── Auth
       ├── PostgreSQL
       ├── Storage
       └── demais serviços persistentes
```

Não haverá proxy Worker → Vercel, fallback para Vercel, Express runtime ou `api/index.mjs`.

## 2. Regras da migração

1. Não copiar o monólito Express para Hono de forma mecânica.
2. Migrar somente comportamento que possui consumidor real ou requisito explícito.
3. Preservar contratos públicos enquanto o consumidor estiver sendo migrado.
4. Centralizar regras de domínio em módulos canônicos.
5. Eliminar duplicações entre Worker, frontend e backend legado.
6. Cada fase termina com teste de paridade e evidência verificável.
7. Não remover o legado antes de provar que nenhuma rota, cron, webhook ou integração depende dele.
8. O Golden Path deve funcionar com Vercel completamente indisponível.
9. Nenhuma nova feature deve ser implementada no `api/index.mjs` durante a migração.

## 3. Estado inicial conhecido

O Worker já possui implementações nativas para Auth, Onboarding, Cases, Payments, Notifications, Audit, Settings, Admin e Marketing, mas algumas dessas famílias ainda possuem fallback/proxy para Vercel.

Ainda existem famílias Vercel-only ou parcialmente migradas, incluindo OCR, AI, Knowledge/RAG, Commercial/Offers, Documents/Documenso, Meta, WhatsApp, automações, scraping, analytics/monitoring/logs e outros módulos auxiliares.

O `api/index.mjs` continua sendo o backend legado monolítico e deverá ser removido somente na etapa final.

## 4. Roadmap executivo

### Fase 0 — Baseline e congelamento — CONCLUÍDA
- Registrar commit/base de referência.
- Inventariar rotas, consumidores, cron jobs, webhooks e integrações.
- Congelar novas alterações no backend Vercel.
- Definir matriz rota → consumidor → destino final → status.

**Saída:** inventário autoritativo e critérios de aceite.  
**Evidência:** `docs/migration/PHASE-0-BASELINE-2026-09-14.md`.

### Fase 1 — Contratos e kernel compartilhado
- Criar contratos de request/response.
- Consolidar autenticação, erros, validação, logging e contexto de request.
- Consolidar mappers e regras de domínio.

**Saída:** base comum para todas as migrações.

### Fase 2 — OCR
- Migrar análise OCR para Worker/serviço compatível.
- Preservar upload, extração, normalização e retorno estruturado.
- Testar documentos reais e casos de erro.

**Saída:** nenhum consumidor funcional de OCR depende do Vercel.

### Fase 3 — Knowledge / RAG
- Migrar consulta da base jurídica.
- Migrar recuperação, filtros e regras especialistas.
- Garantir determinismo e rastreabilidade da fonte.

**Saída:** pipeline jurídico executável sem Vercel.

### Fase 4 — AI
- Migrar análise de infração.
- Migrar geração de defesa.
- Migrar chat/consultoria de trânsito.
- Centralizar provider/configuração de IA.

**Saída:** Golden Path de análise e geração sem Vercel.

### Fase 5 — Commercial / preços / ofertas
- Migrar resolução de preço.
- Migrar ofertas e regras comerciais.
- Garantir uma única fonte de verdade para preços.

**Saída:** checkout não depende de endpoint legado.

### Fase 6 — Payments / webhooks
- Consolidar PIX e cartão.
- Migrar webhook PagBank para Worker.
- Garantir idempotência e atualização persistente do case.

**Saída:** pagamento real confirmado sem Vercel.

### Fase 7 — Documents / Storage
- Migrar geração e montagem de documentos.
- Migrar Documenso ou substituir pela implementação definitiva.
- Consolidar Storage e reconciliação.

**Saída:** documento final gerado e persistido sem Vercel.

### Fase 8 — Notifications e Audit persistentes
- Remover estruturas em memória.
- Persistir notificações e auditoria no backend definitivo.
- Garantir consistência entre request e eventos.

**Saída:** observabilidade funcional após restart/escala.

### Fase 9 — Admin
- Migrar todas as rotas administrativas ainda Vercel-only.
- Remover fallback parcial.
- Testar permissões por papel.

**Saída:** Admin 100% Cloudflare.

### Fase 10 — Marketing / Meta
- Consolidar CRUD editorial.
- Migrar publicação Meta e polling de containers.
- Migrar upload de mídia e persistência.
- Migrar cron de publicação.

**Saída:** operação de marketing sem backend legado.

### Fase 11 — WhatsApp / comunicação
- Migrar endpoints de comunicação necessários.
- Integrar Evolution/Chatwoot conforme contratos existentes.
- Garantir que o Worker não duplique estado desnecessariamente.

**Saída:** comunicação operacional sem Vercel.

### Fase 12 — Automação / scraping / auxiliares
- Migrar somente endpoints com consumidor real.
- Revisar scraping, transit database, sync/offline, governance, agents e integrações auxiliares.
- Eliminar módulos sem consumidor.

**Saída:** toda rota restante classificada como migrada ou removida.

### Fase 13 — Analytics / monitoring / logs
- Consolidar observabilidade no runtime definitivo.
- Migrar métricas e health checks necessários.
- Remover dependências de logs internos do Vercel.

**Saída:** operação observável sem Vercel.

### Fase 14 — Frontend exclusivamente Cloudflare
- Auditar todas as chamadas `/api`.
- Remover URLs, aliases e configurações apontando para Vercel.
- Garantir que o frontend usa somente o domínio Cloudflare.

**Saída:** zero chamadas frontend → Vercel.

### Fase 15 — Eliminação do proxy
- Remover `proxyToVercel`.
- Remover `API_ORIGIN_FALLBACK`.
- Remover qualquer fallback administrativo/marketing.
- Fazer busca negativa por referências a Vercel.

**Saída:** Worker sem rota para Vercel.

### Fase 16 — Remoção do backend legado
- Remover `api/index.mjs`.
- Remover runtime Express e dependências exclusivas.
- Remover workflows/configurações de deploy Vercel.
- Limpar secrets e variáveis obsoletas.

**Saída:** repositório sem backend Vercel.

### Fase 17 — Validação final e desligamento
- Executar testes de paridade.
- Executar Golden Path completo.
- Executar teste com Vercel indisponível.
- Validar cron e webhooks diretamente no Cloudflare.
- Fazer auditoria final de rotas e dependências.

**Saída:** migração 100% concluída.

## 5. Definition of Done

A migração só pode ser marcada como concluída quando todos os itens abaixo forem verdadeiros:

- [ ] 100% das rotas classificadas.
- [ ] 100% das rotas necessárias migradas ou explicitamente removidas.
- [ ] 0 chamadas frontend → Vercel.
- [ ] 0 proxy/fallback Worker → Vercel.
- [ ] 0 `API_ORIGIN_FALLBACK`.
- [ ] 0 `proxyToVercel`.
- [ ] 0 `api/index.mjs`.
- [ ] 0 Express runtime legado.
- [ ] 0 cron crítico executando no Vercel.
- [ ] 0 webhook crítico dependendo do Vercel.
- [ ] OCR, RAG, AI, Commercial, Payments, Documents e Storage funcionando sem Vercel.
- [ ] Notifications e Audit persistentes.
- [ ] Admin, Marketing, Meta e WhatsApp funcionais sem Vercel.
- [ ] Golden Path completo aprovado com Vercel indisponível.
- [ ] Busca negativa no repositório sem referências operacionais ao Vercel.
- [ ] Deploy Cloudflare reproduzível a partir de `main`.

## 6. Critério de segurança contra regressão

Nenhuma fase deve apagar uma implementação anterior simplesmente porque uma rota nova foi criada. A remoção ocorre apenas depois de:

1. identificar todos os consumidores;
2. provar a paridade funcional;
3. executar os testes correspondentes;
4. verificar produção;
5. registrar commit da migração;
6. confirmar que não existe consumidor residual.

## 7. Estratégia de execução

A execução deve ser sequencial e incremental. Cada fase gera commits pequenos e verificáveis. Não serão criadas versões paralelas do mesmo domínio nem uma segunda implementação do onboarding para suportar a migração.

O marco operacional mais importante é a **Fase 4 — AI**, porque ela desbloqueia o fluxo real de análise → geração de defesa. O marco de encerramento é o **Golden Path com Vercel desligado**.
