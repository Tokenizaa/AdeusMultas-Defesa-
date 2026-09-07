# ONBOARDING — FASE 1: CONGELAMENTO

**Data:** 2026-09-07  
**Branch de trabalho:** `onboarding/rebuild-canonico`  
**Branch de referência do legado:** `legacy/onboarding-frozen-2026-09-07`  
**Commit congelado:** `a4c9ecb0caeabda8603535fa0160cdb5c01d5e02`

## Status

**CONCLUÍDO**

O onboarding existente foi congelado como legado. Nenhuma correção, refatoração ou alteração funcional foi realizada como parte desta fase.

## Regra de fronteira

A branch `legacy/onboarding-frozen-2026-09-07` preserva o estado de referência do legado.

O legado não será utilizado como implementação do novo onboarding. Ele poderá ser consultado somente para recuperar requisitos, regras indispensáveis ou decisões de UX que sejam explicitamente validadas para o novo produto.

Não transportar automaticamente:

- páginas;
- componentes;
- hooks;
- services;
- stores;
- tipos específicos do onboarding;
- fluxos;
- contratos antigos;
- funções ou arquivos inteiros.

## Perímetro congelado

O perímetro identificado do fluxo existente inclui, em alto nível:

```text
rota de onboarding
  ↓
container/wizard atual
  ↓
etapas de coleta e análise
  ↓
estado/hook do onboarding
  ↓
integrações de autenticação e persistência
  ↓
API de cases
  ↓
análise/geração
  ↓
pagamento e geração do documento
```

A implementação atual contém, entre outros pontos, `src/components/onboarding/OnboardingWizard.tsx` e seus módulos associados. Este arquivo é referência do legado e não será usado como base estrutural do novo onboarding.

O backend canônico de cases permanece fora do perímetro de implementação do novo onboarding e será integrado posteriormente por contrato explícito.

## Findings registrados, sem correção nesta fase

Os problemas conhecidos do legado permanecem intocados. Entre os itens que deverão ser tratados nas fases posteriores estão:

- persistência de caso anônimo e seu contrato real;
- contrato de claim entre frontend e backend;
- transporte real de evidências/OCR;
- progresso de análise baseado em trabalho real;
- semântica de score versus probabilidade de êxito;
- validação canônica dos dados obrigatórios;
- fixture/admin de preenchimento completo;
- estados de pagamento e geração;
- fronteira única entre análise do frontend e análise canônica do backend.

Esses itens são **LEGACY FINDINGS**. Nenhum foi corrigido pela Fase 1.

## Resultado da Fase 1

- Estado do legado identificado.
- Commit de referência preservado.
- Branch congelada preservada.
- Perímetro inicial documentado.
- Fronteira entre legado e rebuild estabelecida.
- Nenhum código do novo onboarding foi criado nesta fase.

## Próxima fase

**FASE 2 — DEFINIR O QUE FICA**

Objetivo: extrair somente requisitos reais, regras indispensáveis e UX útil. O resultado será especificação para o greenfield, não reutilização de código legado.
