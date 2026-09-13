# ONBOARDING — FASE 5: REESCRITA GREENFIELD

**Data:** 2026-09-07  
**Branch:** `onboarding/rebuild-canonico`  
**Status:** EM IMPLEMENTAÇÃO INICIAL

## Entregue

A primeira camada de UI do novo onboarding foi escrita do zero em `src/onboarding-v2/ui`.

A implementação contém oito contextos semânticos alinhados ao contrato da Fase 3:

1. Caso
2. Fatos
3. Evidências
4. Diagnóstico
5. Qualificação
6. Revisão
7. Pagamento
8. Geração

A UI usa `OnboardingApplication` como fronteira de aplicação e não chama HTTP diretamente.

## Decisões importantes

- Não foram importados componentes, hooks ou serviços do onboarding congelado.
- Não existe timer simulando processamento.
- O diagnóstico usa linguagem de força preliminar, não promessa de probabilidade estatística.
- Falha de persistência/análise é exposta como erro e não permite avanço silencioso.
- Pagamento e geração permanecem sem simulação até a integração real da Fase 6.
- O arquivo selecionado no browser ainda não representa uma evidência processada; upload/OCR real é responsabilidade da Fase 6.

## Limite desta entrega

A UI ainda não deve substituir a rota pública existente. A ativação só ocorrerá depois que os adapters reais e a validação E2E forem concluídos.

## Próximo passo

Completar a Fase 5 com os ajustes de UX/validação necessários e preparar a integração pelos adapters da Fase 6, sem introduzir dependência do legado.
