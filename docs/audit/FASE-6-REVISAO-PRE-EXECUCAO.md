# FASE 6 — Revisão Pré-Execução

## Objetivo

Deixar o agente local com instruções suficientes para executar a Fase 6 — **Testes / Release Candidate** — de forma objetiva, reproduzível e sem mascarar gaps.

Esta revisão NÃO implementa as correções da Fase 6. Ela define o que precisa ser auditado antes da execução funcional.

A referência de segurança deve ser usada como metodologia de verificação, não como autorização para inventar requisitos. O OWASP ASVS 5.0 fornece uma base para testar controles técnicos de segurança; o WSTG fornece uma metodologia prática de testes de aplicações web e APIs. citeturn0search4turn0search0

---

## Estado atual conhecido

No commit-base atual da `main`, o próprio commit mais recente de Fase 5 registra:

- **68 arquivos de teste**;
- **749 testes**;
- `npm run test:unit` configurado para Vitest;
- `npm test` / `npm run test:e2e` configurados para Playwright Chromium;
- `npm run lint` executa `tsc --noEmit`;
- `npm run build` executa geração de assets, Vite, bundle do servidor e `build-api.mjs`.

A CI atual executa, em sequência:

1. `npm run test:unit`;
2. `npm run lint`;
3. `npm run build`;
4. depois, E2E via `npm test` com Playwright Chromium. fileciteturn55file0L2-L10

Isso é **infraestrutura de execução**, não prova de cobertura suficiente. A Fase 6 precisa verificar se os testes existentes realmente protegem os fluxos críticos.

Há também histórico de E2E real parcialmente bloqueado por dependências externas. O relatório existente registra que uma execução chegou até persistência, aprovação e agendamento, mas falhou em geração de mídia e publicação Meta por dependências/configurações externas. fileciteturn54file0L2-L2

### Regra importante

Não declarar `PASS`, `VERIFIED` ou `RELEASE CANDIDATE` somente porque `npm test` terminou com exit code 0.

É necessário provar:

```text
teste existe
+
usa o caminho real
+
valida o comportamento esperado
+
possui caso adversarial quando o risco exige
+
falha quando o comportamento seguro é violado
+
não depende de mock que mascara a integração crítica
```

---

# 6.1 — Inventário de testes

## Objetivo

Construir o mapa real de testes do repositório antes de adicionar qualquer teste novo.

## O agente deve

1. Inventariar todos os testes:
   - `tests/**/*.test.*`;
   - `tests/**/*.spec.*`;
   - `src/**/*.test.*`;
   - `src/**/*.spec.*`;
   - fixtures;
   - helpers de teste;
   - mocks;
   - testes de auditoria;
   - testes E2E Playwright;
   - scripts E2E independentes.

2. Separar:
   - unit;
   - integration;
   - audit/security;
   - E2E;
   - smoke/debug;
   - testes obsoletos ou duplicados.

3. Para cada grupo registrar:
   - quantidade de arquivos;
   - quantidade de testes;
   - comando de execução;
   - dependências externas;
   - uso de mock;
   - fluxo protegido.

4. Identificar testes que existem mas não são executados pelos scripts oficiais.

5. Identificar testes `debug-*` que não devem ser tratados automaticamente como suíte de release.

6. Identificar relatórios antigos que possam dar uma falsa impressão de cobertura.

## Não fazer

- não mover testes ainda;
- não apagar testes ainda;
- não aumentar cobertura artificialmente;
- não contar snapshots/documentação como testes funcionais;
- não considerar quantidade de testes como sinônimo de qualidade.

## Saída obrigatória

Criar uma matriz:

```text
arquivo → tipo → comando → fluxo protegido → dependências → confiança
```

---

# 6.2 — Autenticação

## Objetivo

Provar que os testes realmente cobrem autenticação e seus estados de falha.

## Cobertura mínima a verificar

- ausência de token;
- token inválido;
- token expirado, se aplicável;
- token malformado;
- usuário válido;
- usuário inexistente;
- sessão inválida;
- endpoints públicos legítimos;
- endpoints protegidos;
- diferença entre autenticação e autorização;
- comportamento após falha de dependência de autenticação.

