# Plano de investigação controlada — Marco Zero

**Data de registro:** 2026-10-29  
**Status:** ATIVO  
**Escopo:** estabilização do onboarding de Multa de Trânsito e do fluxo de análise associado.  
**Regra principal:** uma investigação delimitada por vez; não transformar descobertas laterais em alterações automáticas.

## 1. Objetivo

Evitar que correções isoladas gerem uma sequência descontrolada de mudanças. Cada problema deve ser rastreado pela camada em que nasce e pelas camadas que o consomem, com evidência, escopo fechado e critérios de aceite.

## 2. Protocolo obrigatório

Para cada tarefa, registrar antes de alterar código:

1. **Pergunta de investigação:** dúvida específica a resolver.
2. **Evidências:** arquivos, contratos, testes, logs ou comportamento que sustentam o achado.
3. **Classificação:** defeito confirmado, suspeita a investigar ou limitação conhecida.
4. **Escopo incluído e excluído:** arquivos/camadas que podem e que não podem ser alterados.
5. **Critérios de aceite:** evidências objetivas necessárias para encerrar.
6. **Pendências laterais:** registrar separadamente; não ampliar a tarefa por iniciativa própria.
7. **Resultado:** diagnóstico, decisão, arquivos alterados (se houver), testes realmente executados, status PASS/FAIL/BLOCKED, riscos restantes e próximo passo autorizado.
8. **Documentação:** atualizar este plano, o registro específico da tarefa e o README/HANDOFF canônicos quando o estado ou a próxima ação mudar.

## 3. Regras de contenção

- Uma tarefa ativa por vez.
- Investigar antes de alterar; a primeira subtarefa pode ser somente leitura.
- Fazer a menor alteração suficiente para resolver o defeito confirmado.
- Não refatorar áreas adjacentes nem iniciar outras correções porque surgiram achados relacionados.
- Registrar achados laterais como itens separados, com prioridade, sem os corrigir dentro da tarefa atual.
- Exceção: uma ação imediata só pode ocorrer se for necessária para evitar risco concreto à segurança, integridade dos dados ou conclusão jurídica enganosa; documentar a razão e limitar a intervenção.
- Ausência de dados não equivale a zero, resposta negativa ou irregularidade comprovada.
- Não declarar PASS sem evidência executada. Código alterado, commit criado ou build concluído isoladamente não comprova fluxo E2E.
- Não executar deploy de produção nem escrita persistente real sem autorização explícita.
- Trabalhar na branch canônica `main`, respeitando as regras já estabelecidas no HANDOFF; não criar branches ou PRs.

## 4. Mapa geral de investigação

As etapas abaixo organizam o universo de investigação, mas **não autorizam executar todas em paralelo**. Cada etapa deverá ser desdobrada em tarefas pequenas.

| Etapa | Camada | Pergunta central | Entrega |
|---|---|---|---|
| 0 | Estado e documentação | O que está corrigido, pendente, bloqueado ou sem evidência? | Inventário factual por status |
| 1 | Motor de regras | As condições e estados das regras são coerentes com os dados e o fundamento? | Ficha individual por regra |
| 2 | Formulário/coleta | O sistema coleta cada informação necessária de forma inequívoca? | Matriz regra → dado → campo |
| 3 | Transporte/persistência | Os dados mantêm significado e valor entre estado, payload, API e banco? | Rastreio de campos e contratos |
| 4 | API/execução | Qual componente executa a análise e como erros/respostas são tratados? | Rastreio de execução e contrato |
| 5 | Resultado/interface | A mensagem apresentada corresponde ao resultado e às evidências? | Matriz resultado → mensagem |
| 6 | Integração | As camadas funcionam juntas para os cenários relevantes? | Testes integrados de ponta a ponta |
| 7 | Encerramento | CI, regressões, evidência visual/E2E e documentação foram verificados? | Registro de fechamento |

## 5. Tarefa ativa

### INV-001 — Catálogo jurídico da regra de dupla notificação

