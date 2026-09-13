# ONBOARDING — KICKOFF DO REBUILD CANÔNICO

**Data:** 2026-09-07  
**Branch:** `onboarding/rebuild-canonico`  
**Legado congelado:** `legacy/onboarding-frozen-2026-09-07`

## Decisão

O onboarding atual está congelado. O novo onboarding será reconstruído do zero.

Nenhuma página, componente, hook, service ou arquivo do onboarding legado será copiado ou reaproveitado integralmente.

O legado será consultado somente quando necessário para recuperar requisitos, regras ou decisões de UX.

## Plano operacional

1. **Congelar** — manter o legado intocado e preservar sua referência.
2. **Definir o que fica** — identificar rapidamente apenas requisitos reais, regras indispensáveis e UX útil.
3. **Desenhar o novo contrato** — definir Case, estado, etapas, persistência, autenticação/claim, análise, pagamento e geração.
4. **Criar a nova arquitetura** — estabelecer fonte única de verdade e separação clara entre UI, serviços, domínio, API e banco.
5. **Reescrever** — criar o novo onboarding linha por linha, sem reutilização integral do legado.
6. **Conectar o fluxo real** — integrar persistência, evidências/OCR, análise, autenticação/claim, pagamento e geração.
7. **Validar** — testar o fluxo ponta a ponta e corrigir falhas reais.
8. **Ativar e remover** — promover o novo fluxo e retirar o legado após validação.

## Regra de velocidade

Não criar burocracia desnecessária. Cada fase deve produzir um resultado concreto. Auditoria serve para tomar decisões, não para prolongar indefinidamente o início da implementação.

## Regra de segurança

Nenhuma decisão do legado será transportada automaticamente para o novo sistema. Se uma decisão não puder ser justificada como requisito, regra ou UX necessária, ela fica fora.

## Primeiro objetivo técnico

Construir a fundação do novo onboarding sem dependência do código legado:

```text
Onboarding UI
    ↓
Onboarding State
    ↓
Application Services
    ↓
Canonical API
    ↓
Domain
    ↓
Database
```

A implementação começa nesta branch e não deve importar módulos do onboarding legado.
