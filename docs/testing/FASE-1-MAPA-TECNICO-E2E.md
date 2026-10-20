# Fase 1 — Mapa técnico e matriz preliminar dos 70 casos E2E

**Status da fase:** concluída como análise e especificação; bloqueios técnicos identificados e documentados. Não significa que os bloqueios do produto estejam corrigidos nem que a suíte esteja pronta para executar.  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-` · **branch:** `main`  
**Escopo executado:** leitura de código e documentação versionados em `main`, definição dos contratos conhecidos, matriz dos 70 identificadores e critérios de entrada para a Fase 2.  
**Não realizado:** criação/execução de testes E2E, build, typecheck, alteração de código de produto, acesso/escrita no banco, alteração de ambiente ou pagamento.

## 1. Resultado da Fase 1

A análise confirmou que a suíte deve ser construída em sete arquivos independentes, com dez identificadores fixos por serviço, e executada depois em lotes de dez casos por serviço. Os cinco usuários são identidades sintéticas reutilizáveis em jornadas cruzadas, não categorias exclusivas de teste.

A matriz abaixo é a **especificação de intenção dos casos**. Passos de interface, seletores, valores de entrada, chamadas e oráculos finais só podem ser implementados depois que cada comportamento estiver confirmado nos contratos ativos. Onde a implementação ou o ambiente não oferece condição segura para validar um resultado, o caso permanece bloqueado; não se deve inventar uma rota, mockar silenciosamente a integração ou contornar proteções.

## 2. Fontes canônicas examinadas

| Área | Arquivo(s) de referência em `main` | Papel na análise |
|---|---|---|
| Governança | `AGENTS.md` | `main` única; não criar branches/PRs; proteger produção, credenciais e dados |
| Especificação E2E | `docs/testing/E2E-CERTIFICACAO-CANONICA.md` | 7 serviços × 10 casos, isolamento, evidências e estados PASS/FAIL/BLOCKED |
| Tipos de domínio | `src/types/index.ts` | `ProcedureType`, `CaseStatus`, status de análise, pagamento e documento |
| Tipos comerciais | `src/types/commercial.ts` | `CommercialServiceType` e catálogo de serviços pagos |
| Matriz de onboarding | `src/core/onboarding/rules-matrix.ts` | Situações, fases processuais, procedimentos e campos exigidos |
| Interface/estado | `src/components/onboarding/OnboardingWizard.tsx` | Etapas ativas do wizard, persistência de metadados e derivação do procedimento |
| Autenticação no onboarding | `src/components/onboarding/AccountVerificationGate.tsx`, `src/core/auth/AuthContext.tsx` | Cadastro/login e transição para usuário autenticado |
| Interface de checkout | `src/components/onboarding/generation/DocumentCheckoutStep.tsx` | Integração visual de checkout e estado do caso |
| Intake e claim no Worker | `cloudflare/routes/cases.ts` | Criação anônima, token de recuperação/claim, autorização e persistência |
| Pagamentos no Worker | `cloudflare/routes/payments.ts`, `cloudflare/venopag.ts` | Oferta, criação de ordem, gateway, status e bloqueio de preview |
| App e navegação | `src/App.tsx` | Montagem das telas e rotas do produto |
| Testes não E2E | `cloudflare/routes/cases.test.ts`, `cloudflare/routes/payments.test.ts`, demais suítes Vitest | Contratos e regressões a preservar; não substituem E2E de navegador |
| Fluxo canônico | `src/App.tsx`, `src/components/onboarding/OnboardingWizard.tsx`, `src/core/router/RouterContext.tsx` | O único fluxo de onboarding considerado é o wizard existente na rota `/novo-caso`, correspondente ao produto implantado |

A leitura foi feita por arquivos versionados no GitHub. Não houve checkout local, execução do app, inspeção de deployment ou consulta direta ao banco; portanto, esta fase não declara validação dinâmica.

## 3. Contratos confirmados e bloqueios

### 3.1 Os nomes de serviço não são intercambiáveis

A matriz canônica dos testes define `suspensao` e `cassacao`, mas os tipos de domínio usam `suspensao_cnh`, `cassacao_cnh`, `processo_suspensao` e `processo_cassacao`. O catálogo comercial contém tanto aliases curtos quanto nomes especializados. A seleção de situação e fase em `rules-matrix.ts` determina o procedimento; não se pode passar automaticamente o prefixo do teste como `serviceType` de API ou como `ProcedureType`.

| Serviço de certificação | Situação / seleção UI observada | Procedimento(s) a confirmar no contrato ativo | Estado |
|---|---|---|---|
| Defesa prévia | `multa_transito` + `primeira_notificacao` | `defesa_previa` | Mapeamento semântico identificado; verificar fluxo ativo ponta a ponta |
| Recurso JARI | `multa_transito` + `notificacao_penalidade` ou fase compatível | `recurso_jari` | Confirmar combinação de fase e procedimento |
| Recurso CETRAN | `multa_transito` + `recurso_jari_negado` | `recurso_cetran` | Confirmar combinação de fase e procedimento |
| Suspensão | `suspensao_cnh` | `suspensao_cnh` ou `processo_suspensao` conforme contrato | Não escolher alias sem comprovar normalização e preço |
| Cassação | `cassacao_cnh` | `cassacao_cnh` ou `processo_cassacao` conforme contrato | Não escolher alias sem comprovar normalização e preço |
| Indicação de condutor | `indicacao_condutor` | `indicacao_condutor` | Verificar fluxo, dados exigidos e catálogo comercial |
| Conversão em advertência | `conversao_advertencia` | `conversao_advertencia` | Verificar fluxo, elegibilidade e catálogo comercial |

**Bloqueio P0:** antes de codificar os specs, cada serviço precisa ter um único mapeamento documentado entre identificador de certificação, escolha de interface, fase processual, `ProcedureType`, `serviceType` persistido e oferta comercial. Se o código contiver mais de uma representação válida, o teste deve seguir o fluxo real e verificar a normalização; não deve corrigir contratos por conta própria.

### 3.2 Fluxo de onboarding sob teste

O fluxo canônico é o wizard existente `src/components/onboarding/OnboardingWizard.tsx`, montado em `src/App.tsx` na rota pública `/novo-caso`. A implementação alternativa `ManualIntakePage` e os documentos que a descreviam como novo fluxo não são fonte de verdade e devem ser removidos. Os testes E2E devem reproduzir o wizard atualmente implantado, sem criar uma jornada paralela nem assumir que a interface alternativa existe.

**Critério:** usar os controles, etapas, validações e transições reais do wizard canônico. Qualquer divergência entre código e deployment precisa ser registrada como bloqueio de validação, não resolvida assumindo a existência de outro onboarding.

### 3.3 Criação anônima, claim e recorrência

O Worker possui `POST /api/cases/anonymous`, que valida campos, exige infraestrutura de rate limit/IP, gera token imprevisível de claim e persiste o caso anônimo. Há fluxo de claim autenticado por `POST /api/cases/:id/claim`; o identificador do caso sozinho não é prova suficiente de autorização. O wizard mantém metadados de recuperação em session storage, sem intenção de armazenar dados pessoais ali.

**Implicações de teste:**
- criar casos pela interface nos cenários que validam intake;
- nunca semear diretamente no banco para fingir que a interface foi percorrida;
- testar recuperação e claim com token válido/inválido conforme o contrato;
- verificar que o claim associa o mesmo caso à identidade autenticada;
- para cliente recorrente, criar um novo caso separado para cada novo serviço e comprovar que o caso anterior permanece intacto;
- verificar autorização e isolamento entre as cinco identidades, sem registrar tokens/cookies nas evidências.

### 3.4 Pagamentos

`cloudflare/routes/payments.ts` bloqueia criação de cobrança quando `E2E_SAFE_PREVIEW=true`; o código de pagamento usa oferta comercial e gateways configurados, incluindo VenoPag. A documentação de onboarding diz que não há sandbox público da VenoPag e que o preview não deve receber credenciais de produção.

**Bloqueio P0:** os casos de pagamento não podem disparar cobranças reais. Antes de validar o resultado positivo, é necessário identificar um adaptador de teste já suportado ou aprovar um ambiente isolado que simule o contrato sem chamar o gateway real. O bloqueio de preview não deve ser removido para “fazer o teste passar”. Enquanto isso não existir, o caso de confirmação de pagamento é `BLOCKED`, não `PASS`.

### 3.5 Geração de documento

O wizard contém etapas de dados complementares, revisão e checkout; a aplicação também tem código de análise, montagem e quality gate de documentos. Os testes precisam validar documento derivado dos dados persistidos do próprio caso, procedimento correto, identidade e integridade, e não apenas presença de texto ou botão de download. A análise estática não basta para afirmar que todos os sete serviços produzem documento válido no fluxo integrado.

## 4. Jornadas das cinco identidades

Os nomes U1–U5 são aliases de dados sintéticos, não contas reais. As identidades serão preparadas apenas no ambiente de teste autorizado, com credenciais fora do repositório.

| Identidade | Jornada transversal planejada | O que valida |
|---|---|---|
| U1 | Visitante → primeiro caso de Defesa Prévia → cadastro/claim quando o fluxo exigir → concluir etapas seguras → iniciar outro serviço com a mesma conta | Primeiro acesso e cliente recorrente |
| U2 | Conta já cadastrada → novo Recurso JARI → consultar o caso anterior → iniciar CETRAN apenas com pré-condições legais/sintéticas adequadas | Reuso da conta e isolamento de processos |
| U3 | Visitante → iniciar caso → interromper → recuperar/claim após autenticação → abrir outro serviço | Continuidade e recuperação |
| U4 | Conta existente → serviços especializados de suspensão/cassação com casos separados → alternar entre histórico e caso atual | Mapeamento de serviço, dados e isolamento |
| U5 | Conta existente → indicação de condutor/conversão em advertência → cenários negativos e repetição controlada | Validação de campos, elegibilidade e idempotência |

A distribuição exata de U1–U5 pelos casos individuais será indicada na matriz abaixo e pode ser ajustada se as pré-condições reais do código exigirem. Não se deve inventar dependências entre casos: por exemplo, um recurso CETRAN só depende de indeferimento anterior quando o cenário explicitamente testa essa jornada.

## 5. Matriz dos 70 casos — objetivos a implementar

Os identificadores são fixos. Os objetivos descrevem cobertura pretendida; os passos, seletores, dados e verificações concretas são parte da implementação da Fase 2 e só podem ser preenchidos depois de resolver os bloqueios acima.

### Serviço 1 — Defesa prévia (`E2E-DP-001` a `E2E-DP-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-DP-001 | U1, visitante | Iniciar o fluxo de Defesa Prévia pela interface pública e confirmar que o caso criado corresponde à seleção feita |
| E2E-DP-002 | U1, mesmo caso | Validar obrigatoriedade e formato dos campos requeridos, sem persistir dados inválidos como caso válido |
| E2E-DP-003 | U2, conta existente | Validar dados inconsistentes ou combinação de campos inválida e observar a rejeição esperada |
| E2E-DP-004 | U1, continuidade | Confirmar que os dados informados nas etapas reais do wizard são mantidos no caso e analisados pelo fluxo existente |
| E2E-DP-005 | U1, cadastro/claim | Autenticar a identidade e confirmar que o mesmo caso anônimo é associado, sem criar caso duplicado |
| E2E-DP-006 | U3, recuperação | Interromper e recuperar o caso, verificando ID, dados e estado persistidos |
| E2E-DP-007 | U1, análise | Verificar que análise e procedimento são derivados dos dados e da fase processual corretos |
| E2E-DP-008 | U1, documento | Verificar vínculo, integridade e conteúdo do documento produzido para o caso |
| E2E-DP-009 | U1, checkout | Verificar oferta e estado de pagamento sem chamar gateway financeiro real; sucesso fica bloqueado até existir adaptador autorizado |
| E2E-DP-010 | U1, novo serviço/repetição | Repetir uma ação de forma controlada e iniciar um segundo serviço, confirmando ausência de duplicidade e preservação do caso anterior |

