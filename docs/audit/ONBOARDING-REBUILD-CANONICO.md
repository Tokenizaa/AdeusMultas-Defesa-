# ONBOARDING — REBUILD CANÔNICO

**Data:** 2026-09-07  
**Status:** APPROVED — REBUILD GREENFIELD  
**Decisão:** congelar o onboarding atual e reconstruir uma nova implementação do zero.

## 1. Decisão arquitetural

O onboarding atual será tratado como **legado congelado e fonte de evidências**, não como base de implementação.

A nova implementação será escrita integralmente do zero. Nenhuma página, componente, hook, service ou arquivo do onboarding atual será reutilizado integralmente.

## 2. Regra de zero reutilização de código

É proibido transportar para o novo onboarding:

- arquivos completos;
- páginas completas;
- componentes completos;
- hooks completos;
- services completos;
- funções completas por simples cópia;
- contratos antigos por conveniência;
- estados ou efeitos colaterais do legado;
- workarounds, fallbacks históricos ou caminhos especiais de teste.

O código legado pode ser **lido, auditado e usado como evidência**. O que pode ser preservado é conhecimento validado, requisito, regra de domínio ou decisão de UX — nunca a implementação por inércia.

## 3. Regra de preservação

Nada do onboarding atual é considerado preservável por padrão.

Para cada comportamento existente, a pergunta será:

> Se este comportamento desaparecesse hoje, qual requisito real do produto seria perdido?

Somente comportamentos com justificativa verificável poderão entrar na nova especificação.

Classificações permitidas:

- **PRESERVAR COMPORTAMENTO** — requisito real comprovado;
- **REESCREVER** — comportamento válido, implementação inadequada;
- **SUBSTITUIR** — necessidade real, solução diferente;
- **DESCARTAR** — legado, duplicação, workaround ou comportamento sem justificativa;
- **DESCONHECIDO** — não entra no novo sistema até ser comprovado.

## 4. O que será preservado

Podem ser preservados, após validação:

- requisitos reais do produto;
- regras de domínio confirmadas;
- requisitos legais/comerciais necessários;
- decisões de UX comprovadamente úteis;
- identidade visual e princípios de layout quando fizerem sentido;
- contratos canônicos existentes que tenham sido formalmente validados.

Mesmo nesses casos, a implementação será nova.

## 5. O que não será preservado automaticamente

Não serão tratados como requisitos apenas porque existem no código:

- estados em `useState`, `localStorage` ou `sessionStorage`;
- chamadas HTTP feitas diretamente pelos componentes;
- timers usados para simular processamento;
- scores apresentados como probabilidade sem validação;
- validações superficiais;
- flags de admin/teste;
- fallbacks silenciosos;
- duplicações de tipos ou modelos;
- compatibilidades históricas;
- etapas existentes sem justificativa de produto;
- caminhos alternativos criados durante correções anteriores.

## 6. Congelamento do legado

O estado atual é congelado na branch:

`legacy/onboarding-frozen-2026-09-07`

Essa branch existe para preservar o ponto de referência anterior ao rebuild.

Durante o rebuild:

1. o onboarding legado não será evoluído para acomodar a nova arquitetura;
2. correções no legado somente serão permitidas se forem necessárias para segurança, produção ou operação imediata;
3. qualquer correção emergencial no legado deverá ser registrada;
4. nenhuma correção emergencial será automaticamente transportada para o novo onboarding.

## 7. Nova arquitetura

A implementação nova deverá seguir, conceitualmente:

```text
UI
 ↓
Onboarding State
 ↓
Application Service
 ↓
API
 ↓
Domain
 ↓
Database
```

Responsabilidades:

- **UI/Step:** coleta e edição de dados;
- **State:** estado transitório do fluxo;
- **Application Service:** executa operações do caso;
- **API:** contrato externo e orquestração;
- **Domain:** regras e decisões de negócio;
- **Database:** fonte persistente de verdade.

Nenhuma camada deverá assumir silenciosamente a responsabilidade de outra.

## 8. Máquina de estados

A nova implementação deverá possuir estados explícitos e transições verificáveis. A máquina final será definida antes da implementação dos steps.

Exemplo conceitual:

```text
DRAFT
  ↓
DATA_COMPLETE
  ↓
ANALYZING
  ↓
ANALYZED
  ↓
READY_FOR_GENERATION
  ↓
PAYMENT_PENDING
  ↓
PAID
  ↓
GENERATING
  ↓
GENERATED
  ↓
COMPLETED
```

A nomenclatura e as transições definitivas serão especificadas antes do código.

## 9. Critério de entrada para implementação

Nenhum novo step será implementado enquanto não houver definição suficiente de:

- objetivo do step;
- dados de entrada;
- dados produzidos;
- validações;
- persistência necessária;
- serviço responsável;
- transição de estado;
- comportamento de erro;
- autorização necessária;
- critério de conclusão.

## 10. Critério de saída

O novo onboarding somente poderá substituir o legado depois de comprovar, no mínimo:

- fluxo público completo;
- persistência correta;
- recuperação/reload quando aplicável;
- autenticação e claim;
- evidências/OCR real;
- análise canônica;
- revisão;
- pagamento;
- geração do documento;
- tratamento explícito de falhas;
- testes E2E do caminho crítico;
- ausência de dependência arquitetural do onboarding legado.

## 11. Regra anti-Frankenstein

Durante o rebuild, qualquer proposta do tipo:

> “vamos reaproveitar esta função/arquivo porque já funciona”

deverá ser rejeitada como estratégia de implementação.

A pergunta correta será:

> “Qual requisito justifica esse comportamento e como devemos implementá-lo na arquitetura nova?”

## 12. Princípio central

> **O onboarding atual é uma fonte de evidências, não uma fonte de código.**

O objetivo desta fase não é limpar o Frankenstein. É retirar dele somente o conhecimento comprovadamente necessário e construir uma implementação nova, pequena, explícita, testável e canônica.
