# Status e evidências — reconstrução do onboarding

**Data da atualização:** 2026-10-17  
**Branch documental:** `docs/onboarding-rebuild-plan`  
**PR:** [#37 — formalizar reconstrução do onboarding](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/37)  
**Status geral:** Fase 1 executada parcialmente; bloqueada para encerramento até completar baseline local e confirmar versão de produção.

## Estado atual

| Item | Estado | Evidência / observação |
|---|---|---|
| Decisão de reconstruir a experiência | Registrada | `DECISAO-RECONSTRUCAO.md` |
| Plano por fases e critérios de saída | Registrado | `PLANO-DE-EXECUCAO.md` |
| Inventário remoto do onboarding | Realizado | `FASE-1-INVENTARIO-BASELINE.md` com arquivos, responsabilidades e referências de linha. |
| Achados de código | Confirmados estaticamente | Contrato OCR incompatível; progresso local com mensagens que alegam calibração; pontuação fixa sem calibração demonstrada; valores fictícios iniciais de contato a revisar; reidratação de sessão não comprovada. |
| Baseline executável (build/lint/unit/governance) | Pendente | Os comandos foram identificados, mas não executados porque esta sessão não dispõe do checkout local do WSL. Nenhum resultado foi presumido. |
| Working tree local, arquivos não rastreados e stashes | Pendente | A auditoria foi remota via GitHub e não tocou no checkout local. Não executar reset/clean nem substituir worktrees/stashes. |
| Versão efetivamente publicada no Cloudflare | Bloqueada | O repositório documenta Worker `adeusmulta` e `wrangler.jsonc`, mas não houve confirmação independente do deployment/version ID ativo. Não assumir que produção equivale ao commit de `main`. |
| Testes E2E com escrita em produção | Bloqueados | Tentativas anteriores foram inconclusivas na reconciliação. Primeiro comprovar isolamento, identificação exata e limpeza. |
| Cobranças reais | Não executadas | Permanecem proibidas durante desenvolvimento e validação. |
| Alteração de código de produto, banco ou deploy nesta fase | Não executada | A entrega alterou apenas documentação na branch documental. |
| Fase 2 | Não iniciada | Não avançar até fechar os critérios de saída da Fase 1. |

## Achados prévios revalidados no código atual de `main`

A auditoria remota consultou o commit observado `a97123033248ea4bb1d295b1e163b45779ba5916` e arquivos de `main`. Os resultados confirmam estaticamente:

1. `src/components/onboarding/steps/InfractionIdentificationStep.tsx:87–101` envia nome de arquivo em `rawText`, não os bytes da imagem; espera `success/extractedData`.
2. `cloudflare/routes/ocr.ts:71–87, 97–130` espera arquivo multipart ou `image` base64 e retorna `rawText/fields`; o contrato observado não corresponde ao esperado pelo componente. Falta confirmar se algum proxy legado atende o endpoint em produção.
3. `src/components/onboarding/steps/AnalysisProcessingStep.tsx:49–80` executa o motor determinístico local e avança por timers; a implementação inspecionada não comprova pesquisa remota ou calibração estatística antes das mensagens apresentadas.
4. `src/core/rules/rule-engine.ts:909–930` define pontuação fixa conforme argumentos detectados e limita o resultado a 25–99. Não foi encontrada evidência de calibração estatística neste cálculo.
5. `src/components/onboarding/steps/InfractionIdentificationStep.tsx:66–67, 79–85` usa valores iniciais de exemplo para nome/telefone e os considera na validação do formulário; confirmar sincronização com o payload e remover defaults fictícios do caminho real.
6. `src/components/onboarding/OnboardingWizard.tsx:33–81` limita o armazenamento de browser a metadados, o que deve ser preservado; a recuperação do caso completo após recarga ainda precisa de teste específico.
7. O endpoint de geração em `cloudflare/routes/cases.ts` chama `runCanonicalQualityGate` e bloqueia reprovação. Esse gate estrutural não equivale a certificação jurídica nem garante deferimento.

Os achados estão detalhados em `FASE-1-INVENTARIO-BASELINE.md`. Eles são conclusões de inspeção estática de código, não comprovação de comportamento da versão publicada.

## Critérios restantes para encerrar a Fase 1

- [ ] Registrar estado real do checkout WSL, HEAD, arquivos não rastreados e stashes sem apagar nem sobrescrever trabalho existente.
- [ ] Executar e registrar build, lint/typecheck, testes unitários e governança na cópia correta do repositório.
- [ ] Confirmar deployment/version ID ativo do Worker e associá-lo ao commit de origem.
- [ ] Identificar qual runtime atende `/api/ocr/analyze`; reproduzir o contrato com arquivo sintético, sem criar caso nem cobrar.
- [ ] Manter E2E de escrita em produção bloqueado até comprovar isolamento, reconciliação exata e limpeza idempotente.

## Próxima ação

Fechar os itens restantes da **Fase 1 — Baseline e proteção do legado**. Não iniciar a reconstrução da interface nem a Fase 2 enquanto o working tree local e a versão publicada não estiverem protegidos/identificados e a baseline executável não tiver resultados reproduzíveis.

## Histórico

- 2026-10-17: criada a decisão, o plano e o status inicial em branch documental separada.
- 2026-10-17: executada auditoria estática do código remoto de `main`; criado `FASE-1-INVENTARIO-BASELINE.md`. Nenhum código de produto, dado de produção, migração ou deploy foi alterado. A Fase 1 permanece parcial devido a limites de acesso ao checkout local e à ausência de confirmação independente do deployment ativo.
