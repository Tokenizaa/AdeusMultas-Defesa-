# MARCO ZERO — Onboarding do AdeusMultas

> **Ponto de partida oficial para a nova fase de estabilização do onboarding.**
>
> A partir deste diretório, toda auditoria, decisão técnica, correção e validação do onboarding deve ser registrada em tarefas pequenas, delimitadas e verificáveis. Este marco não apaga nem substitui o histórico anterior do repositório: estabelece uma referência clara para o trabalho daqui em diante.

## Objetivo

Levar o onboarding a um estado **funcional, juridicamente coerente e validado por evidências**, até que possa receber o selo verde. O selo verde só poderá ser declarado depois de critérios de aceitação definidos e testes realmente executados; não significa apenas que o código compila ou que uma tela abre.

## Regras de trabalho

1. **Uma tarefa por vez.** Cada entrega deve ter escopo fechado, critérios de aceitação e verificação própria.
2. **Investigar antes de alterar.** Identificar arquivos, contratos, dependências e riscos diretamente relacionados à tarefa.
3. **Menor mudança suficiente.** Não aproveitar correções pontuais para refatorar áreas não relacionadas.
4. **Evidência antes de PASS.** Registrar comandos/testes executados e resultados reais. Se não for possível verificar, marcar BLOCKED; se falhar, FAIL.
5. **Preservar o que funciona.** Não remover testes, documentos, dados ou funcionalidades sem escopo explícito e verificação de dependências.
6. **Separar fato, hipótese e decisão.** Marcar claramente o que foi confirmado no código, o que foi observado em execução e o que ainda precisa ser comprovado.
7. **Não presumir integrações.** Catálogo local, campo de versão ou referência a uma fonte não provam sincronização nem consulta oficial em tempo real.
8. **Não publicar em produção sem autorização explícita.** Trabalhar conforme as regras do repositório, diretamente em main; não criar branches nem PRs.
9. **Fechar cada tarefa.** Registrar alterações, validações, riscos restantes e SHA do commit, quando houver.
10. **Sem selo verde por declaração.** O selo depende de uma matriz de critérios de aceitação e evidências verificáveis de ponta a ponta.

## Organização sugerida

- README.md — este marco, princípios e índice.
- AUDITORIA-01-BASELINE-SERVICO-DE-MULTAS.md — linha de base do fluxo de onboarding específico do serviço de multas.
- CORRECAO-01-CONSISTENCIA-ETAPAS-2-A-4.md — correções de consistência entre fase, categoria e primeiro formulário.
- CORRECAO-02-PREENCHIMENTO-TESTE-FORMULARIO.md — botão administrativo de preenchimento completo da etapa 4.
- TAREFA-001-OCR-E-LEITURA-DOCUMENTAL.md — especificação da primeira correção, quando formalizada.
- TAREFA-002-MAPEAMENTO-DE-FASES.md — mapeamento e validação das fases, quando formalizados.

Não é necessário criar todos esses documentos antecipadamente. Cada documento deve nascer quando a tarefa correspondente for definida, para evitar documentação especulativa.

## Índice — comece por aqui

1. **[HANDOFF CANÔNICO PARA AGENTES](./HANDOFF-CANONICO-AGENTES.md)** — leitura obrigatória ao assumir o trabalho; mapa do fluxo, protocolo, estado atual, workflows e próximas ações.
2. [Auditoria 01 — linha de base do serviço de multas](./AUDITORIA-01-BASELINE-SERVICO-DE-MULTAS.md)
3. [Correção 01 — consistência das etapas 2 a 4](./CORRECAO-01-CONSISTENCIA-ETAPAS-2-A-4.md)
4. [Correção 02 — preenchimento de teste do formulário](./CORRECAO-02-PREENCHIMENTO-TESTE-FORMULARIO.md)
5. [Correção 03 — perguntas específicas de radar/INMETRO](./CORRECAO-03-PERGUNTAS-RADAR-INMETRO.md)
6. [Correção 04 — navegação, início, retomada e reinício](./CORRECAO-04-NAVEGACAO-INICIO-RETOMADA.md)