**Status:** EM INVESTIGAÇÃO — SOMENTE LEITURA  
**Objetivo:** identificar o que o catálogo/base de conhecimento e os metadados jurídicos dizem sobre a regra, comparando-os com a semântica já identificada no motor, sem modificar comportamento nesta tarefa.

**Pergunta:** existem descrições, critérios, metadados ou textos no catálogo que afirmem ou impliquem que as datas de expedição/entrega da Notificação de Autuação bastam para concluir sobre a dupla notificação, ou que a irregularidade depende exclusivamente da prova de não entrega da Notificação de Autuação?

**Escopo incluído:**
- Localizar todas as definições e referências pertinentes no catálogo e na camada de validação jurídica.
- Identificar arquivos, símbolos, testes e documentos que expressem o critério.
- Comparar as declarações encontradas com a regra atual do motor e com os campos que representam cada notificação.
- Classificar cada divergência como confirmada, suspeita ou não encontrada.
- Registrar caminhos/linhas e evidências verificáveis.

**Escopo excluído:**
- Não alterar o motor de regras.
- Não alterar formulários, payloads, banco ou migrações.
- Não editar textos jurídicos nesta primeira tarefa.
- Não investigar paridade navegador/Worker nem consumidores de `overallSuccessRate`.
- Não iniciar a implementação do campo da Notificação de Imposição de Penalidade.

**Critérios de aceite:**
- [ ] Todas as referências relevantes no catálogo/camada de validação foram localizadas ou a cobertura incompleta foi declarada.
- [ ] Cada achado tem arquivo, símbolo/trecho e classificação.
- [ ] As diferenças entre Notificação de Autuação (NA) e Notificação de Imposição de Penalidade (NIP) estão explicitadas.
- [ ] Há conclusão objetiva sobre a existência ou não de inconsistência no catálogo.
- [ ] Nenhum código funcional foi alterado nesta investigação.
- [ ] A próxima tarefa é proposta, mas não executada automaticamente.

**Contexto já conhecido (não substitui a investigação):**
- A regra do motor foi alterada para não concluir PASS apenas com datas relacionadas à NA e registrar lacuna sobre a expedição da NIP.
- Foi identificado um texto potencialmente desatualizado em `src/core/onboarding/legal-validation.ts`, cuja atualização não foi concluída.
- A coleta, tipagem, transporte e persistência independentes da NIP ainda precisam ser investigados em tarefas posteriores.
- CI, E2E e validação visual das alterações recentes não devem ser presumidos como aprovados.

**Próximo passo autorizado:** executar apenas a leitura e o inventário de INV-001. Ao encerrar, registrar as evidências e aguardar a conclusão dessa tarefa antes de iniciar INV-002.

## 6. Backlog separado — não iniciar sem fechamento da tarefa ativa

- **INV-002:** rastrear coleta, tipos, payload e persistência da NIP; definir lacunas de contrato sem implementar ainda, salvo autorização no fechamento.
- **INV-003:** validar cenários da regra no motor, incluindo dados ausentes, completos e contraditórios.
- **INV-004:** rastrear a mensagem apresentada ao usuário e sua correspondência com o estado da regra.
- **INV-005:** verificar contrato/paridade entre análise no navegador e no Worker.
- **INV-006:** inventariar consumidores de `overallSuccessRate` e determinar se tratam a heurística como probabilidade/resultado observado.
- **INV-007:** consolidar estado de CI, regressões e validação visual/E2E das correções recentes.

O backlog é uma fila de investigação, não autorização para executar todas as tarefas.

## 7. Modelo de encerramento por tarefa

- ID e pergunta investigada:
- Status final: PASS / FAIL / BLOCKED:
- Base/commit de referência:
- Arquivos e símbolos examinados:
- Evidências:
- Diagnóstico confirmado:
- Hipóteses não confirmadas:
- Alterações (se autorizadas):
- Testes/comandos executados e resultado:
- Riscos/pendências separados:
- Documento/índice atualizado:
- Próxima ação autorizada:
- Ações expressamente fora do escopo:

---
Este documento é o controle de escopo e sequência da investigação. Em caso de conflito com anotações antigas sobre a próxima ação, seguir a tarefa ativa registrada aqui e atualizar os documentos relacionados.