### Serviço 2 — Recurso JARI (`E2E-JARI-001` a `E2E-JARI-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-JARI-001 | U2, conta existente | Iniciar Recurso JARI pela interface e confirmar o procedimento persistido |
| E2E-JARI-002 | U2, mesmo caso | Validar campos obrigatórios específicos do procedimento |
| E2E-JARI-003 | U2, mesmo caso | Rejeitar dados malformados ou inconsistentes sem produzir um caso falsamente válido |
| E2E-JARI-004 | U3, visitante | Executar a criação anônima pelo wizard vigente e confirmar os dados vinculados ao caso correto |
| E2E-JARI-005 | U3, claim | Recuperar/associar o caso à conta e manter a identidade e os dados originais |
| E2E-JARI-006 | U2, histórico | Recuperar o caso após navegação/reentrada e verificar estado persistido |
| E2E-JARI-007 | U2, análise | Confirmar seleção da fase processual JARI e análise aplicável, sem rebaixar para Defesa Prévia |
| E2E-JARI-008 | U2, documento | Verificar que a peça/documento corresponde a JARI e ao caso, com integridade verificável |
| E2E-JARI-009 | U2, checkout | Validar oferta/ordem e estado financeiro sem transação real; confirmação positiva bloqueada até mecanismo autorizado |
| E2E-JARI-010 | U2, recorrência | Iniciar outro serviço na mesma conta e confirmar que o JARI anterior permanece independente |

