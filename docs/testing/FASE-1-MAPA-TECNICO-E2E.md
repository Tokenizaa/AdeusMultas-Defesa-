# Fase 1 — Mapa técnico para reconstrução da suíte E2E

**Status:** auditoria documental inicial concluída; matriz de serviços e fluxos ainda contém bloqueios que precisam ser resolvidos antes da implementação dos testes.  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch de referência:** `main`  
**Escopo:** leitura remota do código e da documentação canônica. Nenhum teste foi criado/executado; nenhum código de produto, configuração, banco ou ambiente foi alterado.

## 1. Decisão de arquitetura dos testes

- A especificação operacional é `docs/testing/E2E-CERTIFICACAO-CANONICA.md`.
- São sete serviços canônicos, dez casos por serviço e 70 casos no total.
- Os casos serão separados por arquivo de serviço, com identificadores estáveis definidos antes da implementação.
- As cinco identidades serão compartilhadas entre jornadas, não fixadas em categorias de teste. Uma identidade pode concluir um serviço e iniciar outro; cada processo persistido deve ter seu próprio caso e estado.
- A execução funcional posterior ocorrerá sequencialmente: dez casos de um serviço, análise e fechamento desse serviço, depois o próximo.
- Testes unitários, integração, auditoria e segurança que não sejam E2E devem ser preservados.

## 2. Fontes de código examinadas

| Área | Fonte observada | O que comprova |
|---|---|---|
| Tipos de domínio | `src/types/index.ts` | União `ProcedureType`, estados de caso, pagamento e documento |
| Seleção de serviço | `src/core/onboarding/rules-matrix.ts` | Cinco situações de onboarding e mapeamentos iniciais |
| Interface de seleção | `src/components/onboarding/steps/ServiceStep.tsx` | IDs dos controles e opções exibidas ao usuário |
| Orquestração do onboarding | `src/components/onboarding/OnboardingWizard.tsx` | Estado das etapas, serviço derivado, identidade, caso/token recuperável |
| Intake anônimo | `cloudflare/routes/cases.ts` | Contrato de criação anônima, validação mínima, token de claim e persistência |
| Pagamentos | `cloudflare/routes/payments.ts` | Criação de PIX, associação com caso/usuário, idempotência e proteção de preview |
| Checkout visual | `src/components/onboarding/generation/DocumentCheckoutStep.tsx` | Etapa de checkout integrada ao wizard; precisa ser mapeada com o contrato backend |
| Catálogo comercial | `src/types/commercial.ts` | Tipos comerciais aceitos, com aliases adicionais |
| Regras de segurança do repositório | `AGENTS.md` | `main` canônica, proibição de branch/PR sem autorização, proteção de produção e dados |
| Especificação E2E | `docs/testing/E2E-CERTIFICACAO-CANONICA.md` | Matriz 7×10, isolamento, evidências e sequência de certificação |

Esta auditoria é baseada na leitura remota de arquivos de `main`; não equivale a execução local, typecheck, build, validação de banco ou inspeção do bundle implantado.

## 3. Bloqueio P0 — divergência entre os sete serviços e os tipos reais

A matriz canônica usa:

- `defesa_previa`
- `recurso_jari`
- `recurso_cetran`
- `suspensao`
- `cassacao`
- `indicacao_condutor`
- `conversao_advertencia`

O tipo `ProcedureType` em `src/types/index.ts` usa, entre outros:

- `defesa_previa`, `recurso_jari`, `recurso_cetran`
- `suspensao_cnh`, `cassacao_cnh`
- `processo_suspensao`, `processo_cassacao`
- `indicacao_condutor`, `conversao_advertencia`

Os valores canônicos `suspensao` e `cassacao` não aparecem nessa união. Já o endpoint `POST /api/cases/anonymous` aceita explicitamente `suspensao_cnh` e `cassacao_cnh`, não os aliases curtos `suspensao` e `cassacao`. Portanto, não se deve usar diretamente o prefixo do teste como `serviceType` de API sem definir e comprovar um mapeamento.

Há também uma distinção de produto que precisa ser mantida: a interface apresenta a situação “Multa de Trânsito”, que inicialmente mapeia para `recurso_jari`, mas a etapa processual pode resultar em `defesa_previa`, `recurso_jari` ou `recurso_cetran`. O cenário deve validar a combinação situação + fase processual + procedimento resultante, não apenas o rótulo visual.

**Ação exigida antes de implementar:** documentar um mapeamento explícito entre cada serviço de certificação, o valor enviado pela interface, o `ProcedureType`, o `serviceType` persistido e o identificador comercial. A auditoria não deve alterar esses contratos por conta própria.

## 4. Bloqueio P0 — onboarding canônico precisa ser confirmado no código de main

A decisão de produto `docs/product/onboarding/DECISAO-ONBOARDING-MANUAL-SEM-OCR-2026-10-18.md` determina coleta manual sem OCR. Entretanto, o `src/components/onboarding/OnboardingWizard.tsx` observado em `main` ainda importa etapas históricas de identificação e processamento, incluindo `InfractionIdentificationStep` e `AnalysisProcessingStep`. A documentação de status também registra que o fluxo greenfield manual existiu em outra linha de trabalho, não devendo ser presumido como integrado à `main`.

Antes dos testes, é necessário confirmar no código ativo de `main`:
1. qual página/rota pública é realmente montada para iniciar um caso;
2. se a jornada ativa é a de preenchimento manual sem OCR;
3. como o identificador do caso e o token de claim são preservados;
4. como o login/cadastro retoma o mesmo caso;
5. se um usuário autenticado consegue iniciar outro serviço sem alterar processos anteriores.

