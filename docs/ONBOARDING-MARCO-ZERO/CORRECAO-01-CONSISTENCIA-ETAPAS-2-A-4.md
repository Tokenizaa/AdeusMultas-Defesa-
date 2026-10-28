# Correção 01 — Consistência entre fase, categoria e primeiro formulário do serviço de multas

**Marco:** Onboarding Marco Zero  
**Escopo:** serviço **Multa de Trânsito**, da seleção da fase administrativa (etapa 2), passando pela categoria da infração (etapa 3), até o primeiro formulário de identificação preenchido (etapa 4).  
**Base de código:** branch canônica `main`.  
**Status da implementação:** alterações registradas no GitHub; validação automatizada ainda precisa de resultado verificável.  
**Limite:** esta correção não certifica o OCR, a análise jurídica posterior, a etapa de perguntas específicas nem a geração de documentos.

## 1. Achados confirmados na leitura do código

### C01 — O procedimento derivado e o procedimento persistido podiam divergir

A tela derivava o procedimento por uma cadeia de condições diferente da usada para atualizar `mappedProcedureRef`. A opção `notificacao_penalidade` mapeava para JARI em `USER_PROCESS_STAGES`, mas não era reconhecida pela cadeia derivada e podia aparecer como `defesa_previa` na etapa de resultado, enquanto a persistência usava `recurso_jari`.

**Correção:** criado `resolveOnboardingProcedure(situation, processStage)` em `src/core/onboarding/rules-matrix.ts`. A interface e a referência usada para persistir o caso agora recorrem ao mesmo resolvedor. Os serviços especializados de suspensão e cassação mantêm seu procedimento próprio.

### C02 — “Não tenho certeza da fase” era convertida silenciosamente em JARI

A opção `nao_tenho_certeza` tinha `mappedProcedure: 'recurso_jari'`, apesar de a fase não estar confirmada.

**Correção:** a opção passa a encaminhar para `analise_tecnica`, sem presumir que o caso já está na JARI. A fase informada continua registrada separadamente.

### C03 — Trocar a categoria podia conservar um código de outra categoria

O manipulador anterior preservava `infractionCode` sempre que já existia um valor (`prev.infractionCode || item.code`). Assim, selecionar uma nova categoria não garantia que o código exibido e os metadados derivados (artigo, descrição, gravidade, pontos e valor) fossem compatíveis com ela.

**Correção:** a seleção de categoria agora reconcilia o código com `CATEGORY_CODE_MAP` e o catálogo local. Se o código atual não for compatível, usa o código padrão da categoria ou o primeiro código permitido; se a categoria não tiver lista restrita e não houver código, limpa os metadados derivados em vez de inventar um enquadramento. A mesma reconciliação ocorre ao abrir a etapa 4, para tratar dados de formulário previamente persistidos.

### C04 — A seleção do serviço podia herdar estado de outra jornada

Ao selecionar novamente `multa_transito`, a categoria e a fase podiam permanecer com valores deixados por outro serviço.

**Correção:** selecionar o serviço geral de multas reinicializa a fase para `primeira_notificacao` e a categoria para `excesso_velocidade`, sincronizando também os dados derivados do código. Serviços com fase/categoria inferidas continuam usando suas definições próprias.

### C05 — O contador visual não refletia a quarta etapa do serviço de multas

O formulário de identificação apresentava “Passo 3 de 4”, embora fosse acessado depois das seleções de serviço, fase e categoria. A categoria, por sua vez, não exibia o número da etapa.

**Correção:** os componentes recebem a posição e o total de etapas iniciais calculados pelo wizard. No serviço geral de multas, a sequência passa a ser:
1. Serviço — 1 de 4.
2. Fase administrativa — 2 de 4.
3. Categoria da infração — 3 de 4.
4. Identificação da autuação — 4 de 4.

Para serviços que pulam etapas, os números são calculados conforme o caminho realmente exibido.

## 2. Arquivos alterados

- `src/core/onboarding/rules-matrix.ts`
- `src/core/onboarding/rules-matrix.flow.test.ts` (novo)
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/steps/ServiceStep.tsx`
- `src/components/onboarding/steps/DefenseStageStep.tsx`
- `src/components/onboarding/steps/InfractionCategoryStep.tsx`
- `src/components/onboarding/steps/InfractionIdentificationStep.tsx`

## 3. Testes adicionados

O teste `rules-matrix.flow.test.ts` cobre:
- primeira notificação → Defesa Prévia;
- notificação de penalidade e defesa prévia indeferida → JARI;
- recurso à JARI indeferido → CETRAN;
- fase não confirmada → análise técnica;
- preservação dos procedimentos de serviços especializados;
- situações cujo procedimento já é definido pelo próprio serviço.

## 4. Ponto que permanece para uma tarefa própria

A tela de identificação continua usando uma validação comum que exige nome, telefone, placa, código, local, data da ocorrência, órgão autuador e número do AIT. A matriz `RULES_MATRIX`, porém, classifica alguns desses dados de forma diferente (por exemplo, placa e órgão autuador aparecem como opcionais e o código como inferível). Não removi essas validações nesta correção: antes disso, é necessário conferir o contrato real de análise e persistência para não permitir o avanço com dados que o backend ou o motor ainda exijam.

O fluxo OCR também permanece fora desta correção. O envio efetivo do conteúdo do arquivo deve ser tratado separadamente, conforme a priorização registrada na Auditoria 01.

## 5. Validação e evidências

- **Leitura estática dos arquivos alterados:** realizada após as mudanças.
- **Testes automatizados (Vitest): PASS** — execução no GitHub Actions, commit `4f8ab1dba8fd8c908b5fc94db473898e5bb1efb4`.
- **Typecheck (`npm run lint`): PASS** — mesmo workflow/commit.
- **Build (`npm run build`): PASS** — mesmo workflow/commit.
- **Workflow CI/CD:** [execução concluída com sucesso](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40771746919).
- **Navegação real no navegador:** não declarada como executada.
- **Validação ponta a ponta:** BLOCKED até confirmar visualmente a jornada até o formulário 4/4.
- **Deploy em produção:** não realizado por esta tarefa; o workflow verificado executa testes, typecheck e build, sem etapa de deploy.

## 6. Critério de encerramento desta correção

A correção de código está registrada, mas o ciclo só poderá ser marcado como validado depois de executar o teste novo e as verificações pertinentes, além de confirmar no navegador o caminho completo do serviço de multas até o formulário 4/4. O formulário não deve permitir que código de infração incompatível com a categoria seja enviado como se fosse coerente.

---
**Registro:** implementação incremental do Marco Zero. Não atribuir selo verde ao onboarding com base apenas nesta correção.