### Serviço 3 — Recurso CETRAN (`E2E-CETRAN-001` a `E2E-CETRAN-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-CETRAN-001 | U2, conta existente | Iniciar Recurso CETRAN e confirmar procedimento/estágio corretos |
| E2E-CETRAN-002 | U2, mesmo caso | Validar campos obrigatórios e dados da fase de segunda instância |
| E2E-CETRAN-003 | U2, mesmo caso | Rejeitar combinação inválida de fase ou dados processuais |
| E2E-CETRAN-004 | U3, visitante | Criar caso pela interface sem autenticação inicial, se permitido pelo fluxo ativo |
| E2E-CETRAN-005 | U3, claim | Associar o caso à conta sem alterar o procedimento ou duplicar o caso |
| E2E-CETRAN-006 | U2, recuperação | Reabrir o caso e conferir dados e estado persistidos |
| E2E-CETRAN-007 | U2, análise | Verificar que CETRAN não é confundido com JARI e que a pré-condição de fase é respeitada |
| E2E-CETRAN-008 | U2, documento | Verificar documento, procedimento e integridade vinculados ao caso |
| E2E-CETRAN-009 | U2, checkout | Verificar oferta e estado de pagamento sem chamada financeira real; sucesso bloqueado até adaptador autorizado |
| E2E-CETRAN-010 | U2, recorrência | Iniciar serviço diferente com a mesma conta e preservar o processo CETRAN |