## Testes adversariais

O agente deve provar que:

```text
sem credencial → não acessa recurso protegido
credencial inválida → não acessa
credencial válida → acessa quando permitido
```

Não aceitar teste que apenas verifica `200` sem verificar identidade/ownership real.

Não utilizar credencial privilegiada para validar comportamento que deveria funcionar com usuário comum.

---

# 6.3 — Autorização

## Objetivo

Provar ownership, escopo e isolamento por usuário/case/recurso.

## Prioridade

Esta subfase é mais importante do que simplesmente aumentar cobertura numérica.

Testar, no mínimo:

- usuário A acessando recurso de A → permitido quando previsto;
- usuário A acessando recurso de B → negado;
- usuário A alterando ID de recurso → negado;
- enumeração de IDs → sem vazamento;
- leitura;
- atualização;
- exclusão;
- download;
- documentos;
- evidências;
- pagamentos;
- ações administrativas;
- parâmetros de rota, query e body.

## Casos críticos

Reexecutar adversarialmente os riscos conhecidos de:

- IDOR/BOLA;
- mass assignment/BOPLA;
- ownership de envelopes/documentos;
- ownership de cases;
- superfícies de evidência;
- endpoints privilegiados.

A existência de middleware de autenticação não é evidência de autorização correta.

---

# 6.4 — Upload / Evidence

## Objetivo

Testar o fluxo de evidência como fluxo de segurança, não apenas como upload HTTP.

## Cobertura

Verificar:

- tipo permitido;
- tipo proibido;
- extensão enganosa;
- MIME inconsistente;
- tamanho acima do limite;
- arquivo vazio;
- nome malformado;
- path traversal;
- path absoluto;
- SSRF onde houver URL/remote fetch;
- redirects;
- ownership;
- associação ao case correto;
- acesso posterior ao arquivo;
- exclusão;
- download;
- erros de storage;
- arquivos corrompidos;
- comportamento com dependência de OCR indisponível.

## Regra

Não aceitar um teste que apenas verifica que o endpoint recebeu um arquivo.

O teste deve provar que o arquivo fica associado ao recurso correto e que outro usuário não consegue recuperá-lo.

---

# 6.5 — Geração de defesa

## Objetivo

Provar a integridade do pipeline jurídico:

```text
Case
→ Evidence
→ Analysis
→ Arguments
→ Document
```

## Prioridade P0

A Fase 3 e as correções recentes de `DocumentAssemblyEngine` devem ser transformadas em testes de regressão reais.

Cobrir explicitamente:

- conteúdo autorizado chegando ao assembly;
- argumento canônico preservado;
- dados reais do payload interpolados;
- ausência de argumento autorizado não gera tese inventada;
- ausência de `customFacts` não fabrica fatos;
- placeholders não resolvidos invalidam o documento;
- `validation.isValid === false` implica `isReady === false`;
- documento totalmente válido permanece `isReady === true`;
- falhas de RAG não viram conclusão jurídica inventada;
- `KNOWLEDGE_GAP` permanece `KNOWLEDGE_GAP`;
- nenhuma etapa posterior deve mascarar falha anterior.

## Regra crítica

Não testar apenas o texto final.

Testar também os limites entre os domínios para impedir que um componente transforme ausência de dado em conteúdo jurídico.

---

# 6.6 — Pagamento

## Objetivo

Provar que o fluxo de pagamento não é apenas funcional, mas seguro contra alteração de estado por cliente.

## Cobertura

Testar:

- criação de pagamento autenticada;
- usuário A não acessa pagamento de B;
- alteração de `caseId`/`paymentId` não muda ownership;
- valores não podem ser controlados livremente pelo cliente;
- preço consultado pelo backend é a fonte efetiva quando aplicável;
- webhook válido;
- webhook inválido;
- assinatura inválida, se houver;
- replay/duplicação;
- estados impossíveis;
- pagamento já concluído;
- falha do provedor;
- timeout;
- sandbox vs production;
- retorno de erro sem vazamento de dados.

