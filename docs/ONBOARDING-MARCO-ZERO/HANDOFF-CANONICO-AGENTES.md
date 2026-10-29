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

A regressão de copy foi ampliada para verificar os textos e os IDs no HTML renderizado. Isso **não comprova o clique/avanço real em navegador**. Executar os dois cenários E2E/manual — opcionais vazios e todos preenchidos — antes de marcar PASS. Registro: [CORRECAO-05-COMUNICACAO-ETAPA-5.md](./CORRECAO-05-COMUNICACAO-ETAPA-5.md).

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
