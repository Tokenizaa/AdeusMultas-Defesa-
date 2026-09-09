# FASE 4 — GOLDEN PATH E2E — RESULTADO DE EXECUÇÃO

**Data:** 2026-09-09  
**Ambiente-alvo:** produção Vercel — `https://www.defesai.shop`  
**Supabase canônico:** `sgomwklorpzdwdubtmgg`

## Veredito

**🔴 BLOQUEADA — Golden Path ainda não comprovado em produção.**

A Fase 4 agora teve uma tentativa E2E real executada pelo GitHub Actions contra produção. A infraestrutura do executor, credenciais externas e acesso ao Supabase foram aceitos pelo workflow, porém a execução parou no primeiro passo de autenticação por incompatibilidade entre o seletor usado pelo teste e o markup real da página de login.

Isso é progresso de evidência: o bloqueio deixou de ser "não existe executor" e passou a ser um **defeito concreto do harness E2E**. A cadeia de negócio ainda não foi exercitada e, portanto, a Fase 4 continua bloqueada.

## Evidências confirmadas

### 1. Produção está acessível e foi recuperada

`GET /api/health` em `https://www.defesai.shop` respondeu HTTP 200 após o novo deployment de produção `dpl_DVXqj5PYNjwHGzq4myEQuT9ykusN`.

O deployment foi criado a partir do commit `8aa42558986071828d75c53dd5f8ac40e13d7d0a` e terminou em estado `READY`, com os aliases de produção `www.defesai.shop`, `adeusmultas.defesai.shop`, `adeusmultasdefesai.vercel.app` e `defesai.shop`.

A resposta identifica o serviço como `DefesAi API` e a política CSP ativa referencia o Supabase canônico `sgomwklorpzdwdubtmgg.supabase.co`.

### 2. Bloqueador de build corrigido

O deployment anterior falhava no `bun install` porque `package.json` declarava `ioredis@^6.3.4`, enquanto o registro npm atualmente publica `ioredis` 6.0.0 como versão estável da linha 6. O `bun.lock` já estava alinhado em `ioredis@^6.0.0`.

A correção foi aplicada no `package.json` e commitada em:

`8aa42558986071828d75c53dd5f8ac40e13d7d0a`

O novo deployment concluiu build e deploy com sucesso.

### 3. Rotas de produção respondem

`GET /novo-caso` respondeu HTTP 200.

`GET /api/health` respondeu HTTP 200.

### 4. Primeira execução E2E real — infraestrutura aprovada, teste falhou no login

Foi criada uma execução isolada do workflow de produção no GitHub Actions:

- Workflow: `Golden Path — Production`
- Run: `34372940368`
- Commit executor: `d6607a19e6d6d4a9416da96468e278c25c476d6f`
- Resultado: **failure**
- Artifact Playwright: `golden-path-production-report-34372940368`

As etapas de infraestrutura passaram:

- checkout
- Node.js 22
- npm 11.6.0
- geração/verificação de `package-lock.json`
- `npm ci`
- `postinstall`
- Chromium
- verificação do alvo HTTPS de produção
- verificação da configuração do Golden Path

A falha ocorreu em `tests/golden-path-production.spec.ts`, durante o login:

```text
TimeoutError: locator.fill: Timeout 15000ms exceeded
waiting for getByLabel(/E-mail do Condutor ou Administrador/i)
```

O snapshot real da página mostrou que o texto `E-mail do Condutor ou Administrador` é um elemento visual separado, enquanto o campo é exposto como textbox pelo placeholder `seu.email@exemplo.com`. O mesmo padrão ocorre com o campo de senha.

A correção aplicada no branch de execução substitui os seletores incorretos por:

```ts
page.locator('input[type="email"]')
page.locator('input[type="password"]')
```

Commit da correção do harness:

`be582e52589588fe62a4a1c1c69ad55da692b565`

Nenhum caso, `payment_order` ou documento foi criado pela tentativa que falhou no login.

### 5. O banco canônico continua sem resultado de Golden Path

A evidência anterior permanece válida:

| Entidade | Registros |
|---|---:|
| `cases` | 9 |
| `payment_orders` | 0 |
| `documents` | 0 |

Não existe ainda no banco canônico um encadeamento vertical completo que possa ser reutilizado como evidência.

## Estado atual do harness

O workflow foi preparado para uma execução controlada de produção. Para evitar execução em todo push do produto, o disparo automático está restrito a alterações do artefato de auditoria da Fase 4 no branch `main`, mantendo também `workflow_dispatch`/`workflow_call`.

O próximo disparo deve usar o seletor corrigido e produzir a primeira evidência útil de autenticação → criação de caso → análise → PIX.

### Disparo de execução 2

A presente atualização do artefato de auditoria é intencional e serve como evento de execução do Golden Path no `main`. O workflow, já incorporado ao `main`, está restrito a este arquivo para impedir disparos acidentais durante o desenvolvimento normal.

## P0/P1 ainda abertos

1. Reexecutar o Golden Path com o seletor de login corrigido.
2. Criar e reconciliar `payment_order` + `payment_attempt` reais.
3. Confirmar o PIX real pelo gateway, sem simulação.
4. Gerar e persistir efetivamente o documento em Storage + `documents.document_url`/`storage_path`.
5. Reconciliar os IDs reais de caso, análise, pagamento e documento após a jornada.
6. Cobrir o caminho de recuperação quando pagamento confirmado não produz documento.

## Critério de saída da Fase 4

A Fase 4 permanece **🔴 BLOQUEADA** até existir uma execução concluída cujo relatório contenha os IDs reais de:

- `cases.id`
- identidade/versionamento da análise
- `payment_orders.id` e/ou `payment_attempts.id`
- `documents.id`
- evidência do documento persistido no Storage

Nenhum estado `ready`, `paid` ou `document` deve ser aceito somente por UI, fixture ou inserção direta no banco.