## Regra

Nunca marcar pagamento como seguro apenas porque o endpoint responde corretamente em happy path.

O agente deve testar transições de estado e manipulação adversarial de identificadores e valores.

---

# 6.7 — Onboarding

## Objetivo

Validar o fluxo que efetivamente chega ao usuário e evitar regressões entre versões de onboarding.

## Ponto de atenção

Existe histórico de dois sistemas de onboarding no projeto:

- V2 ativo em `/onboarding`;
- V1 legado em `/onboarding-legacy`.

O teste deve determinar qual é o fluxo oficial do produto e provar que o fluxo ativo não perdeu invariantes importantes do fluxo anterior sem substituição deliberada.

## Cobertura

Testar:

- entrada no onboarding;
- cada etapa obrigatória;
- validações;
- upload/evidence dentro do onboarding;
- persistência do estado;
- refresh;
- navegação para trás/avançar;
- sessão expirada;
- falha de OCR/analysis;
- conclusão;
- retomada;
- isolamento entre usuários;
- comportamento sem dados obrigatórios.

## Não fazer

Não reativar V1 apenas porque possui mais testes ou mais etapas.

A decisão deve ser baseada no fluxo oficial atual e em invariantes comprovados.

---

# 6.8 — E2E crítico

## Objetivo

Construir uma suíte mínima de release que prove os caminhos críticos reais.

## Caminhos mínimos

### Fluxo A — usuário/case

```text
autenticação
→ onboarding/case
→ evidência
→ análise
→ argumentos
→ documento
```

### Fluxo B — pagamento

```text
case
→ pagamento
→ confirmação/webhook
→ estado persistido
```

### Fluxo C — autorização

```text
usuário A
→ tenta acessar recurso de B
→ acesso negado
```

### Fluxo D — falha segura

```text
dependência crítica indisponível
→ operação falha
→ estado seguro
→ nenhum conteúdo falso
→ nenhum acesso indevido
```

## Dependências externas

Separar claramente:

- E2E determinístico/local;
- E2E com Supabase real;
- E2E com provedores externos;
- E2E condicionado por credenciais/ambiente.

Não transformar uma integração externa indisponível em falso PASS usando mock dentro do teste que pretende validar a integração real.

Se uma dependência externa não puder ser executada no ambiente de auditoria:

```text
BLOCKED / KNOWLEDGE_GAP
```

e registrar exatamente o que foi e não foi provado.

O WSTG recomenda testes reproduzíveis, rigorosos e orientados à evidência, além de priorização por risco. citeturn0search10turn0search12

---

# 6.9 — Build / lint / TypeScript

## Objetivo

Provar que o artefato candidato é compilável e que os gates técnicos realmente representam o estado entregue.

## Comandos obrigatórios

```bash
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
npm test
```

## Ponto concreto já conhecido

Atualmente `npm run lint` é apenas um alias para:

```text
tsc --noEmit
```

Portanto, não declarar que existe lint real sem verificar se ESLint/biome/prettier ou outro analisador está efetivamente configurado.

Também verificar:

- build limpo;
- ausência de arquivos gerados indevidos no Git;
- sourcemaps conforme política de produção;
- bundle server/client;
- scripts de geração executados pelo build;
- diferenças entre build local e CI.

A CI atual executa unit → typecheck → build e depois E2E. fileciteturn55file0L2-L10

## Regra

Não corrigir testes/build apenas para obter `green`.

Falha real deve permanecer visível até ser compreendida e corrigida.

---

# 6.10 — Release Candidate

## Objetivo

Determinar se existe evidência suficiente para chamar o estado atual de **Release Candidate**.

Release Candidate NÃO significa apenas:

```text
build passou
+
testes passaram
```

Deve significar:

```text
fluxos críticos conhecidos
+
regressões cobertas
+
autenticação/autorização provadas
+
fluxos jurídicos protegidos
+
pagamento protegido
+
E2E crítico reproduzível
+
gates técnicos verdes
+
gaps externos explicitamente documentados
```