## Status inicial

- **Marco:** estabelecido.
- **Escopo inicial:** onboarding do serviço de multas; as etapas listadas na auditoria são pontos examinados, não um limite de escopo por número de etapa.
- **Alterações funcionais registradas:** correção de consistência entre fase, categoria e formulário inicial documentada em CORRECAO-01-CONSISTENCIA-ETAPAS-2-A-4.md.
- **CI da correção 01:** testes unitários, TypeScript e build aprovados no [workflow](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40771746919).
- **Correção 02 — botão administrativo de preenchimento:** fixture contextualizada por serviço + fase + categoria. O usuário confirmou preenchimento completo da etapa 4 em ambiente local, incluindo datas; isso não equivale a validação em produção. Registro: CORRECAO-02-PREENCHIMENTO-TESTE-FORMULARIO.md.
- **Correção 03 — perguntas específicas de radar/velocidade:** commit [396a7aae](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/396a7aae30a0987f5ccd7adf8aa39896bd36d481) torna os campos do INMETRO opcionais, remove uma afirmação jurídica categórica sobre aferição superior a 12 meses e corrige o formato ISO do input de data. A validação manual desta etapa está sendo feita pelo usuário; aguardar o resultado e registrá-lo.
- **Workflows da correção 03:** CI/CD run [40782524806](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524806) falhou no passo Vitest; typecheck/build foram pulados. Cloudflare Deploy run [40782524758](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524758) falhou na descoberta da matriz E2E antes do build/deploy. Consultar logs e não contornar as verificações. Registro detalhado: [CORRECAO-03-PERGUNTAS-RADAR-INMETRO.md](./CORRECAO-03-PERGUNTAS-RADAR-INMETRO.md).
- **Correção 04 — início/retomada/reinício:** identificada restauração automática da etapa salva; adicionada tela explícita com Começar, Continuar de onde parei e Começar do zero, além de reinício confirmado dentro do wizard. Limpeza de rascunho cobre sessionStorage e localStorage. Registro: [CORRECAO-04-NAVEGACAO-INICIO-RETOMADA.md](./CORRECAO-04-NAVEGACAO-INICIO-RETOMADA.md).
- **CI da correção 04:** [run 40786762859](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786762859) passou em Vitest, typecheck e build para o commit e57ddbf6. O CI do commit [25e33671](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/25e33671c0d138b87263c7ef34fe9b64209a8e30) também passou em Vitest, typecheck e build no [run 40786938357](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786938357).
- **Deploy da correção 04:** [run 40786938367](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786938367) falhou no gate de descoberta E2E: só 3 testes Playwright são listados, enquanto a especificação exige 70 cenários canônicos. O deploy não foi realizado; não contornar o gate.
- **Validação visual/E2E de ponta a ponta:** ainda não declarada como concluída. Testar começo, retomada, reinício, avanço, retrocesso e recarga antes de declarar PASS.
- **Próxima ação:** consultar CI e deploy atuais; corrigir falhas comprovadas e resolver o gate da matriz E2E sem desativá-lo.

## Modelo de registro por tarefa

Toda tarefa deve registrar:

- **ID e objetivo**
- **Escopo incluído e excluído**
- **Estado anterior / SHA de referência**
- **Arquivos e contratos afetados**
- **Riscos e dependências**
- **Critérios de aceitação**
- **Implementação realizada**
- **Verificações executadas e resultados** (PASS, FAIL, BLOCKED)
- **Pendências e riscos residuais**
- **Commit SHA**, quando aplicável
- **Próxima ação autorizada**

---
*Este diretório é o marco de governança do trabalho de estabilização do onboarding. O conteúdo deve permanecer factual, versionado e incremental.*
