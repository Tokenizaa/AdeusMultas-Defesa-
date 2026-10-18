# Inventário de PRs e branches — AdeusMultas

Data do snapshot: 2026-10-17 (horário UTC dos metadados do GitHub pode aparecer no dia seguinte ao horário local).

Este documento registra apenas itens cuja existência e estado foram verificados pela integração GitHub nesta revisão. Não representa autorização para apagar trabalho exclusivo. A busca disponível não retornou uma listagem completa confiável de PRs; portanto, os itens abaixo são o conjunto confirmado, não uma declaração de que não existam outros PRs abertos.

## Decisão de onboarding

- PR [#37 — docs: formalizar reconstrução do onboarding](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/37): **fechada sem merge** em 2026-10-18 UTC, por estar substituída pelas diretrizes canônicas diretamente na `main`.
- Branch `docs/onboarding-rebuild-plan`: contém 9 commits exclusivos e cinco documentos de planejamento antigo. Foi mantida por enquanto; o branch remoto não foi apagado nesta revisão.
- Branches antigas de onboarding identificadas: `onboarding/rebuild-canonico`, `onboarding/rebuild-canonico-clean`, `onboarding/rebuild-canonico-f6b`, `onboarding/rebuild-canonico-f6`, `onboarding/revisao-independente-zero`, `onboarding/v2-production-audit-2026-09-08`, `onboarding-f6-final`, `refactor/onboarding-canonical-2026-09-08`, `tmp-onboarding-f6`, `legacy/onboarding-frozen-2026-09-07`.
- A auditoria independente da Base de Conhecimento/RAG e a revisão de requisitos/arquitetura foram copiadas para a `main`:
  - `docs/product/onboarding/AUDITORIA-BASE-CONHECIMENTO-RAG-ONBOARDING.md`
  - `docs/product/onboarding/REVISAO-INDEPENDENTE-REQUISITOS-E-ARQUITETURA.md`
- A diretriz vigente está em `docs/product/DECISOES-ARQUITETURA-PRODUTO.md`.

## PRs abertas verificadas e classificação

| PR | Tema | Estado nesta revisão | Diferença em relação à main | Tratamento |
|---|---|---|---|---|
| [#32](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/32) | Auditoria/plano de ação do Marketing | Aberta; 5 commits exclusivos; 2 arquivos de documentação | Divergente, 42 commits atrás | Não fechar sem copiar/revisar a documentação e decidir se o plano continua vigente. |
| [#29](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/29) | E2E com cinco usuários compartilhados | Aberta; 29 commits exclusivos; 23 arquivos | Divergente, 42 commits atrás | Relevante à diretriz de cinco usuários, mas ampla e com alterações de aplicação. Não fazer merge direto; revisar e portar somente o necessário. |
| [#28](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/28) | Contrato/estados da Visão Geral de Operação | Aberta; 4 commits exclusivos; 4 arquivos | Divergente, 42 commits atrás | Reconciliar com o contrato e a UI atuais antes de decidir. |
| [#26](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/26) | Links duplicados de Testes & Qualidade | Aberta; 1 commit exclusivo; 1 arquivo | Divergente, 42 commits atrás | Mudança pequena, mas o arquivo da branch difere da `main`; comparar semanticamente antes de fechar. |
| [#25](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/25) | Estados do dashboard do condutor | Aberta; 8 commits exclusivos; 3 arquivos | Divergente, 51 commits atrás | Revisar contra a implementação atual antes de fechar ou portar. |
| [#24](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/24) | Remover Redis do bootstrap local | Aberta; 3 commits exclusivos; 70 arquivos | Divergente, 77 commits atrás | **Preservar.** Contém artefatos de recuperação, documentos legais baixados, backups e alterações de código além do título da PR. Não excluir branch nem conteúdo por inferência. |
| [#14](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/14) | Execução do Golden Path em produção | Aberta; 4 commits exclusivos; 2 arquivos | Divergente, 426 commits atrás | Provavelmente precisa de atualização/revalidação de ambiente e harness; inspecionar antes de fechar. |
| [#10](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/10) | Invariantes do domínio de pagamentos | Aberta; 2 commits exclusivos; 2 arquivos | Divergente, 438 commits atrás | Preservar até reconciliar com código e dados atuais de pagamentos. |
| [#11](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/11) | Seleção determinística de gateway | Aberta; 5 commits exclusivos; 4 arquivos | Divergente, 438 commits atrás | Preservar até reconciliar com código e configuração atuais de gateways. |
| [#12](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/12) | PaymentOrder/PaymentAttempt e migrações | Aberta; 21 commits exclusivos; 13 arquivos | Divergente, 438 commits atrás | **Não excluir nem fechar sem auditoria.** Contém migrações SQL e implementação financeira potencialmente relevante. |
| [#31](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/31) | Módulo financeiro VenoPag | Fechada | — | Já fechada; não presumir merge ou implantação só pelo estado fechado. |

## Inventário de branches

A consulta inicial retornou mais de 79 branches e paginação adicional, incluindo numerosas variantes temporárias de `phase0`, `phase1-payment-invariants`, onboarding, integração, testes e recuperação. Isso confirma que existe risco real de ambiguidade. Não foi feita exclusão em massa.

### Regras de limpeza
1. A `main` é a referência canônica para decisões e trabalho novo deste esforço.
2. Branches divergentes não devem ser mescladas só para “limpar” a lista.
3. Antes de fechar uma PR, identificar commits exclusivos, conteúdo único, migrações, evidências, artefatos legais, consumidores, deploys e dependências.
4. Antes de apagar um branch, confirmar que todo o conteúdo necessário está preservado na `main` ou em arquivo de recuperação acessível.
5. Preservar alterações locais, worktrees, backups e stashes.
6. Branches locais/temporárias não devem ser removidas por inferência.
7. A integração GitHub disponível nesta execução permite inspecionar e fechar PRs, mas não expõe uma ação de exclusão de branch remoto. Nenhum branch remoto foi apagado por esta revisão.
8. Para reduzir a repetição de auditorias, atualizar este registro depois de cada decisão real de fechamento/portabilidade, sem reabrir análise de branches já classificadas sem evidência nova.

## Próxima ordem de trabalho

1. Manter encerrada a PR #37; não reabrir o plano antigo.
2. Tratar PRs de código com migrações/dados (especialmente #12 e #24) como conteúdo a preservar até auditoria de paridade.
3. Reconciliar PRs pequenas e recentes (#26, #28, #25) com a `main` atual; portar somente mudanças ainda necessárias diretamente na `main`.
4. Migrar ou arquivar a documentação ainda vigente da PR #32 antes de fechá-la.
5. Reavaliar a PR #29 com a regra de cinco usuários e a matriz E2E real; não adotar os 70 usuários originais.
6. Revisar a PR #14 quanto ao ambiente e ao harness atual.
7. Fazer a exclusão remota de branches somente por ferramenta autorizada e depois de comprovar preservação do conteúdo exclusivo.