## Checklist de RC

O agente deve consolidar:

- commit SHA candidato;
- estado limpo do working tree;
- testes unitários/auditoria;
- integração;
- E2E;
- autenticação;
- autorização;
- upload/evidence;
- geração de defesa;
- pagamento;
- onboarding;
- build;
- TypeScript;
- lint real, se existir;
- dependências externas bloqueantes;
- `KNOWLEDGE_GAP`s;
- regressões conhecidas;
- riscos P0/P1/P2.

## Critério de decisão

### `GO`

Somente quando todos os controles críticos aplicáveis estiverem comprovados e nenhum P0/P1 bloqueante permanecer.

### `NO-GO`

Quando existir falha crítica, regressão, teste ausente para controle crítico ou comportamento inseguro não corrigido.

### `BLOCKED`

Quando a validação depender de infraestrutura externa que não pode ser executada e isso impedir uma conclusão objetiva.

Não transformar `BLOCKED` em `GO` por suposição.

---

# Gaps que NÃO podem ser mascarados

A Fase 6 deve registrar explicitamente:

- teste inexistente;
- teste que não executa;
- teste que usa mock onde integração real era necessária;
- teste que cobre apenas happy path;
- teste flaky;
- teste dependente de credencial externa indisponível;
- teste que não valida ownership;
- teste que não valida estado persistido;
- teste que aceita conteúdo jurídico inventado;
- cobertura numérica baixa sem explicar o impacto;
- E2E parcial apresentado como E2E completo;
- build verde com `lint` que é somente TypeScript.

Ausência de teste não é prova de segurança.

---

# Ordem recomendada para execução

1. **6.1 Inventário de testes**
2. **6.3 Autorização**
3. **6.2 Autenticação**
4. **6.4 Upload / Evidence**
5. **6.5 Geração de defesa**
6. **6.6 Pagamento**
7. **6.7 Onboarding**
8. **6.8 E2E crítico**
9. **6.9 Build / lint / TypeScript**
10. **6.10 Release Candidate**

A autorização vem cedo porque um teste de fluxo feliz sem isolamento de recursos pode dar falsa sensação de segurança.

---

# Correções da Fase 6

Somente depois de concluir 6.1–6.9:

1. consolidar os gaps;
2. classificar P0/P1/P2/BLOCKED/KNOWLEDGE_GAP;
3. corrigir somente problemas comprovados;
4. adicionar testes de regressão para cada correção;
5. executar a suíte completa;
6. executar build/lint/TypeScript;
7. revisar `git diff`;
8. criar **um único commit funcional** para as correções da Fase 6;
9. push para `main`;
10. registrar SHA completo no roadmap.

Se 6.1–6.9 não gerar nenhuma correção funcional, a Fase 6 ainda deve terminar com um **commit único de documentação/auditoria**, registrando a conclusão e os gaps encontrados. Nunca criar alteração funcional artificial somente para gerar commit.

---

# Regras operacionais obrigatórias para o agente local

Antes de iniciar:

```bash
git fetch origin
git status
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

Se estiver atrás de `origin/main`, sincronizar antes da auditoria.

Durante a auditoria:

- não alterar produção apenas para fazer testes passarem;
- não apagar testes sem comprovar obsolescência;
- não substituir integração real por mock sem declarar a limitação;
- não inventar cobertura;
- não marcar `VERIFIED` sem evidência reproduzível;
- não considerar quantidade de testes como qualidade;
- registrar `KNOWLEDGE_GAP`/`BLOCKED` quando necessário;
- não iniciar Fase 7.

## Gates finais

```bash
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
npm test
```

O agente deve informar quantidade total de testes, testes por categoria, falhas, bloqueios externos, gaps e SHA completo.

## Referências metodológicas

- OWASP ASVS 5.0 — base para verificação de controles técnicos.
- OWASP WSTG — metodologia de testes de aplicações web e APIs.

A metodologia deve ser aplicada de forma baseada em risco e evidência, não como checklist cego. citeturn0search4turn0search12
