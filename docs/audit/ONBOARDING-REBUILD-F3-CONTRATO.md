# ONBOARDING — FASE 3: NOVO CONTRATO

**Data:** 2026-09-07  
**Branch:** `onboarding/rebuild-canonico`  
**Status:** CONCLUÍDO

## 1. Objetivo

Definir o contrato funcional do novo onboarding antes da implementação da UI. O contrato separa estado de jornada, dados do caso e operações do domínio.

## 2. Princípio central

```text
UI
 ↓
Onboarding State
 ↓
Application Services
 ↓
Canonical API
 ↓
Case Domain
 ↓
Persistence
```

A UI nunca será a fonte de verdade do caso.

## 3. Estado da jornada

O novo onboarding terá um estado explícito:

```ts
type OnboardingStatus =
  | 'collecting'
  | 'persisting'
  | 'analyzing'
  | 'analysis_ready'
  | 'qualifying'
  | 'reviewing'
  | 'payment_pending'
  | 'generating'
  | 'completed'
  | 'failed';
```

Regras:

- `failed` é estado real e bloqueia avanço automático.
- Nenhum `setTimeout` representa progresso de negócio.
- Reload deve recuperar o caso pelo identificador persistido, quando existir.
- Estado visual é derivado do estado da aplicação; não cria estado jurídico paralelo.

## 4. Dados de entrada

O novo onboarding produzirá um payload semântico dividido em:

```text
identification
infraction
vehicle
specificFacts
evidence
applicant
```

O payload também identifica o procedimento pretendido quando já conhecido.

Campos de compatibilidade histórica não fazem parte do novo contrato.

## 5. Caso canônico

O caso persistido é a fonte de verdade para:

- identificação;
- infração;
- veículo;
- fatos relevantes;
- evidências auxiliares;
- requerente;
- análise;
- pagamento;
- geração;
- histórico.

O mapper canônico existente será integrado por contrato explícito. O onboarding não criará uma representação paralela de `CaseDomain`.

## 6. Persistência

Operações mínimas:

```text
createDraft(input)
updateDraft(caseId, patch)
getCase(caseId)
startAnalysis(caseId)
getAnalysis(caseId)
qualifyCase(caseId, applicant)
requestPayment(caseId, offer)
confirmPayment(caseId, paymentReference)
generateDocument(caseId)
getGeneration(caseId)
```

Cada operação deve ter resultado explícito de sucesso ou erro. Erro não pode ser convertido em avanço de etapa.

## 7. Análise

A análise jurídica é responsabilidade do backend/domínio.

Contrato de resultado:

```text
pending
processing
completed
failed
```

Resultado deve conter, quando disponíveis:

- regras avaliadas;
- `DATA_GAP`;
- vícios detectados;
- teses recomendadas;
- procedimento recomendado;
- órgão competente;
- fundamentação resumida;
- versão do motor;
- timestamps.

`overallSuccessRate` existente não será automaticamente exposto como probabilidade ao usuário. A apresentação comercial será definida na implementação com semântica de score tecnicamente suportável.

## 8. Evidências

Upload representa conteúdo real da evidência.

O contrato deve distinguir:

```text
arquivo recebido
→ processamento OCR
→ texto extraído
→ confiança OCR
→ evidência não validada
→ confirmação humana quando necessária
```

Nome de arquivo nunca substitui conteúdo documental.

## 9. Claim/autenticação

Para casos iniciados anonimamente:

```text
anonymous case
   ↓
claim token emitido pelo backend
   ↓
authentication
   ↓
claim(caseId, claimToken)
   ↓
case vinculado à identidade
```

`caseId` e `claimToken` são valores distintos.

A identidade final é sempre determinada/validada pelo backend em produção.

## 10. Pagamento

Estado comercial explícito:

```text
not_requested
pending
approved
failed
refunded
```

Somente `approved` permite iniciar geração.

Pagamento aprovado não significa documento pronto.

## 11. Geração

Estado explícito:

```text
not_requested
processing
ready
error
```

Somente `ready` permite apresentar documento como disponível.

Erro de geração permanece erro e pode ser recuperado por operação própria.

## 12. Transições obrigatórias

```text
collecting
  → persisting
  → analyzing
  → analysis_ready
  → qualifying
  → reviewing
  → payment_pending
  → generating
  → completed
```

Falhas podem ocorrer em operações intermediárias e levam a `failed` sem apagar o estado persistido.

Nenhuma etapa pode ser pulada por flag de UI.

## 13. UX derivada do contrato

O número de telas não é fixado. A implementação deve organizar a coleta para:

- solicitar somente dados pertinentes;
- evitar duplicidade;
- permitir retorno seguro;
- mostrar progresso verdadeiro da jornada;
- permitir revisão do caso canônico;
- funcionar primeiro em mobile;
- impedir avanço quando houver requisito obrigatório ausente.

## 14. Fora do contrato

Não fazem parte do novo contrato:

- `localStorage`/`sessionStorage` como banco de negócio;
- timers de processamento;
- identidade sintética;
- fallbacks silenciosos;
- contratos de claim legados;
- aliases de compatibilidade sem necessidade atual;
- lógica jurídica na UI.

## 15. Critério de aceite da Fase 3

O novo onboarding só pode iniciar implementação estrutural quando cada operação tiver:

1. entrada definida;
2. saída definida;
3. estados de sucesso/erro definidos;
4. autoridade definida;
5. persistência definida;
6. regra de transição definida.

**Resultado:** contrato funcional suficiente para iniciar a arquitetura greenfield sem transportar o fluxo legado.
