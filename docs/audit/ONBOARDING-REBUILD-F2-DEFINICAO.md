# ONBOARDING — FASE 2: DEFINIR O QUE FICA

**Data:** 2026-09-07  
**Branch:** `onboarding/rebuild-canonico`  
**Status:** CONCLUÍDO

## Objetivo

Separar o conhecimento que precisa atravessar a fronteira do legado daquilo que deve ser descartado. O resultado desta fase é uma especificação de requisitos para o greenfield. Nenhum código legado é reaproveitado.

## Critério de classificação

- **PRESERVAR COMPORTAMENTO:** requisito real necessário ao produto.
- **REESCREVER:** necessidade válida, implementação legada inadequada.
- **SUBSTITUIR:** necessidade válida, solução arquitetural diferente.
- **DESCARTAR:** workaround, duplicação, estado acidental ou comportamento sem justificativa.
- **DESCONHECIDO:** não entra no novo sistema até haver evidência suficiente.

## 1. Requisitos funcionais que ficam

### Caso e dados da infração — PRESERVAR COMPORTAMENTO / REESCREVER

O novo fluxo precisa coletar e manter, de forma canônica:

- identificação do auto de infração;
- código/tipo da infração quando disponível;
- órgão autuador;
- data/hora e local da infração;
- dados essenciais do veículo;
- fase processual/situação do usuário;
- fatos específicos relevantes para a categoria da infração;
- evidências fornecidas pelo usuário;
- dados de qualificação necessários para o documento final.

A existência desses dados é sustentada pelo contrato `CanonicalOnboardingPayload` e pelo modelo `CaseDomain` já existente no núcleo da aplicação. O novo onboarding deverá consumir contratos explicitamente definidos na Fase 3, não copiar suas estruturas de UI.

### Coleta condicional — PRESERVAR COMPORTAMENTO / REESCREVER

As perguntas devem depender do contexto do caso. O usuário não deve preencher campos irrelevantes nem responder duas vezes a mesma informação sem necessidade.

A lógica de seleção de campos deve nascer como regra explícita do novo contrato, não como cópia da matriz legada.

### Análise jurídica — PRESERVAR COMPORTAMENTO / REESCREVER

O onboarding deve solicitar uma análise canônica do caso e apresentar ao usuário um diagnóstico compreensível.

A análise deve respeitar:

- Rule Engine determinístico;
- comportamento fail-closed;
- `DATA_GAP` para informação insuficiente;
- teses/argumentos derivados de regras e catálogo;
- rastreabilidade da análise;
- separação entre fatos fornecidos e conclusões do sistema.

O frontend não será autoridade jurídica independente.

### Evidências/OCR — PRESERVAR NECESSIDADE / SUBSTITUIR IMPLEMENTAÇÃO

Upload de documentos e evidências é uma necessidade real quando o caso exigir suporte documental.

O novo fluxo deve trabalhar com o conteúdo real da evidência. Nome do arquivo, estado visual ou texto inventado não podem representar o conteúdo documental.

OCR será auxiliar e rastreável. A análise não deverá tratar OCR como prova automaticamente validada.

### Qualificação do requerente — PRESERVAR COMPORTAMENTO / REESCREVER

Antes da geração do documento, devem existir dados suficientes para qualificar o requerente e preencher a peça.

O novo fluxo deve validar os campos necessários de maneira canônica, evitando validações superficiais que apenas verificam comprimento ou presença de caracteres.

### Pagamento e geração — PRESERVAR COMPORTAMENTO / SUBSTITUIR

O produto precisa separar claramente:

```text
análise gratuita
      ↓
intenção de gerar
      ↓
pagamento
      ↓
pagamento confirmado
      ↓
geração
      ↓
documento pronto
```

O avanço não pode depender de uma única flag ambígua nem permitir que falha de geração seja apresentada como sucesso.

### Autenticação e claim — PRESERVAR NECESSIDADE / SUBSTITUIR IMPLEMENTAÇÃO

O usuário poderá iniciar o fluxo sem autenticação quando o produto permitir, mas a vinculação posterior do caso a uma identidade autenticada precisa usar contrato único e token de claim real.

