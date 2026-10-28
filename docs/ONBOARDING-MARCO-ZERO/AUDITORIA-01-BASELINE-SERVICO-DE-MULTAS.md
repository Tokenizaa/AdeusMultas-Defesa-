# Auditoria 01 — Linha de base do serviço de multas no onboarding

**Marco:** Onboarding Marco Zero  
**Escopo:** fluxo de onboarding específico do serviço de multas, considerando a jornada de identificação e encaminhamento do caso. As etapas citadas neste documento são pontos examinados no fluxo, não um limite de escopo restrito às etapas 1–3 ou 1–4.  
**Natureza:** auditoria estática inicial do código e da experiência descrita.  
**Status:** linha de base registrada; correções ainda não implementadas nesta auditoria.  
**Regra:** este documento registra achados para orientar tarefas futuras. Não é certificado de funcionamento em produção.

## 1. Objetivo

Estabelecer a linha de base do onboarding referente ao serviço de multas do AdeusMultas, registrando riscos ao longo da jornada desse serviço e orientando correções pequenas, independentes e verificáveis. Esta auditoria não define regras universais para outros serviços eventualmente oferecidos pela plataforma.

A pergunta central não é apenas se os textos parecem corretos. É se a escolha do usuário, os dados coletados, as regras de encaminhamento e as fontes utilizadas permanecem coerentes até a análise jurídica.

## 2. Limites e evidências

Arquivos do repositório examinados durante a análise:

- src/components/onboarding/OnboardingWizard.tsx
- src/components/onboarding/steps/ServiceStep.tsx
- src/components/onboarding/steps/DefenseStageStep.tsx
- src/components/onboarding/steps/InfractionCategoryStep.tsx
- src/components/onboarding/steps/InfractionIdentificationStep.tsx
- src/core/onboarding/rules-matrix.ts
- src/data/knowledge-base.ts

A leitura foi feita por meio da integração com GitHub. Não foi executado neste trabalho um navegador, uma sessão real do onboarding, uma suíte de testes, uma compilação local nem uma consulta externa em tempo real. Assim, os achados abaixo distinguem leitura estática de comportamento ainda não verificado em execução.

## 3. Mapa parcial do fluxo do serviço de multas observado no código

O mapa abaixo registra as telas identificadas na leitura estática. Ele não limita a auditoria às primeiras etapas nem comprova que todos os caminhos condicionais do serviço tenham sido cobertos:

1. ServiceStep — escolha da situação/serviço.
2. DefenseStageStep — escolha da fase administrativa.
3. InfractionCategoryStep — escolha da categoria da infração.
4. InfractionIdentificationStep — dados de contato, veículo e autuação.
5. SpecificInfractionDataStep — perguntas específicas da infração.

O componente usa etapas internas 1, 2, 3, 4 e 5 para essa sequência, mas a tela de identificação exibe um contador visual que aparenta indicar “Passo 3 de 4”. A consistência entre progresso visual, etapas condicionais e navegação de retorno precisa ser testada.

## 4. Achados

### A01 — A seleção inicial deve permanecer ampla, sem determinar sozinha o procedimento

**Observado:** a situação de multa de trânsito tem um procedimento inicial mapeado em rules-matrix.ts e o wizard mantém estado para situação, fase e procedimento.

**Risco:** se o procedimento inicial for usado antes de a fase ser selecionada ou confirmada, a análise pode começar com uma rota incompatível com o caso.

**Ação proposta:** em tarefa própria, mapear as transições entre situação, fase e procedimento e provar, por testes, que a seleção da fase controla o encaminhamento final.

**Status:** precisa de validação comportamental; não declarar regressão confirmada apenas pela existência dos valores iniciais.

### A02 — Os rótulos “sem boleto” e “com boleto” não são critérios suficientes para classificar a fase

**Observado:** a primeira opção descreve a Notificação de Autuação como “Sem boleto”; a segunda descreve a Notificação de Imposição de Penalidade com código de barras/boleto.

**Risco:** o usuário pode não reconhecer o documento ou não ter recebido boleto/código de barras. A escolha visual pode não corresponder à fase real.

