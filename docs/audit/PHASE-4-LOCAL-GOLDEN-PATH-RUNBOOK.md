# Phase 4 — Local Golden Path Runbook

## Objetivo

Executar o Golden Path completo localmente enquanto o deploy da Vercel estiver bloqueado por rate limit, preservando o teste de produção como suíte independente.

Este teste local é evidência de integração e regressão. **Não substitui a aprovação final de produção da Fase 4.**

## Suítes separadas

- Produção: `tests/golden-path-production.spec.ts`
  - permanece exclusivamente para `https://...`.
  - cria PIX no gateway de produção e exige pagamento real.
  - não deve ser alterado para acomodar o teste local.
- Produção — onboarding anônimo: `tests/onboarding-anonymous-production.spec.ts`
  - permanece como teste de segurança do gate.
  - para antes da autenticação e antes de qualquer ordem de pagamento.
- Local: `tests/local/golden-path-local.spec.ts`
  - usa `playwright.local.config.ts`.
  - só aceita `localhost`/`127.0.0.1`.
  - deve executar com `PAYMENT_MODE=sandbox`.

A configuração de produção ignora explicitamente `tests/local/**`, portanto o teste local não entra acidentalmente no pipeline de produção.

## Pré-requisitos

1. Node/npm instalados.
2. Dependências instaladas (`npm ci` ou `npm install`).
3. `.env` local configurado com as variáveis necessárias ao backend.
4. Credenciais de teste existentes:
   - `E2E_TEST_EMAIL` e `E2E_TEST_PASSWORD`, ou
   - `USER_TEST_LOGIN` e `USER_TEST_PASSWORD`.
5. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apontando para o projeto Supabase canônico de teste/integração autorizado.
6. Gateway configurado em sandbox.

**Nunca executar a suíte local com `PAYMENT_MODE=production`.**

## Execução

Terminal 1, se não houver servidor reaproveitável:

```bash
npm run dev
```

Terminal 2:

```bash
export PAYMENT_MODE=sandbox
npm run test:e2e:local
```

No PowerShell:

```powershell
$env:PAYMENT_MODE="sandbox"
npm run test:e2e:local
```

A configuração inicia/reaproveita o servidor local automaticamente em `http://127.0.0.1:3000`.

## Pagamento sandbox

O teste cria uma ordem PIX real no modo sandbox e verifica a persistência da ordem em `payment_orders`.

Antes de continuar para geração do documento, o runner exige explicitamente:

```text
LOCAL_E2E_PAYMENT_CONFIRMED=true
```

Essa variável só deve ser definida **depois** que o agente tiver confirmado o pagamento através do mecanismo de simulação/teste sandbox que já existe no projeto/gateway.

O agente deve primeiro localizar e verificar o mecanismo autoritativo existente no código. Não deve inventar endpoint, alterar `payment_orders` diretamente, usar SQL para marcar pagamento como pago, chamar `/simulate-payment` sem confirmar que esse endpoint é realmente o mecanismo local atual, nem usar qualquer mecanismo de produção.

Depois da confirmação sandbox:

```powershell
$env:PAYMENT_MODE="sandbox"
$env:LOCAL_E2E_PAYMENT_CONFIRMED="true"
npm run test:e2e:local
```

## O que o teste deve provar

```text
login
  ↓
case persistido
  ↓
facts persistidos
  ↓
evidence upload real
  ↓
OCR/processing real
  ↓
analysis real
  ↓
qualification
  ↓
review
  ↓
PIX sandbox real
  ↓
payment_orders persistido
  ↓
pagamento sandbox confirmado
  ↓
backend reconhece PAID
  ↓
geração do documento
  ↓
documents persistido
  ↓
reconciliação Supabase
```

Nenhum mock de UI, request, gateway ou banco deve ser introduzido para fazer o teste passar.

## Critérios de aprovação local

Considerar o Golden Path local **PASS** somente se:

- o servidor local iniciou sem erro;
- TypeScript/build não apresentam erro relevante para a execução;
- login funciona;
- caso é criado e persistido;
- upload/OCR funciona pelo caminho real;
- análise é produzida pelo backend real;
- PIX sandbox é criado pelo gateway configurado;
- `payment_orders` contém a ordem correspondente;
- pagamento sandbox chega a estado pago pelo caminho real do gateway/test harness;
- aplicação observa o estado pago;
- documento é gerado;
- `documents` contém documento ligado ao mesmo `case_id`;
- não há necessidade de mutação direta no Supabase para concluir o teste.

## Evidências que o agente deve registrar

Ao terminar, registrar:

- commit/HEAD testado;
- comando exato executado;
- URL local usada;
- `PAYMENT_MODE` efetivo;
- gateway sandbox efetivo;
- resultado Playwright;
- AIT E2E usado;
- `case_id` reconciliado;
- `payment_order` reconciliado;
- `document_id` reconciliado;
- eventuais falhas e stack trace relevante.

Não registrar valores de secrets, tokens, senhas ou service-role keys.

## Regra para produção

Mesmo com PASS local, **não marcar a Fase 4 como concluída**.

Quando o rate limit da Vercel liberar, executar novamente a suíte de produção existente sem modificá-la para transformar produção em sandbox. A aprovação final exige evidência do mesmo Golden Path em produção.
