# ONBOARDING — FASE 4: NOVA ARQUITETURA

**Data:** 2026-09-07  
**Branch:** `onboarding/rebuild-canonico`  
**Status:** CONCLUÍDO

## Objetivo

Criar a fronteira arquitetural do onboarding greenfield sem adaptar o wizard legado.

## Estrutura inicial

```text
src/onboarding-v2/
├── domain/
│   ├── state.ts
│   └── transitions.ts
├── application/
│   ├── contracts.ts
│   └── types-bridge.ts
└── README.md
```

A implementação futura acrescentará adapters de API/persistência e UI somente quando necessários. Não haverá import de `src/components/onboarding`, `use-onboarding-flow` ou serviços específicos do wizard antigo.

## Responsabilidades

### `domain/`

Define invariantes da jornada. Não conhece React, HTTP, Supabase ou componentes visuais.

### `application/`

Define os casos de uso do onboarding e seus contratos. É a única camada autorizada a orquestrar operações de negócio do fluxo.

### Adapters (Fase 6)

Serão responsáveis por HTTP, autenticação, upload/OCR, pagamento e integração com geração. Esses detalhes não entram no domínio.

### UI (Fase 5)

Consumirá uma implementação de `OnboardingApplication`. Não fará `fetch` diretamente nem manterá uma segunda representação do caso.

## Fonte de verdade

```text
CaseDomain persistido no backend = verdade do caso
OnboardingState = verdade da jornada
UI state = apresentação/transiente
```

Browser storage não será fonte de verdade para dados de negócio.

## Invariantes

1. Toda mutação do caso passa por uma operação de aplicação.
2. A UI não decide status jurídico, pagamento aprovado ou documento pronto.
3. O backend é autoridade para identidade, claim, pagamento e geração.
4. Análise jurídica pertence ao backend/domínio.
5. Evidência OCR é auxiliar e não equivale a prova validada.
6. Falha é estado explícito; não existe avanço silencioso.
7. `caseId` nunca substitui `claimToken`.
8. O caso persistido pode ser recuperado após reload.

## Fluxo arquitetural

```text
UI
 ↓
OnboardingApplication
 ↓
Canonical API Adapter
 ↓
Case / Analysis / Payment / Document services
 ↓
Persistence
```

## Critério de isolamento

O novo código pode conhecer tipos canônicos do núcleo quando necessário, mas não pode depender da implementação do onboarding congelado.

Qualquer tentativa de importar o wizard antigo, seus hooks, seus steps ou seus serviços deve ser tratada como violação arquitetural.

## Critério de aceite da Fase 4

A arquitetura está pronta para a Fase 5 quando:

- existe uma fronteira própria para o onboarding novo;
- jornada e caso estão separados;
- casos de uso estão explicitados;
- transições são verificáveis;
- UI não possui autoridade sobre domínio;
- integrações estão preparadas para adapters;
- nenhum código do onboarding legado foi incorporado como implementação.