### Serviço 4 — Suspensão (`E2E-SUSP-001` a `E2E-SUSP-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-SUSP-001 | U4, conta existente | Selecionar suspensão e confirmar mapeamento entre UI, procedimento, caso e oferta |
| E2E-SUSP-002 | U4, mesmo caso | Validar campos obrigatórios específicos do processo de suspensão |
| E2E-SUSP-003 | U4, mesmo caso | Rejeitar dados inválidos/inconsistentes e combinações de procedimento não suportadas |
| E2E-SUSP-004 | U1, visitante | Confirmar o suporte do wizard vigente a esse serviço conforme o código ativo |
| E2E-SUSP-005 | U4, claim | Confirmar vínculo de identidade sem alterar serviço, dados ou estado |
| E2E-SUSP-006 | U4, recuperação | Reabrir caso e confirmar que os dados específicos de suspensão foram preservados |
| E2E-SUSP-007 | U4, análise | Verificar regras/análise e procedimento específico sem fallback indevido para Defesa Prévia |
| E2E-SUSP-008 | U4, documento | Verificar documento de suspensão, vínculo com o caso e controles de integridade |
| E2E-SUSP-009 | U4, checkout | Verificar oferta/ordem em ambiente seguro; pagamento confirmado bloqueado até mecanismo autorizado |
| E2E-SUSP-010 | U4, recorrência | Iniciar cassação ou outro serviço como caso separado e comprovar que a suspensão anterior não muda |

