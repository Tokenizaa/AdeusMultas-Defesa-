# Onboarding V2 — Arquitetura Greenfield

Esta pasta é a nova implementação do onboarding. Ela não importa componentes, hooks ou serviços do onboarding legado.

## Camadas

```text
UI (Fase 5)
  ↓
application
  ↓
canonical API / adapters (Fase 6)
  ↓
core domain + persistence
```

## Fase 4

A arquitetura inicial define apenas contratos e invariantes. Nenhum fluxo legado é adaptado para caber aqui.

### Fonte de verdade

`CaseDomain` persistido no backend.

`OnboardingState` representa somente a jornada da interface/aplicação e nunca substitui o caso.

### Regra

Qualquer operação que altere o caso deve passar por `application` e pelo contrato canônico. A UI não chama HTTP diretamente.
