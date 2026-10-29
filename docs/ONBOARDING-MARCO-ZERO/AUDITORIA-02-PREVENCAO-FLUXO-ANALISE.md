# Auditoria 02 — prevenção de divergências no onboarding de multas

**Data:** 2026-10-29  
**Branch canônica:** `main`  
**Base de código examinada:** `d584900903593a54dc1c1c4afbaff22edc59768c` (inclui a correção de rótulos e o teste recém-adicionado)  
**Natureza:** leitura estática integrada do formulário, motor, entrada anônima do Worker, resultado e documentação histórica.  
**Limite:** não houve execução local de testes, navegador, E2E ou análise nova em produção. A alteração de rótulos está registrada, mas o CI do SHA atual ainda não foi confirmado. Este documento não certifica o onboarding.

## 1. Objetivo

Sair do ciclo de corrigir apenas o último sintoma relatado. A auditoria rastreia classes de risco entre a coleta dos fatos, a avaliação determinística, o salvamento no Worker e a apresentação do resultado. Os achados são separados em defeitos confirmados, riscos estruturais e itens que precisam de execução para serem provados.

## 2. Achados atuais

### A02-01 — Mensagens de regras não aplicáveis podiam expor nomes internos

**Estado:** correção implementada; CI e validação visual pendentes.  
**Arquivos:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`, `src/core/rules/infraction-classifier.ts`, `src/components/onboarding/steps/onboarding-copy-regression.test.tsx`.

O classificador define as famílias `excesso_velocidade`, `alcoolemia`, `semaforo`, `celular`, `estacionamento`, `cinto`, `documentos`, `circulacao`, `capacidade`, `lotacao` e `desconhecida`. A função de apresentação traduzia apenas parte desses valores. A correção 11 completa os rótulos, inclui uma lista em linguagem natural e adiciona uma asserção sobre HTML renderizado. A validação automatizada ainda precisa concluir.

### A02-02 — A regra de dupla notificação pode produzir uma lacuna que o formulário não permite resolver

**Estado:** lacuna de coleta confirmada por inspeção estática; mudança de produto ainda não implementada.  
**Arquivos:** `src/core/rules/rule-engine.ts`, `src/types/index.ts`, `src/components/onboarding/steps/InfractionIdentificationStep.tsx`, `cloudflare/onboarding-domain.ts`, `cloudflare/canonical-mapper.ts`.

O motor registra `RULE_CONSTITUTIONAL_DUE_PROCESS` como `DATA_GAP` quando existe data de expedição, mas não existe `notificationDeliveryDate`. O campo existe nos tipos e mapeadores e pode vir de payload/OCR; a inspeção da tela de identificação não encontrou um controle visível para o usuário informar manualmente a data de entrega. Assim, uma lacuna pode persistir sem um caminho claro para o usuário completá-la.

**Regra de segurança jurídica:** ausência da data de entrega não é prova de não entrega e não pode, por si só, produzir uma tese de violação da dupla notificação. O motor atual registra uma lacuna, o que é conservador; o problema restante é a possibilidade de a interface pedir informação que não oferece como preencher.

**Próxima ação:** decidir e implementar um campo opcional, contextualizado e com origem explícita, ou explicar que essa verificação depende do documento/histórico oficial. Não inferir a data nem preencher por padrão.

### A02-03 — Há duas avaliações no fluxo; a paridade precisa ser demonstrada por contrato

**Estado:** risco estrutural confirmado por leitura; divergência de saída atual não demonstrada nesta auditoria.  
**Arquivos:** `src/components/onboarding/steps/AnalysisProcessingStep.tsx`, `src/components/onboarding/OnboardingWizard.tsx`, `cloudflare/routes/cases.ts`, `cloudflare/rag-adapter.ts`, `src/core/rules/rule-engine.ts`.

A tela de processamento executa `ExpertRuleEngine.evaluate` no navegador. O fluxo de criação do caso anônimo também executa `analyzeInfractionCompat` no Worker. O wizard pode substituir a análise local pela análise retornada pelo servidor depois do salvamento. A rota anônima já preserva atualmente datas de notificação, histórico declarado e várias flags de evidência; portanto, achados históricos que diziam que todos esses campos eram descartados não devem ser repetidos como defeitos atuais.

Mesmo com os campos preservados, a duplicação significa que normalização, defaults, versões ou caminhos de execução podem alterar o resultado apresentado. Falta uma verificação contratual que prove equivalência para os mesmos dados de entrada, exceto diferenças documentadas como procedimento selecionado e metadados de persistência.

**Próxima ação:** criar testes de paridade com fixtures sintéticas para prazo, radar/velocidade, histórico do art. 267, campos ausentes e família desconhecida. Comparar `recommendedArguments`, `detectedInconsistencies`, `dataGaps`, `evaluatedRules` e status; não comparar timestamps/IDs gerados.

### A02-04 — O resultado de análise contém regras de apresentação derivadas de prefixos de texto

**Estado:** risco de manutenção confirmado por inspeção; impacto visual precisa ser validado.  
**Arquivo:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`.