### Serviço 5 — Cassação (`E2E-CASS-001` a `E2E-CASS-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-CASS-001 | U4, conta existente | Selecionar cassação e confirmar o mapeamento canônico até o caso persistido |
| E2E-CASS-002 | U4, mesmo caso | Validar campos obrigatórios do procedimento |
| E2E-CASS-003 | U4, mesmo caso | Rejeitar dados inconsistentes e seleção incorreta de procedimento |
| E2E-CASS-004 | U3, visitante | Confirmar criação anônima pelo wizard vigente quando permitida pelo fluxo ativo |
| E2E-CASS-005 | U4, claim | Associar o caso à conta e preservar os dados e o procedimento |
| E2E-CASS-006 | U4, recuperação | Recuperar o caso e verificar estado e dados persistidos |
| E2E-CASS-007 | U4, análise | Verificar tratamento de cassação sem fallback para suspensão, JARI ou Defesa Prévia |
| E2E-CASS-008 | U4, documento | Verificar que o documento pertence ao procedimento de cassação e ao caso correto |
| E2E-CASS-009 | U4, checkout | Verificar oferta e ordem sem transação real; sucesso bloqueado até mecanismo autorizado |
| E2E-CASS-010 | U4, recorrência | Iniciar outro serviço e verificar isolamento do caso de cassação |

### Serviço 6 — Indicação de condutor (`E2E-IND-001` a `E2E-IND-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-IND-001 | U5, conta existente | Iniciar indicação de condutor e confirmar o procedimento persistido |
| E2E-IND-002 | U5, mesmo caso | Validar os campos e informações obrigatórios do condutor/indicação |
| E2E-IND-003 | U5, mesmo caso | Rejeitar campos inválidos ou combinações inconsistentes sem aceitar dados incompletos |
| E2E-IND-004 | U3, visitante | Validar criação anônima e os campos do wizard conforme o suporte real do fluxo |
| E2E-IND-005 | U5, claim | Confirmar vínculo do caso com a conta e preservação dos dados da indicação |
| E2E-IND-006 | U5, recuperação | Reabrir e conferir o estado persistido do processo |
| E2E-IND-007 | U5, análise | Verificar regras específicas da indicação, sem classificar como recurso de multa por engano |
| E2E-IND-008 | U5, documento | Verificar documento/resultado e vínculo com os dados corretos do caso |
| E2E-IND-009 | U5, checkout | Validar oferta e pagamento em modo seguro; sucesso bloqueado até adaptador autorizado |
| E2E-IND-010 | U5, recorrência | Contratar outro serviço com a mesma conta e confirmar isolamento e histórico |

### Serviço 7 — Conversão em advertência (`E2E-ADV-001` a `E2E-ADV-010`)

| ID | Identidade/jornada | Objetivo |
|---|---|---|
| E2E-ADV-001 | U5, conta existente | Iniciar conversão em advertência e confirmar serviço/procedimento |
| E2E-ADV-002 | U5, mesmo caso | Validar os dados necessários à análise de elegibilidade |
| E2E-ADV-003 | U5, mesmo caso | Rejeitar dados inválidos e tratar inelegibilidade conforme regra explícita do produto |
| E2E-ADV-004 | U1, visitante | Validar criação anônima pelo wizard vigente se suportada pela rota ativa |
| E2E-ADV-005 | U5, claim | Confirmar que o caso correto é associado à conta |
| E2E-ADV-006 | U5, recuperação | Confirmar persistência e recuperação dos dados de elegibilidade |
| E2E-ADV-007 | U5, análise | Verificar que a decisão respeita critérios de conversão, sem prometer deferimento automático |
| E2E-ADV-008 | U5, documento | Verificar documento/resultado coerente com elegibilidade e caso |
| E2E-ADV-009 | U5, checkout | Verificar oferta e estado de pagamento em ambiente seguro; sucesso bloqueado até adaptador autorizado |
| E2E-ADV-010 | U5, recorrência | Iniciar outro serviço e verificar que os casos e seus estados permanecem separados |