Nenhum teste deve assumir que uma implementação documentada em branch ou PR esteja presente em `main`.

## 5. Contratos observados para caso anônimo e recuperação

O endpoint `POST /api/cases/anonymous`:
- exige cabeçalho de IP e binding de rate limiter; sem eles retorna indisponibilidade;
- valida AIT, código de infração, localidade e placa;
- gera um token de claim de 32 bytes no servidor;
- cria o caso sem usuário, marcado como anônimo e não pago;
- usa `defesa_previa` como valor padrão quando `serviceType` não é enviado;
- limita `serviceType` a uma lista explícita de sete valores internos;
- mantém órgão autuador ausente como “Não informado”, não como um órgão inventado.

O endpoint de recuperação anônima exige ID mais token válido; o ID isolado não autoriza acesso. O endpoint de claim autenticado existe em `POST /api/cases/:id/claim`, mas seus pré-requisitos e seu resultado precisam ser incorporados ao mapa completo antes de escrever o cenário de handoff.

Consequência para a suíte: verificar o caso criado pelo fluxo da interface, persistência e associação de identidade; não inserir casos diretamente no banco para preparar um cenário que deveria testar o intake.

## 6. Contrato de pagamento e limite de segurança

O código em `cloudflare/routes/payments.ts`:
- expõe consulta de preço/oferta e status do gateway;
- cria PIX em `POST /api/payments/pix/create`, com autenticação e `caseId` obrigatório;
- por padrão usa VenoPag quando `VENO_PRIMARY_GATEWAY` não define outro gateway;
- registra a ordem ligada a caso e usuário;
- reutiliza uma ordem PIX pendente compatível para o mesmo caso/usuário, protegendo contra duplicação;
- bloqueia a criação de cobrança quando `E2E_SAFE_PREVIEW=true`, retornando 503 antes de contatar o gateway.

A documentação do projeto informa que a VenoPag não oferece sandbox público. Portanto, **não existe autorização para executar o cenário de pagamento bem-sucedido contra produção durante esta fase**. Para testar sucesso financeiro sem movimentar dinheiro, antes da certificação será necessário identificar no código um adaptador de teste suportado ou preparar um ambiente isolado autorizado que reproduza os contratos de pagamento sem chamar o provedor real. A proteção do preview não deve ser contornada.

## 7. Configuração e estado atual dos testes E2E

- `package.json` declara `test` e `test:unit` como `vitest run`; não declara um script `test:e2e`.
- As buscas no código de `main` não localizaram a configuração Playwright ou os antigos specs E2E referenciados por documentos históricos. Os arquivos `playwright.config.ts`, `tests/e2e/services/*` e alguns artefatos de onboarding documentados não foram encontrados nos caminhos consultados na `main`.
- Isso é compatível com a decisão de remover a suíte E2E antiga, mas ainda falta inventariar a árvore completa do checkout para afirmar a lista definitiva de arquivos existentes.
- Testes de contrato/unitários como `cloudflare/routes/cases.test.ts` e `cloudflare/routes/payments.test.ts` são Vitest e não devem ser confundidos com a nova suíte E2E.
- Não foi executado `npm test`, Playwright, build, typecheck ou qualquer teste de navegador nesta fase.

## 8. Modelo de identidade e isolamento

Os cinco usuários de teste serão identidades sintéticas reutilizáveis em jornadas cruzadas. A distribuição final deve ser definida depois de mapear as pré-condições de cada caso. Regras:
- cada cenário persistente recebe um caso próprio e um identificador único de execução;
- o mesmo usuário pode concluir um serviço e iniciar outro;
- o histórico anterior deve continuar acessível e inalterado;
- cada caso mantém serviço, dados, documento, pagamento e estado próprios;
- cenários de visitante não devem iniciar autenticados artificialmente;
- não realizar limpeza destrutiva automática;
- evidências não podem conter credenciais, tokens de claim, cookies ou dados pessoais reais.

## 9. Pendências para encerrar a Fase 1

1. Fechar o inventário dos arquivos realmente presentes em `main`, especialmente roteamento público, autenticação, claim, geração documental e testes não E2E.
2. Confrontar o fluxo de onboarding ativo com a decisão de coleta manual sem OCR.
3. Resolver documentalmente o mapeamento dos sete serviços para os tipos reais da aplicação e do catálogo comercial.
4. Mapear o ciclo de vida de um caso: intake → análise → claim/cadastro → qualificação → ordem de pagamento → confirmação → documento.
5. Definir como será testado o sucesso de pagamento sem transação real; se não houver mecanismo seguro existente, registrar esse cenário como bloqueado até que haja solução autorizada.
6. Produzir a matriz final dos 70 casos com pré-condições, entrada, ações de interface, oráculo de negócio, verificações de persistência, dependências e evidências.
7. Revisar a matriz com base no código antes de criar qualquer spec.

## 10. Critério para iniciar a Fase 2

A Fase 2 só começa quando os itens acima estiverem resolvidos ou tiverem um bloqueio explícito aprovado. Não criar os dez testes de Defesa Prévia com base em suposições enquanto o fluxo ativo e o mapeamento de serviço estiverem ambíguos.

**Resultado desta entrega:** mapa técnico inicial documentado; testes E2E não criados; nenhuma execução ou certificação declarada.