**Ação proposta:** priorizar o nome/tipo do documento e explicar a diferença entre autuação e imposição de penalidade. Tratar boleto como pista auxiliar, não como prova da fase.

**Status:** melhoria de conteúdo e fluxo recomendada.

### A03 — A tela de fase não deve antecipar conclusões jurídicas

**Observado:** os textos sugerem prazos abertos e encaminhamentos processuais com base na opção selecionada, antes da verificação dos documentos e datas do caso.

**Risco:** uma seleção declarada pelo usuário não comprova, por si só, o recebimento do documento, a abertura do prazo ou o cabimento de determinado recurso.

**Ação proposta:** usar linguagem de verificação (“vamos conferir o documento, o prazo e o órgão responsável”) e representar separadamente fase informada, fase confirmada e fase desconhecida.

**Status:** melhoria recomendada; confirmar a implementação do estado antes de alterar código.

### A04 — Advertência por escrito é um procedimento sujeito a requisitos, não uma fase universal

**Observado:** a advertência aparece ao lado das fases administrativas na seleção e há uma categoria dedicada relacionada ao art. 267 do CTB.

**Risco:** o usuário pode interpretar advertência como uma fase equivalente à Defesa Prévia ou ao recurso à JARI, ou entender que a conversão está garantida.

**Ação proposta:** manter o acesso, mas indicar que se trata de uma possibilidade específica cuja elegibilidade precisa ser verificada com os dados da infração e o histórico relevante.

**Status:** melhoria de conteúdo e classificação recomendada.

### A05 — A opção “Não tenho certeza da fase” precisa preservar a incerteza

**Observado:** o fluxo prevê uma opção para quem não sabe em qual fase está.

**Risco:** se a incerteza for convertida silenciosamente em uma fase padrão, a interface poderá apresentar um encaminhamento como se fosse confirmado.

**Ação proposta:** verificar o comportamento dessa opção no estado do wizard e no payload que chega à análise. Se não houver evidência suficiente, solicitar dados adicionais ou marcar a fase como não confirmada.

**Status:** precisa de teste específico.

### A06 — Categorias e códigos de infração dependem de um mapa local

**Observado:** InfractionIdentificationStep.tsx define CATEGORY_CODE_MAP e utiliza INFRACTION_CATALOG para filtrar opções de código de acordo com a categoria escolhida. O catálogo é importado do código do projeto.

**Risco:** o filtro pode limitar a seleção a uma lista local incompleta ou desatualizada. O fato de um código estar no catálogo não prova que o enquadramento corresponda aos fatos relatados pelo usuário.

**Ação proposta:** em tarefa isolada, comparar os códigos expostos com a fonte oficial aplicável, conferir a relação código/categoria e registrar a origem e a data de verificação. Não declarar que existe consulta oficial em tempo real sem evidência de implementação.

**Status:** origem local confirmada; sincronização/consulta em tempo real não comprovada por esta leitura.

### A07 — A promessa de OCR não corresponde ao payload visível na interface

**Observado:** handleFileUpload em InfractionIdentificationStep.tsx chama /api/ocr/analyze e constrói rawText a partir do nome do arquivo (“Arquivo de Notificação: ...”). O payload visível não contém os bytes do arquivo nem uma referência de upload demonstrada nessa chamada. A interface apresenta mensagens de processamento e preenchimento automático.

**Risco:** a chamada pode não estar entregando o conteúdo real do documento para extração. A mensagem apresentada ao usuário pode sugerir que o OCR leu o arquivo quando isso ainda não foi comprovado.

**Ação proposta:** esta é a primeira tarefa técnica recomendada. Inspecionar o contrato do endpoint e o processamento no backend; implementar o envio compatível com o contrato existente; validar a extração com um documento de teste; e só exibir sucesso após confirmar retorno válido. Preservar o preenchimento manual como fallback.

**Status:** discrepância entre a interface e o payload visível confirmada na leitura estática; funcionamento completo do backend não avaliado nesta auditoria.

### A08 — Campos obrigatórios e dados complementares precisam ser coerentes com a fase

**Observado:** a validação do formulário exige nome, telefone, placa, código da infração, local, data da ocorrência, órgão autuador e número do AIT. Datas de expedição, entrega e prazo final aparecem como campos complementares no formulário.