Nenhum ID de caso poderá ser tratado automaticamente como token de claim.

A autenticação de produção deve continuar baseada em identidade validada pelo backend.

### Persistência e recuperação — PRESERVAR COMPORTAMENTO / REESCREVER

O caso deve possuir uma fonte persistente de verdade. O estado necessário para continuidade não pode depender de `useState`, `localStorage` ou `sessionStorage` como fonte principal.

Reload/reentrada deverá recuperar o estado do caso pelo backend quando aplicável.

## 2. UX que vale preservar

### Fluxo guiado — PRESERVAR COMPORTAMENTO

O conceito de fluxo progressivo é útil: o usuário responde apenas o necessário para chegar ao diagnóstico e, posteriormente, à geração.

### Mobile-first — PRESERVAR COMPORTAMENTO

A experiência deve continuar adequada para celular, com controles grandes, leitura simples e formulários curtos.

### Seleção visual de contexto — PRESERVAR UX / REESCREVER

Cards/opções visuais para identificar a situação ou categoria podem permanecer como padrão de interação, desde que o conteúdo seja definido pelo novo domínio.

### Navegação — PRESERVAR UX / REESCREVER

Deve existir:

- avanço somente quando os requisitos da etapa forem satisfeitos;
- retorno seguro;
- indicação clara da etapa atual;
- prevenção de perda silenciosa de dados.

### Revisão antes de gerar — PRESERVAR COMPORTAMENTO / REESCREVER

O usuário deve conseguir revisar os dados relevantes antes da geração do documento.

A revisão precisa refletir o estado canônico real, e não uma cópia divergente mantida apenas pela interface.

## 3. O que NÃO fica

### DESCARTAR

Não entram no novo onboarding como requisitos:

- timers usados para simular processamento;
- progresso artificial baseado em `setTimeout`;
- qualquer score exibido como probabilidade estatística sem validação/calibração;
- chamadas HTTP espalhadas diretamente pelos componentes;
- estados duplicados entre wizard, hooks e API;
- flags especiais de admin/teste como comportamento normal do usuário;
- fallbacks silenciosos que permitem avançar após erro;
- compatibilidades históricas sem necessidade atual;
- aliases criados apenas para acomodar contratos antigos;
- duplicação de tipos;
- etapas mantidas somente porque existiam no wizard antigo;
- persistência de dados de negócio em browser storage como fonte de verdade;
- qualquer função ou arquivo copiado do legado.

## 4. Requisitos ainda DESCONHECIDOS

Não serão inventados nesta fase:

- lista definitiva de steps;
- nomenclatura definitiva dos estados;
- contrato final de criação de caso anônimo;
- contrato final de claim;
- contrato final de upload/OCR;
- detalhes do checkout/pagamento;
- estrutura final de geração/document assembly.

Esses pontos serão definidos na Fase 3 com base nos contratos canônicos existentes e nas necessidades do fluxo.

## 5. Resultado consolidado

O novo onboarding precisa fazer essencialmente isto:

```text
IDENTIFICAR O CASO
        ↓
COLETAR DADOS ESSENCIAIS
        ↓
COLETAR FATOS/EVIDÊNCIAS RELEVANTES
        ↓
PERSISTIR CASO CANÔNICO
        ↓
EXECUTAR ANÁLISE CANÔNICA
        ↓
APRESENTAR DIAGNÓSTICO
        ↓
QUALIFICAR REQUERENTE
        ↓
REVISAR
        ↓
PAGAR
        ↓
GERAR
        ↓
ENTREGAR DOCUMENTO
```

A quantidade de telas/steps não é requisito. É decisão de UX da nova implementação.

## 6. Princípio de decisão

Se um comportamento antigo não puder ser justificado por requisito, regra de domínio, necessidade comercial/legal ou UX claramente útil, ele não será transportado.

**O que fica é conhecimento validado. A implementação começa novamente.**

## Próxima fase

**FASE 3 — DESENHAR O NOVO CONTRATO**

Resultado esperado: contratos explícitos para estado do onboarding, Case, persistência, autenticação/claim, análise, pagamento e geração.