A apresentação de regras não aplicáveis interpreta uma frase do motor por regex e depois traduz a família/categoria. A correção 11 completa o mapa e reduz a exposição de nomes internos conhecidos, mas a interface continua dependendo do formato textual exato de `reason`. Uma mudança no texto do motor pode fazer a tradução cair no fallback.

**Próxima ação:** após estabilizar o fluxo atual, preferir um contrato estruturado de apresentação (status + family + category + campos faltantes), preservando `reason` como detalhe explicativo. Não misturar essa evolução com a correção pontual de rótulos.

### A02-05 — O motor ainda calcula um score heurístico numérico

**Estado:** comportamento do motor confirmado; impacto atual em cada tela consumidora ainda precisa de inventário.  
**Arquivo:** `src/core/rules/rule-engine.ts`.

O motor calcula `overallSuccessRate` com valores-base fixos por tese e bônus/penalidades de completude e lacunas. Isso não é, por si só, uma probabilidade estatística calibrada. A tela principal do resultado foi simplificada para linguagem condicional, mas antes de considerar o risco resolvido é necessário localizar todos os consumidores desse campo — inclusive portões de conta, checkout, dashboard e documentos — e verificar se algum ainda o apresenta como chance de deferimento ou usa o número como decisão jurídica.

**Próxima ação:** inventariar todos os usos de `overallSuccessRate` e `successRateBasis`; classificar cada uso como apresentação, analytics ou regra de decisão. Não alterar o algoritmo antes desse inventário.

## 3. Achados antigos que precisam ser tratados como históricos, não como defeitos atuais

A leitura da versão atual encontrou mudanças que contradizem alguns achados das auditorias de 22/10:

- `AnalysisProcessingStep.tsx` agora exibe erro e não avança sem `analysisResult`; o relato histórico de avanço automático após exceção não descreve o código atual.
- `FreeAnalysisResultStep.tsx` já usa “não informado” para artigo/código e valor/pontos ausentes; os fallbacks que fabricavam Art. 218, código 745-50, R$ 130,16 ou 4 pontos não aparecem na versão atual examinada.
- `cloudflare/routes/cases.ts` atualmente mapeia datas de notificação, prazo, histórico e flags de evidência para o caso anônimo; a alegação histórica de que todos esses campos eram descartados está desatualizada.
- O fluxo do Worker preserva o procedimento selecionado como parte do contrato do caso; isso deve ser considerado ao escrever testes de paridade, em vez de exigir igualdade cega em todos os campos.

Os documentos de auditoria antigos continuam úteis como histórico e evidência de como os riscos foram encontrados. Antes de reutilizar qualquer achado como pendência, o agente deve verificá-lo contra o `main` atual e marcar explicitamente **corrigido**, **ainda reproduzível**, **não reproduzido** ou **não verificado**.

## 4. Plano preventivo priorizado

| Ordem | Ação | Critério de saída |
|---|---|---|
| 1 | Confirmar CI da correção 11 | Teste de regressão passa no SHA atual; se falhar, corrigir a causa e repetir CI. |
| 2 | Resolver o caminho de coleta da data de entrega | Campo opcional com explicação/origem ou orientação explícita para documento oficial; sem inferência e sem tese por ausência. |
| 3 | Criar testes de paridade navegador × Worker | Fixtures sintéticas demonstram equivalência dos resultados jurídicos para o mesmo input, com diferenças intencionais documentadas. |
| 4 | Inventariar consumidores de score | Nenhuma tela ou decisão apresenta heurística como probabilidade estatística nem a usa como conclusão jurídica. |
| 5 | Validar matriz E2E em ambiente autorizado | Todos os cenários têm resultado/evidência rastreável; nenhum BLOCKED é tratado como PASS. |
| 6 | Validar visualmente a saída publicada | Desktop/mobile confirmam os textos, contagens, lacunas e dados do caso; SHA servido registrado. |

## 5. Regras de execução

- Não executar E2E com escrita persistente contra produção sem autorização explícita e confirmação do alvo Supabase.
- Não usar fixtures sintéticas como prova jurídica de caso real.
- Não converter ausência de dado em zero, inexistência ou irregularidade confirmada.
- Não publicar em produção apenas porque o CI passou. O workflow Cloudflare exige o marcador explícito `[DEPLOY-PRODUCTION]` para a etapa de deploy.
- Não declarar o onboarding certificado enquanto a matriz e as validações visuais não estiverem concluídas.

## 6. Próxima ação

Conferir o resultado do CI para `d584900903593a54dc1c1c4afbaff22edc59768c`. Depois, tratar A02-02 como a próxima tarefa delimitada: mapear o campo de data de entrega e decidir o caminho de coleta antes de alterar a interface. O restante deste relatório é fila de investigação, não autorização para refatoração ampla.
