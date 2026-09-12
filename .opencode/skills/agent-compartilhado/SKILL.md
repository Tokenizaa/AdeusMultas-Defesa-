# Agent: @compartilhado (Shared Kernel)

## Use this skill when
- Definir ou modificar tipos TypeScript centrais (CaseDomain, ProcedureType, InfractionData, etc.)
- Configurar middleware de autenticação e rate limiting
- Manter CanonicalMapper (DB ↔ Domain single source of truth)
- Definir configurações transversais (CORS, pricing, events)
- Criar utilitários frontend compartilhados (Supabase client, hooks genéricos)
- Estabelecer contratos que TODOS os domínios consomem

## Do not use when
- Implementar lógica de negócio de qualquer domínio
- Trabalhar em onboarding, Rule Engine, RAG, pagamentos, marketing, WhatsApp, OCR
- Criar rotas de API específicas de domínio

## Papel

Shared kernel — infraestrutura transversal usada por todos os domínios. **Não executa tarefas de negócio**; define contratos imutáveis que outros agentes consomem. Mudanças aqui impactam todo o sistema e requerem governança rigorosa.

## Diretórios Próprios

- src/types/**
- src/lib/**
- src/server/config/**
- src/server/middleware/**
- src/server/shared/**
- src/core/mappers/**
- src/core/events/**

## Pode Importar de

- Nenhum (raiz da árvore de dependências)

## NUNCA Importa de

- QUALQUER domínio de negócio (@defesa-transito, @base-legal, @conhecimento-juridico, @comunicacao-whatsapp, @marketing-aquisicao, @pagamentos-comercial, @ocr-evidencias, @admin-observabilidade, @trabalhadores-assincronos)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash
- npx tsc --noEmit (obrigatório antes de commit)
- npm run build

## Skills Obrigatórias

- coding-standards
- api-and-interface-design
- security-best-practices

## Contratos Públicos (Expõe)

- src/types/index.ts — CaseDomain, ProcedureType, InfractionData, CaseStatus, JourneyStage, etc.
- src/types/commercial.ts — CommercialOffer, PaymentOrder
- src/core/mappers/canonical-mapper.ts — rowToDomain, domainToRow
- src/server/middleware/auth-middleware.ts — authenticateToken, requireAdmin
- src/server/middleware/rate-limit.ts — globalLimiter, strictLimiter
- src/server/config/cors.ts — corsMiddleware
- src/server/config/pricing.ts — PRICING config
- src/core/events/topics.ts — Event topics constants
- src/lib/supabase.ts — Supabase client

## Critérios de Sucesso

- Zero breaking changes sem versão major + migração documentada
- Tipos compartilhados 100% documentados (JSDoc)
- Middleware auth/rate-limit 100% testado (unit + integração)
- CanonicalMapper cobre 100% campos CaseDomain ↔ CaseRow
- Build passa em todos os domínios após mudança

## Governança

- **Owner**: @compartilhado
- **Mutable by**: apenas @compartilhado + aprovação @supervisor
- **Processo de mudança**:
  1. Abrir issue/ADR descrevendo mudança e impacto
  2. @supervisor aprova
  3. @compartilhado implementa com testes
  4. Rodar `npx tsc --noEmit` em TODO o projeto
  5. `npm run build` passa
  6. Deploy coordenado

## Anti-Padrões

- ❌ Adicionar lógica de negócio em types/index.ts
- ❌ Modificar canonical-mapper.ts sem cobrir 100% campos
- ❌ Criar tipos duplicados em domínios (single source of truth)
- ❌ Bypassar auth-middleware ou rate-limit
- ❌ Hardcoded valores em pricing.ts — usar config dinâmica
- ❌ Importar de domínios — shared kernel é folha, não raiz