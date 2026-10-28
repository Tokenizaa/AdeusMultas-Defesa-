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

**Próximo passo imediato:** o usuário está prestes a testar manualmente a etapa de perguntas específicas. Aguardar o resultado dele antes de escolher a próxima correção. Registrar o que aconteceu com precisão: se os campos opcionais permitem continuar vazios; se o botão 🧪 preenche todos os campos; se a data aparece; se a data pode ser alterada e continua visível após interação/retorno; e se não há erros no console.

## 5. Workflows: verificar estado atual antes de agir

Após o commit 396a7aae, foram iniciados:
- [CI/CD Pipeline — run 40782524806](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524806)
- [Cloudflare Deploy — run 40782524758](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524758)

**Estado consultado em 2026-10-28:**
- CI/CD run [40782524806](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524806): **FAIL**; job `test-unit` falhou no passo Vitest. Typecheck/build foram pulados. A listagem de jobs não mostrou a mensagem interna do teste; abrir logs do workflow para identificar o teste e a causa.
- Cloudflare Deploy run [40782524758](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524758): **FAIL**; `Discover canonical E2E matrix (read-only)` falhou e o build/deploy foi pulado. Abrir o log desse passo e confirmar a mensagem exata.
- Após os commits de documentação, CI/CD runs [40782882801](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782882801) (commit `f479d3e1`) e [40782928525](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782928525) (commit `a6487630`) estavam `in_progress` na última consulta. Consultar o status final; não presumir sucesso.

Há uma falha de descoberta de matriz E2E em execuções anteriores, com mensagem relatada semelhante a `Expected 10 canonical scenarios for DEFESA_PREVIA, found 0`. Não atribuir essa mensagem ao run atual sem ler o log atual. Não desativar a verificação nem inventar testes falsos.

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