**Risco:** os campos obrigatórios garantem preenchimento mínimo, mas não confirmam a autenticidade do documento nem a fase administrativa. Dados de contato também não devem ser confundidos com evidência jurídica.

**Ação proposta:** não alterar o formulário inteiro nesta etapa. Primeiro, corrigir e testar o fluxo documental; depois, avaliar quais campos são realmente necessários em cada cenário, sem relaxar validações jurídicas essenciais.

**Status:** validação estática observada; adequação por cenário ainda precisa de definição e teste.

### A09 — O progresso visual não parece representar a sequência completa

**Observado:** o wizard roteia etapas internas adicionais, enquanto o formulário de identificação exibe “Passo 3 de 4” no trecho examinado.

**Risco:** o indicador pode confundir o usuário e prejudicar a percepção de avanço, especialmente quando etapas são puladas.

**Ação proposta:** corrigir somente após mapear todas as etapas condicionais e definir uma regra única para calcular o total exibido.

**Status:** discrepância aparente na leitura estática; validar todos os caminhos antes de corrigir.

## 5. Referência jurídica para revisão humana

A avaliação jurídica de conteúdo deve considerar a versão vigente das normas oficiais, e não apenas textos de interface ou registros locais do catálogo. Como ponto de partida, consultar o texto compilado do Código de Trânsito Brasileiro no Planalto:

- https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm

A referência ao CTB não substitui a conferência de resoluções do CONTRAN, regras aplicáveis ao órgão autuador e circunstâncias concretas. Este documento não constitui parecer jurídico sobre um caso individual.

## 6. Priorização proposta para o serviço de multas

| Ordem | Tarefa | Por que vem nesta ordem | Critério de saída |
|---|---|---|---|
| 1 | Contrato de upload/OCR | A interface promete extração documental e o payload visível não demonstra envio do documento. | Documento de teste processado de fato; dados extraídos conferidos; falhas não exibem sucesso falso. |
| 2 | Mapeamento situação → fase → procedimento | O encaminhamento depende de estados combinados. | Testes cobrindo cada fase, opção de incerteza e navegação de retorno. |
| 3 | Catálogo de códigos e fontes | Os códigos influenciam os dados jurídicos mostrados e as regras seguintes. | Fonte e data de verificação documentadas; códigos/categorias conferidos; limites de consulta explicitados. |
| 4 | Textos e progresso visual | O conteúdo deve refletir o comportamento real já verificado. | Linguagem sem conclusões antecipadas; contadores coerentes em todos os caminhos. |

Esta ordem é uma proposta. Cada tarefa deverá ser formalizada separadamente antes de implementação.

## 7. O que não foi feito

- Nenhum arquivo funcional da aplicação foi alterado como parte desta auditoria.
- Nenhum teste foi declarado como aprovado.
- Nenhuma consulta oficial em tempo real foi comprovada.
- Nenhuma alteração ou deploy em produção foi executado por esta auditoria.
- Não foi declarado selo verde.

## 8. Critério para validar o onboarding do serviço de multas

O selo verde só poderá ser concedido quando houver evidência registrada para, no mínimo:

- seleção e transições corretas para todas as situações e fases suportadas;
- estado de fase desconhecida preservado até haver evidência suficiente;
- catálogo e regras jurídicas com origem, versão e atualização verificáveis;
- upload/OCR real, tratamento de falhas e revisão dos dados extraídos;
- validação coerente dos campos obrigatórios por cenário;
- navegação e indicador de progresso corretos em todos os caminhos;
- testes automatizados pertinentes aprovados e fluxos críticos verificados em execução;
- nenhuma regressão conhecida sem tratamento;
- registro dos SHAs e dos resultados reais de validação.

## 9. Decisão para a próxima tarefa do serviço de multas

**Próxima tarefa recomendada: Tarefa 001 — verificar e corrigir o contrato de envio e processamento documental do OCR.**

Escopo restrito ao fluxo documental e seus testes. Não alterar simultaneamente o mapeamento de fases, o catálogo de infrações ou todos os textos do onboarding.

---
**Registro de status:** baseline criada a partir de leitura estática. A implementação e a validação de cada achado devem ser documentadas em tarefas posteriores.