## 6. Requisitos comuns de implementação (para Fase 2)

Todo caso, em todos os arquivos, deverá declarar:
1. ID estável e título que descreve o comportamento.
2. Identidade de teste e estado inicial (visitante ou autenticado).
3. Pré-condições e dependências explícitas.
4. Dados sintéticos válidos para o serviço e identificador único de execução.
5. Passos de interface baseados nos seletores reais.
6. Oráculo de negócio observável.
7. Verificação de persistência usando o contrato autorizado; não apenas texto na tela.
8. Verificação de que o caso, serviço, usuário e documento correspondem.
9. Evidências sem credenciais, tokens, cookies ou dados pessoais reais.
10. Resultado `PASS`, `FAIL`, `BLOCKED` ou `NOT_RUN`, com tentativa e causa preservadas.

Os testes negativos não devem criar registros válidos acidentalmente. Os casos que validam criação/recuperação devem percorrer a UI. Cada processo de negócio persistido é separado, mesmo que a identidade seja reutilizada. A execução será sequencial por serviço; a suíte não deve misturar a certificação dos sete serviços numa única rodada.

## 7. Condições de segurança e ambiente

- Não executar testes de escrita contra produção sem autorização explícita e plano de impacto.
- Não chamar gateway real; não contornar `E2E_SAFE_PREVIEW`.
- Não armazenar segredos em arquivos de teste, commits, screenshots ou relatórios.
- Não apagar dados ou evidências automaticamente sem identificação e política de limpeza aprovadas.
- Não inserir registros diretamente no banco para contornar etapas da interface que o caso se propõe a validar.
- Preservar testes Vitest/unitários, integração, auditoria e segurança que não sejam parte da antiga suíte E2E.
- Não criar branch, PR, merge ou worktree; trabalhar diretamente em `main`.
- Um bloqueio de infraestrutura não pode ser convertido em aprovação por mock não declarado.

## 8. Critério de entrada da Fase 2

A matriz de 70 IDs está definida, mas a implementação deve começar somente depois de resolver ou formalizar como bloqueios aprovados:
1. os controles e as transições do wizard existente na rota `/novo-caso` correspondem à versão implantada;
2. o mapeamento final dos sete serviços para UI, procedimento, caso e catálogo comercial;
3. a rota e o oráculo autorizados para verificar análise e documento persistidos;
4. o ambiente de teste e as identidades sintéticas, sem depender de usuários reais;
5. o mecanismo seguro de teste de pagamento positivo sem transação real;
6. os seletores e o comportamento real de cada tela.

Se qualquer contrato não puder ser comprovado no código, registrar `BLOCKED` e resolver a análise antes de codificar o caso. Não improvisar endpoint, estado ou comportamento.

## 9. Fechamento da Fase 1

**Fase 1 concluída como levantamento documental e especificação:** fontes principais examinadas, discrepâncias registradas, sete grupos de dez identificadores definidos e jornadas transversais planejadas.

**Pendências que não são ocultadas:** os bloqueios listados na seção 8 impedem a aprovação técnica da implementação até serem resolvidos. A conclusão da Fase 1 não certifica o produto nem autoriza execução funcional.

**Entrega seguinte:** Fase 2 — implementar somente os dez casos de Defesa Prévia em arquivo próprio, depois de validar os contratos acima. Não implementar os demais seis arquivos nesta fase.
