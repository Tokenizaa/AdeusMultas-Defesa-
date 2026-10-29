# HANDOFF CANÔNICO — Continuidade entre agentes

> **Leia este documento antes de executar qualquer tarefa neste repositório.** Ele foi escrito para que outro agente possa assumir o trabalho sem depender do histórico do chat. A documentação versionada e o estado real do GitHub são a fonte de continuidade; mensagens de conversa são contexto auxiliar.

## 1. Identificação e objetivo do trabalho

- **Repositório:** [Tokenizaa/AdeusMultas-Defesa-](https://github.com/Tokenizaa/AdeusMultas-Defesa-)
- **Branch canônica de trabalho:** `main`
- **Produção:** https://adeusmulta.defesai.com.br/
- **Marco de documentação:** `docs/ONBOARDING-MARCO-ZERO/`
- **Objetivo atual:** estabilizar e validar o onboarding do serviço **Multa de Trânsito**, uma tarefa por vez, com evidências reproduzíveis. A meta não é apenas fazer as telas avançarem: é comprovar consistência de dados, experiência compreensível, persistência/encaminhamento corretos e segurança jurídica dos textos.
- **Estado de validação:** o projeto **não está certificado de ponta a ponta**. Não declarar o onboarding aprovado/selo verde sem concluir a matriz de testes e registrar as evidências.

## 2. Protocolo obrigatório para qualquer agente

1. Leia este arquivo, o `README.md` deste diretório e o registro da tarefa atual antes de mexer no código.
2. Confira o estado real de `main`, os commits recentes e os workflows associados ao último commit. Não trate status antigos como atuais.
3. Trabalhe em **uma tarefa delimitada por vez**, com critérios de aceitação antes da implementação.
4. Inspecione os arquivos e contratos diretamente relacionados; faça a menor alteração suficiente. Não faça refatorações laterais.
5. Preserve arquivos de ambiente e segredos. **Nunca apague, recrie, imprima ou sobrescreva arquivos `.env`**, nem altere secrets/configurações externas sem autorização explícita. Não exponha tokens, chaves ou credenciais em logs/documentos.
6. Não desative, enfraqueça, remova ou contorne testes/workflows para obter um resultado verde. Se um pipeline falhar por contrato/infraestrutura, investigue a causa real e documente-a.
7. Separe sempre: **confirmado por leitura de código**, **confirmado por teste automatizado**, **observado manualmente**, **deploy confirmado** e **hipótese/pêndencia**.
8. Não declare PASS porque o código parece correto, compila ou a rota abre. Informe comando/teste, resultado e link do workflow quando disponível. Se não executado, marque **BLOCKED/PENDENTE**; se falhar, **FAIL**.
9. Não publique alterações em produção nem execute ações externas irreversíveis sem autorização explícita. O trabalho de código segue a prática documentada do repositório; antes de push/deploy, confirme o workflow e o escopo.
10. **Ao finalizar cada tarefa**, atualize seu documento de tarefa e o estado/índice deste diretório com arquivos alterados, decisões, testes reais, falhas, pendências, SHA/link do commit e a próxima ação autorizada. A mensagem do commit deve resumir a mudança; o documento versionado é o handoff detalhado.
11. Faça commit/push apenas da tarefa concluída e relacionada. Depois, confira o SHA de `main` e o resultado de CI/deploy. Não diga que o deploy terminou enquanto o workflow não tiver conclusão de sucesso.
12. Se o usuário estiver fazendo um teste manual, registre o resultado exatamente como relatado, identificando ambiente (local/produção), navegador/caminho e valores observados. Não converta relato de teste local em evidência de produção.

## 3. Mapa conhecido do onboarding de multas

Este é um mapa inicial, não prova de que todos os caminhos condicionais foram testados.

1. **Serviço/situação** — `src/components/onboarding/steps/ServiceStep.tsx`
2. **Fase administrativa** — `src/components/onboarding/steps/DefenseStageStep.tsx`
3. **Categoria da infração** — `src/components/onboarding/steps/InfractionCategoryStep.tsx`
4. **Identificação da autuação, contato e veículo** — `src/components/onboarding/steps/InfractionIdentificationStep.tsx`
5. **Perguntas específicas da infração** — `src/components/onboarding/steps/SpecificInfractionDataStep.tsx`
6. **Orquestração, estado, navegação e persistência do wizard** — `src/components/onboarding/OnboardingWizard.tsx`
7. **Regras de encaminhamento** — `src/core/onboarding/rules-matrix.ts` e testes relacionados.
8. **Catálogo/base de conhecimento local** — `src/data/knowledge-base.ts` e módulos relacionados. A presença de dados locais não prova consulta oficial em tempo real.
9. **Etapas posteriores** — OCR/leitura documental, envio/persistência, análise técnica/jurídica, eventual geração de defesa/documentos e integrações: precisam ser mapeadas nos componentes e contratos reais antes de declarar o fluxo completo.

### Fluxo e distinções importantes

- A sequência acima é a jornada comum de multas; serviços especializados podem pular ou adaptar etapas. Validar cada caminho separadamente.
- Situação escolhida pelo usuário, fase informada, fase confirmada e procedimento calculado são conceitos diferentes. Não inferir fase definitiva só pela presença/ausência de boleto.
- Fase incerta deve seguir para análise técnica, sem presumir JARI.
- Mudança de categoria deve reconciliar o código e os metadados derivados; nunca misturar código, artigo, descrição, gravidade, pontos e valor de categorias diferentes.
- Dados ausentes/desconhecidos não equivalem a zero, inexistência ou irregularidade comprovada.
- Datas sintéticas do botão de teste são fixtures de interface, não prazos jurídicos nem prova de fatos reais.
- Textos jurídicos devem ser condicionais e verificáveis. Não afirmar que uma aferição de radar com mais de 12 meses invalida automaticamente a medição; conferir os documentos e a regra aplicável antes de avaliar relevância.

## 4. Histórico e estado confirmado até o handoff

### Correção 01 — consistência entre fase, categoria e etapa de identificação

Registro: [CORRECAO-01-CONSISTENCIA-ETAPAS-2-A-4.md](./CORRECAO-01-CONSISTENCIA-ETAPAS-2-A-4.md).

Principais correções registradas:
- um único resolvedor para alinhar procedimento exibido e persistido;
- fase incerta encaminhada para análise técnica;
- reconciliação do código e metadados ao trocar categoria;
- reinicialização de estado residual ao selecionar o serviço geral de multas;
- contador visual coerente com as quatro etapas iniciais.

CI da correção 01 foi registrada como aprovada no workflow [40771746919](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40771746919). Isso não certifica as etapas posteriores nem o fluxo completo.

### Correção 02 — botão de dados de teste da identificação

Registro: [CORRECAO-02-PREENCHIMENTO-TESTE-FORMULARIO.md](./CORRECAO-02-PREENCHIMENTO-TESTE-FORMULARIO.md).

- Fixture contextualizada por serviço + fase + categoria em `src/components/onboarding/testFillData.ts`.
- O usuário informou que executou localmente o botão da etapa 4 e viu todos os campos, inclusive datas, preenchidos. Essa é evidência manual local relatada, não validação de produção.
- Os testes unitários cobrem regras de coerência e preenchimento da fixture; o agente seguinte deve conferir a execução atual de testes/workflows e se o clique real continua funcionando.
- Não confundir fixture sintética com caso real nem enviar dados fictícios a uma análise jurídica real.

### Correção 03 — perguntas específicas de radar/velocidade (alteração mais recente)

Registro detalhado e estado de validação: [CORRECAO-03-PERGUNTAS-RADAR-INMETRO.md](./CORRECAO-03-PERGUNTAS-RADAR-INMETRO.md).

Commit: [396a7aae30a0987f5ccd7adf8aa39896bd36d481](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/396a7aae30a0987f5ccd7adf8aa39896bd36d481).

Arquivo: `src/components/onboarding/steps/SpecificInfractionDataStep.tsx`.

Alterações registradas:
- Data da aferição do INMETRO identificada como opcional, com instrução para deixar em branco se não estiver disponível.
- Número do equipamento/laudo identificado como opcional.
- Removida a alegação categórica de que aferição superior a 12 meses seria, por si só, argumento forte.
- Corrigido o binding do input HTML `type="date"`: passa a receber e salvar diretamente `YYYY-MM-DD`, em vez de converter para `dd/mm/yy` e tentar interpretar ISO como formato brasileiro.
- Os testes unitários da fixture de velocidade verificam limite, velocidade medida/considerada, data ISO e identificador sintético. Isso **não substitui** um teste real da interface.

**Estado atualizado:** a etapa de radar permanece com teste manual do usuário pendente. Em seguida foi investigado e corrigido o problema de retomada automática do wizard; ver seção abaixo. Não marcar o campo de radar nem o onboarding completo como aprovados sem evidência manual/E2E.

### Correção 04 — navegação, início manual, retomada e reinício

Registro: [CORRECAO-04-NAVEGACAO-INICIO-RETOMADA.md](./CORRECAO-04-NAVEGACAO-INICIO-RETOMADA.md).

Diagnóstico confirmado: `OnboardingWizard.tsx` inicializava `step` com `savedState?.step ?? 1`, restaurando a última etapa sem pedir decisão ao usuário. Além disso, o formulário era salvo em sessionStorage e localStorage, mas a leitura só consultava sessionStorage e a função de limpeza só removia a cópia da sessão.

Implementação commitada:
- nova tela `src/components/onboarding/OnboardingStartScreen.tsx`;
- entrada manual com **Começar**;
- se houver rascunho, opções **Continuar de onde parei** e **Começar do zero**;
- botão **Recomeçar do zero** dentro do wizard, com confirmação;
- reset do estado do wizard e limpeza das duas chaves de rascunho, sem excluir conta nem casos remotos;
- fallback de leitura do formulário para a chave local existente;
- validação do número da etapa restaurada;
- testes de renderização SSR da tela de início/retomada e atualização da regressão de copy do INMETRO.

Commits:
- [ee66b58c](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/ee66b58cc8a1048eedf8e03abf546363b0e68563)
- [473d1576](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/473d1576e296691acf319b5cd7273087b1d5a740)
- [ef0f97ab](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/ef0f97abc94b5e6962e1e47c83d2850908a2005b)
- [b3555f7d](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/b3555f7decdc7722a2447948598ae8451e185ae9)
- [e4b59ed7](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/e4b59ed7ebb7c50e2317d4adacb57453c5ba67ad)
- [e57ddbf6](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/e57ddbf606e4474291bf516b98f7c3210f491cc3)
- [25e33671](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/25e33671c0d138b87263c7ef34fe9b64209a8e30)

Ainda pendente: validar em navegador os cliques reais, avanço/retrocesso, recarga, retomada e reinício. CI do commit e57ddbf6 passou (Vitest, typecheck e build) no [run 40786762859](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786762859); CI do commit 25e33671 passou em Vitest, typecheck e build no [run 40786938357](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786938357). O deploy continua bloqueado no [run 40786938367](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786938367), porque a descoberta lista apenas 3 testes Playwright e o gate exige 70 cenários canônicos reais. Não desativar esse gate.

## 5. Workflows: verificar estado atual antes de agir

Após o commit 396a7aae, foram iniciados:
- [CI/CD Pipeline — run 40782524806](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524806)
- [Cloudflare Deploy — run 40782524758](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524758)

**Estado consultado em 2026-10-28:**
- [CI/CD Pipeline — run 40786343544](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786343544) falhou porque um teste ainda esperava a frase antiga `argumento forte para questionar a validade da medição do radar`, removida pela correção 03. A asserção foi atualizada no commit e4b59ed7; conferir o resultado do workflow desse commit.
- [Cloudflare Deploy — run 40786343401](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786343401) falhou no passo `Discover canonical E2E matrix (read-only)`; listou apenas 3 testes e esperava 10 cenários por serviço (70 no total), então o build/deploy foi pulado.
- [CI/CD Pipeline — run 40786481945](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786481945) e [Cloudflare Deploy — run 40786481969](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786481969), ambos do commit e4b59ed7, estavam `queued` na última consulta. Consultar o estado final.

**Regra de deploy:** não tentar contornar a matriz E2E nem publicar enquanto o gate de deploy falhar. Investigar o contrato esperado dos cenários e criar testes verdadeiros se isso fizer parte da tarefa autorizada.

### Correção 05 — comunicação da etapa 5

Na etapa 5, o componente `src/components/onboarding/steps/SpecificInfractionDataStep.tsx` recebeu instruções mais claras para limite da via, velocidade medida e velocidade considerada, além de um aviso conjunto para deixar data/identificação do INMETRO em branco quando indisponíveis. IDs dos cinco inputs e do botão de análise foram preservados; não foram alteradas regras de cálculo nem o fluxo de navegação.

A regressão de copy verifica os textos e IDs no HTML renderizado. O cenário canônico E2E-DEFESA_PREVIA-10 foi ampliado para clicar na análise com opcionais vazios, voltar à etapa 5, preencher data/identificação e avançar novamente; a gravação final é interceptada para não criar casos reais. A execução e o resultado do workflow ainda precisam ser confirmados antes de marcar PASS. Registro: [CORRECAO-05-COMUNICACAO-ETAPA-5.md](./CORRECAO-05-COMUNICACAO-ETAPA-5.md).

## 6. Matriz mínima para a etapa atual (radar/velocidade)

Executar e registrar, quando aplicável:

- [ ] Com limite e velocidades preenchidos, a tela aceita valores válidos e mostra coerentemente os campos derivados.
- [ ] Data de aferição em branco não bloqueia continuar.
- [ ] Número do equipamento/laudo em branco não bloqueia continuar.
- [ ] Botão de dados de teste preenche limite, velocidade medida, velocidade considerada, data ISO e identificador fictício do radar.
- [ ] O input `type="date"` mostra a data gerada; editar a data atualiza o estado sem apagar o valor.
- [ ] Retornar à etapa e avançar novamente não perde nem corrompe valores.
- [ ] Nenhuma mensagem sugere que a falta de dados do INMETRO prova irregularidade.
- [ ] Testes automatizados relevantes, typecheck e build executados após o commit e seus resultados confirmados.
- [ ] Deploy em produção confirmado pelo workflow e smoke test autorizado, se aplicável.

Marque cada item como **PASS**, **FAIL** ou **BLOCKED**, com evidência. Não marque o conjunto como concluído se houver itens bloqueados.

## 7. Próximas ações em ordem

1. Receber/registrar o resultado do teste manual que o usuário fará agora.
2. Consultar os workflows 40782524806 e 40782524758; identificar o resultado real e abrir logs de jobs com falha.
3. Corrigir apenas problemas comprovados. Se a falha for na matriz E2E, investigar o contrato e a intenção dos testes antes de alterar workflow.
4. Adicionar/ajustar teste de componente/E2E para o botão da etapa 5, caso a infraestrutura existente permita e o teste manual revele lacuna. Não alegar validação de clique se só a fixture foi testada.
5. Atualizar o registro desta correção e o README com resultados e commit(s).
6. Só então selecionar a próxima tarefa do onboarding a partir de evidências, sem pular direto para refatorações amplas.

## 8. Modelo obrigatório de fechamento de tarefa

Ao concluir cada tarefa, acrescentar ao documento de tarefa e/ou a um registro sequencial:

- ID/título e objetivo;
- estado anterior e SHA de base;
- diagnóstico comprovado e arquivos alterados;
- decisão tomada e motivo;
- testes realmente executados (comandos, ambiente, resultado e links);
- validação manual (quem relatou, local/produção e comportamento observado);
- workflow CI e deploy (IDs, status final e logs importantes);
- falhas e riscos que continuam abertos;
- commit SHA/link;
- próxima ação autorizada e o que **não** deve ser feito ainda.

## 9. Regra de continuidade

Se o histórico do chat não estiver disponível, não peça ao usuário para reexplicar o projeto antes de ler este documento e os registros citados. Primeiro reconstrua o estado usando `main`, commits, workflows e documentação. Pergunte apenas sobre decisões ou observações que não estejam documentadas — por exemplo, o resultado de um teste manual recém-executado. Nunca invente resultados ausentes.


## 10. Correção 07 — coleta de dados e integridade da execução da análise

Registro: [CORRECAO-07-ANALISE-INCONCLUSIVA.md](./CORRECAO-07-ANALISE-INCONCLUSIVA.md).

- Confirmado por leitura do código: hasPreviousInfractionsLast12Months era solicitado apenas na categoria conversao_advertencia; no fluxo normal de excesso de velocidade, o motor exigia o campo para avaliar a regra de conversão, mas o formulário não o perguntava.
- Confirmado por leitura do código: se ExpertRuleEngine.evaluate() lançasse exceção, AnalysisProcessingStep apenas escrevia no console e ainda chamava onComplete(), avançando para o resultado inicial sem uma análise nova.
- Alteração registrada no commit atual: coletar o histórico com opção “Não sei / Não informado” (sem presumir ficha limpa), exibir a contagem real de regras avaliadas e lacunas legíveis, e bloquear o avanço após falha do motor.
- Validação automatizada: pendente do CI acionado pelo commit; não declarar PASS antes dos resultados.
- Teste manual/E2E: pendente; repetir excesso de velocidade com histórico “Sim”, “Não” e “Não sei”, e validar estado de erro sem avançar para o resultado.
- Produção: nenhum deploy iniciado; o commit não usa o marcador [DEPLOY-PRODUCTION].


## 11. Correção 08 — coerência do resultado inconclusivo

Registro: [CORRECAO-08-CONSISTENCIA-RESULTADO-INCONCLUSIVO.md](./CORRECAO-08-CONSISTENCIA-RESULTADO-INCONCLUSIVO.md).

- Confirmado por leitura estática: o resumo técnico dizia que o motor não identificou inconsistências sempre que não havia achados, mesmo com lacunas que impediam avaliar uma ou mais hipóteses.
- Confirmado por leitura estática: a tela contava pendências apenas por `evaluatedRules` e usava `rule.reason` mesmo quando `dataGaps` indicava insuficiência para a mesma regra.
- Correção em `main`: resumo inconclusivo explícito quando há lacunas; contagem de pendências pela união dos IDs de lacunas e regras DATA_GAP; mensagem de lacuna prevalece sobre texto de PASS para a mesma regra.
- Testes de regressão adicionados no motor e na renderização real da tela. CI PASS: runs [40939043422](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40939043422) e [40939108423](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40939108423) concluíram Vitest, typecheck e build com sucesso.
- O workflow Cloudflare [40939043366](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40939043366) concluiu com sucesso no commit de código `eeab356709d64e0e873a9e682dd9ba8ae2c162bf`; ainda não houve confirmação visual do comportamento do caso específico em produção.


## Registro de validação — Correção 07

- Primeiro CI do commit 9911f2a9: [run 40822977925](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40822977925) falhou no arquivo de regressão: 54 arquivos passaram e 1 falhou; 424 testes passaram e 2 falharam.
- Causas observadas nos logs: a renderização SSR do React separou texto estático e valores dinâmicos com comentários HTML, e um teste antigo ainda esperava a frase do checkbox anterior. Não houve evidência nesse run de falha do motor jurídico; o conjunto de testes não concluiu.
- Ajustes feitos neste follow-up: normalizar os comentários de SSR nas asserções, atualizar a expectativa para o texto da seleção tri-state e corrigir singular/plural na contagem exibida.
- Novo CI: pendente de conclusão. Vitest, typecheck e build não podem ser declarados aprovados até o workflow terminar.


## Achado adicional — elegibilidade da regra de velocidade

- Inspeção confirmou que RULE_INMETRO_CONSIDERED_SPEED_ERROR podia produzir ARG-005, mas o filtro de elegibilidade dependia de recommendedArgumentCodes no catálogo; ARG-005 estava ausente dos quatro códigos de velocidade que a regra avalia.
- Correção neste commit: incluir ARG-005 em 745-50, 746-30, 745-70 e 747-10 e adicionar regressão com dados sintéticos (78 km/h medida, 71 km/h considerada, limite de 60 km/h), verificando status FAIL e presença da tese na análise.
- Validação anterior: CI [40823075337](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40823075337) passou em Vitest, TypeScript e build antes desta correção adicional. O novo CI permanece pendente.
- Produção segue bloqueada; nenhum commit usa [DEPLOY-PRODUCTION].


## Correção de precisão — regra ARG-005

- Revisão técnica identificou que o teste inicial de elegibilidade usava um caso que, na verdade, tinha cálculo e código compatíveis; habilitar ARG-005 sem corrigir a lógica poderia introduzir falso positivo.
- A regra agora reutiliza calculateConsideredSpeed, compara a faixa do código com a faixa calculada e a faixa informada, e só retorna ARG-005 quando o código é mais gravoso que a faixa sustentada pelos dados.
- Foram adicionados dois cenários: caso válido não deve gerar ARG-005; caso com código 746-30 e velocidade considerada calculada em faixa inferior deve gerar ARG-005.
- CI anterior [40823075337](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40823075337) passou em Vitest, TypeScript e build antes desta precisão adicional. Novo CI pendente; produção permanece bloqueada.


## Registro de validação — normalização do código de velocidade

- CI [40823383320](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40823383320) falhou em um teste: o motor passa códigos normalizados sem hífen ao contexto da regra, enquanto o mapa inicial da regra usava chaves com hífen.
- Correção neste follow-up: normalizar o código antes de consultar a faixa; atualizar versão do motor para 2.7.1 e versão da regra para 3.
- Novo CI ainda pendente. Não declarar PASS antes do resultado. Nenhum deploy de produção foi autorizado.


## 12. Correção 09 — coerência do resultado, velocidade e advertência

Registro detalhado: [CORRECAO-09-COERENCIA-RESULTADO-VELOCIDADE-ADVERTENCIA.md](./CORRECAO-09-COERENCIA-RESULTADO-VELOCIDADE-ADVERTENCIA.md).

### Contexto observado

O usuário apresentou a saída do caso AIT **5955616144**, placa **NAM9X73**, infração Art. 218, I do CTB, código 745-50. O resultado afirmava que os requisitos do art. 267 estavam atendidos, embora o histórico do condutor precisasse ser tratado como dado declarado/confirmado; também mostrava 108 km/h medidos, 100 km/h considerados e limite de 100 km/h, enquanto uma verificação apontava possível incompatibilidade entre esses valores e o código. A lista de regras não aplicáveis mostrava categorias internas como `[alcoolemia]` e `excesso_velocidade`.

Essa saída foi relatada pelo usuário; não foi capturada por E2E visual independente pelo agente.

### Mudanças em `main`

Arquivo: `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`.

- ARG-005 compara o valor considerado com o limite informado. Se o valor considerado não supera o limite, a mensagem identifica que os dados não explicam o enquadramento por excesso de velocidade e orienta conferir limite, código e notificação original. Uma conta de margem compatível não é tratada como confirmação automática da infração.
- ARG-051 diferencia falta de informação de declaração do condutor. A ausência do histórico não vira “sem infrações”; a declaração exige confirmação no prontuário oficial e recebe nível de confiança médio.
- As mensagens de regras não aplicáveis conhecidas são traduzidas para linguagem simples na camada de apresentação, sem alterar a lógica/status do motor.
- Foram adicionados testes de regressão para velocidade/limite e para a informação do histórico. Uma tentativa de acrescentar um teste específico para a tradução de regras não aplicáveis foi bloqueada pela ferramenta; não afirmar que esse teste existe.

### Commits e evidências

- Commit intermediário `798951c26c594cb187008bfb43d4d80dad00fa8f`: falhou por erro de sintaxe introduzido na edição; não é estado funcional de referência.
- `fc0bcf04231ce4cac944b6526f8d35253472515a`: corrigiu a sintaxe; CI e deploy concluíram com sucesso.
- `a25af2bf008ef4e6ecb62a252f339862081ad82b`: tri-state/declaração de histórico; CI e deploy concluíram com sucesso.
- `1b5c4c9975d77943d71544efd8cfbcfaa5e3c3d3`: testes adicionados; CI falhou em uma asserção excessivamente abrangente.
- `82d3b2738ebd6286b5475ed950aa59df4f7c8d44`: ajustou a apresentação do prefixo DECLARADO; CI ainda falhou na asserção anterior.
- `f7f1a062557d48d18fcea4dc13768a85e67c4065`: corrigiu a asserção; CI e deploy concluíram com sucesso.
- **Estado mais recente verificado:** `1919b7847383e729f8d8e04de892967cf69f3eef`. CI [40941464997](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40941464997) e Cloudflare Deploy [40941465159](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40941465159) concluíram com sucesso.

### Pendências — não marcar PASS

- [ ] Validar visualmente em produção o AIT 5955616144 e confirmar o conteúdo dos cards principais, a contagem e a lista detalhada.
- [ ] Confirmar CI do teste dedicado da correção 11 e validar visualmente as mensagens de regras não aplicáveis.
- [ ] Corrigir o texto estático `whatWeChecked` de ARG-005, que ainda pode sugerir desconto fixo de 7 km/h mesmo para faixas acima de 107 km/h; uma tentativa de edição foi bloqueada e não foi aplicada.
- [ ] Não afirmar que a análise prova nulidade ou garante conversão em advertência. Confirmar os dados oficiais e o prontuário.
- [ ] Não declarar onboarding certificado: a validação visual/E2E geral e a matriz canônica permanecem pendentes.

### Próxima ação

Retomar pelo teste visual/E2E do resultado publicado para o caso informado; registrar ambiente, dados observados e evidência. Se houver divergência, corrigir somente o problema reproduzido, adicionar regressão, rodar CI e conferir o deploy. Não pular para refatoração ampla.


## 13. Correção 10 — card de prazo não refletia a evidência de ARG-049

Registro: [CORRECAO-10-ARG049-CARD-PRAZO.md](./CORRECAO-10-ARG049-CARD-PRAZO.md).

- Nova evidência relatada pelo usuário: AIT 5566147171, placa FAH3X90. O detalhe de verificações calculava 35 dias entre infração e expedição, mas o card principal de prazo dizia que não havia dados suficientes. A mesma saída ainda exibia a frase de que os requisitos do art. 267 estavam atendidos e nomes internos de famílias em regras não aplicáveis.
- Causa estática identificada: a regra de decadência declara `relatedArguments: ['ARG-048', 'ARG-049']`, mas a camada de apresentação tinha explicação específica apenas para `ARG-048`. Quando o argumento recomendado era `ARG-049`, o card principal usava o fallback genérico, embora o detalhamento exibisse o cálculo de prazo.
- Correção implementada em `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`: `ARG-049` reutiliza a explicação e a evidência de `ARG-048`.
- Testes adicionados em `src/components/onboarding/steps/onboarding-copy-regression.test.tsx`: card principal para `ARG-049` e declaração de histórico do art. 267 pendente de confirmação.
- Commit de código: `1f898edf1ffe5a603ce929dceaea0e000269b923`. CI [40942733942](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40942733942) e deploy [40942733911](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40942733911) concluíram com sucesso para o commit `c4a388e40c3e43d9749071eff4da28d7f63bef63`, que inclui o mapeamento e os testes de regressão.
- **Não presumir que a causa do texto antigo de ARG-051 e das famílias técnicas é a mesma do ARG-049.** Validar a versão realmente servida e executar uma nova análise depois do deploy.
- Pendências: CI do SHA mais recente; deploy do código mais recente; E2E visual; confirmar texto de ARG-051; confirmar mensagens amigáveis de NOT_APPLICABLE; confirmar coerência da contagem de verificações.

### Próxima ação obrigatória

1. Consultar os workflows do SHA atual (incluindo os commits de testes e documentação).
2. Confirmar que o deploy contém o mapeamento de `ARG-049`.
3. Abrir a aplicação publicada e rodar uma nova análise de teste: o card principal de prazo deve apresentar o mesmo cálculo que o detalhe; o art. 267 deve dizer “declarado, pendente de confirmação” quando essa for a origem dos dados; regras não aplicáveis devem usar linguagem simples.
4. Se os textos persistirem, rastrear o payload real e o bundle servido antes de outra alteração. Não declarar E2E PASS sem evidência de navegador.


## 14. Correção 11 e auditoria preventiva integrada — 2026-10-29

Registro da correção: [CORRECAO-11-ROTULOS-FAMILIAS-NAO-APLICAVEIS.md](./CORRECAO-11-ROTULOS-FAMILIAS-NAO-APLICAVEIS.md). Auditoria integrada: [AUDITORIA-02-PREVENCAO-FLUXO-ANALISE.md](./AUDITORIA-02-PREVENCAO-FLUXO-ANALISE.md).

### Correção preventiva implementada

- O classificador declara onze famílias; o formatador de verificações não aplicáveis traduzia apenas parte delas. A interface podia exibir nomes internos como `circulacao`, `capacidade` e `lotacao`.
- O mapa de famílias e categorias foi completado e a lista passou a usar pontuação natural.
- Teste de renderização adicionado em `onboarding-copy-regression.test.tsx`, exigindo texto humanizado e proibindo os identificadores internos da fixture.
- Commit de código: `9402991fe5125e8ebc49899675acd794db2fa09d`; commit de teste: `d584900903593a54dc1c1c4afbaff22edc59768c`.
- **CI do SHA atual não confirmado.** Não declarar PASS e não publicar em produção.

### Conclusões da leitura integrada atual

- O Worker anônimo atualmente preserva datas de notificação, histórico e flags de evidência; não reutilizar como atuais os achados antigos que afirmavam descarte geral desses campos.
- `AnalysisProcessingStep.tsx` atualmente impede avanço quando o motor falha; o achado histórico de avanço automático após exceção precisa ser marcado como superado.
- `FreeAnalysisResultStep.tsx` atualmente não inventa artigo/código/valor/pontos nos campos de detalhe quando os dados estão ausentes.
- Risco pendente: o fluxo executa análise no navegador e também no Worker; a resposta do servidor pode substituir a análise local. Falta teste de contrato/paridade para demonstrar equivalência para entradas idênticas.
- Risco pendente de maior prioridade: `notificationDeliveryDate` tem campo visível na identificação, mas a regra `RULE_CONSTITUTIONAL_DUE_PROCESS` marca PASS com base na data de expedição e entrega da Notificação de Autuação. Isso não demonstra, por si só, a expedição da Notificação de Imposição de Penalidade; revisar a semântica legal e separar os dados das duas notificações. Não reutilizar o achado histórico de “campo inexistente”.
- Risco pendente: inventariar todos os consumidores de `overallSuccessRate`; o valor do motor é uma heurística determinística e não uma probabilidade estatística calibrada.

### Próxima ação autorizada

1. Consultar o resultado do CI para `d584900903593a54dc1c1c4afbaff22edc59768c`.
2. Revisar a regra de dupla notificação com fontes jurídicas oficiais e corrigir o contrato de dados para não concluir PASS com base apenas na entrega da Notificação de Autuação.
3. Criar testes sintéticos de paridade navegador/Worker e inventariar consumidores do score.
4. Manter a validação E2E/visual como pendente até existir evidência real. Não executar escrita persistente contra produção sem autorização explícita.
