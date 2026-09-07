# PROMPT — Agente Local — E2E Golden Path Real

## Objetivo

Executar uma auditoria operacional do frontend do Adeus Multa usando o ambiente local real, Playwright e Supabase real de teste, sem mascarar falhas.

O objetivo NÃO é produzir um PASS artificial. O objetivo é provar ou refutar a cadeia:

```text
primeiro usuário
→ onboarding
→ serviço
→ dados
→ case persistido
→ análise
→ pagamento de teste
→ sincronização
→ geração
→ documento persistido
→ documento correto
```

## Regras obrigatórias

1. Não alterar o comportamento do produto antes de reproduzir e registrar o primeiro failure.
2. Não bloquear requisições ao Supabase no Golden Path.
3. Não usar `localStorage` como substituto de autenticação real no Golden Path.
4. Não usar `Condutor Teste`, CPF fixo, AIT fake ou qualquer fallback para declarar sucesso.
5. Não considerar uma tela de sucesso como prova de geração.
6. Não apagar testes existentes.
7. Não desabilitar testes para obter PASS.
8. Não commitar credenciais, tokens, cookies, service-role keys ou arquivos `.env`.
9. Usar somente dados sintéticos controlados.
10. Se encontrar um bug, registrar primeiro a evidência e a cadeia causal. Só corrigir depois de autorizado pela etapa seguinte da auditoria.

## FASE 1 — Inventário sem alteração

No repositório atual:

- listar todos os testes Playwright;
- identificar testes unitários, integração, UI controlada e E2E real;
- identificar mocks, stubs, `page.route`, bloqueios de Supabase, localStorage auth e dados fake;
- mapear rotas do frontend relacionadas a primeiro acesso, onboarding, caso, pagamento e documento;
- mapear hooks/components responsáveis pelo fluxo;
- mapear endpoints chamados pelo frontend;
- mapear repositories e pontos de persistência;
- mapear fluxo de análise → argumentos → documento;
- mapear fluxo de pagamento → case;
- identificar onde o documento final é criado, salvo e apresentado.

Produzir:

`docs/audit/E2E-LOCAL-INVENTORY.md`

O relatório deve conter uma tabela:

| Etapa | Arquivo/rota | Mecanismo | Real ou mock | Persistência real? | Teste existente | Observação |
|---|---|---|---|---|---|---|

Não corrigir nada nesta fase.

## FASE 2 — Ambiente

Verificar:

```bash
node -v
npm -v
pnpm -v || true
npx playwright --version
```

Subir a aplicação de forma compatível com o projeto.

Confirmar:

- servidor responde;
- frontend carrega;
- não há erro fatal no console;
- Supabase de teste está configurado;
- credenciais ficam somente em ambiente local;
- navegador Chromium está disponível.

Se o ambiente impedir a execução, registrar exatamente o bloqueio e parar a execução operacional; não inventar resultado.

## FASE 3 — Golden Path

Criar ou adaptar um teste dedicado, preferencialmente:

`tests/e2e/golden-path/first-user-defense.spec.ts`

O teste deve iniciar com contexto de navegador limpo:

- sem cookies;
- sem localStorage;
- sem sessionStorage;
- sem autenticação administrativa simulada.

Usar um usuário de teste real, criado de forma segura conforme o mecanismo de autenticação existente.

### Dados sintéticos

Gerar valores únicos por execução, por exemplo:

```text
E2E User <timestamp>
E2E AIT <timestamp>
E2E plate <timestamp>
```

Registrar esses identificadores no relatório, nunca credenciais.

### Fluxo

Percorrer pelo navegador, sem chamar diretamente APIs para pular etapas:

1. landing/primeiro acesso;
2. cadastro/login;
3. onboarding;
4. escolha de um único serviço representativo;
5. dados do condutor;
6. dados da infração;
7. upload sintético se o fluxo exigir;
8. revisão;
9. submissão/criação do caso;
10. análise;
11. checkout/pagamento de teste disponível no ambiente;
12. confirmação do pagamento;
13. geração da defesa;
14. abertura/visualização/download do documento.

## FASE 4 — Provas por etapa

O teste deve registrar evidência de cada etapa importante.

No mínimo:

```text
landing
signup/login
onboarding
case-created
analysis-complete
payment-complete
document-generated
document-visible
```

Usar Playwright trace, screenshot em falha e logs de console/pageerror.

Não armazenar segredos nas evidências.

## FASE 5 — Integridade ponta a ponta

Após o documento ser produzido, verificar no banco, usando mecanismo seguro de teste, que:

```text
user
  ↓
case
  ↓
analysis
  ↓
payment
  ↓
document
```

referem-se ao mesmo fluxo.

Comparar pelo menos:

```text
Nome
CPF
AIT
Placa
Órgão autuador
Serviço
```

entre os dados fornecidos e o documento final.

O teste deve falhar se encontrar dados de fallback como:

```text
Condutor Teste
123.456.789-09
TEST-123456
```

quando eles não foram fornecidos pelo teste.

## FASE 6 — Tratamento do P0 conhecido

Existe um problema já identificado na auditoria anterior:

```text
wizard POST /api/cases
        ↓
   casesStore

payment/admin
        ↓
 caseRepository
```

O teste deve verificar se o mesmo case atravessa essa fronteira.

Se houver fallback por não localizar o case, registrar:

- request original;
- case ID;
- store/repository usado;
- resposta de pagamento;
- estado do case;
- dados usados na geração;
- documento produzido;
- evidência do fallback.

NÃO mascarar o problema.

## FASE 7 — Relatório

Produzir:

`docs/audit/E2E-GOLDEN-PATH-EXECUTION.md`

Formato mínimo:

```text
# E2E Golden Path Execution

Status: PASS | FAIL | BLOCKED

Environment:
- commit:
- Node:
- Playwright:
- browser:
- base URL:

## Steps
01 ... PASS/FAIL
02 ... PASS/FAIL
...

## IDs
User:
Case:
Analysis:
Payment:
Document:

## Integrity
Nome: PASS/FAIL
CPF: PASS/FAIL
AIT: PASS/FAIL
Placa: PASS/FAIL
Órgão: PASS/FAIL

## Failures
...

## Root cause
...

## Evidence
Trace:
Screenshots:
Logs:
```

## FASE 8 — Commit

Somente os artefatos de auditoria/teste e mudanças explicitamente autorizadas podem ser commitados.

Antes do commit:

```bash
git status --short
git diff --check
```

Nunca incluir:

```text
.env
credentials
cookies
tokens
service-role keys
screenshots contendo segredos
```

## FASE 9 — Parada obrigatória

Depois da primeira execução do Golden Path:

- se PASS: não expandir ainda; devolver evidências e aguardar próxima instrução;
- se FAIL: não corrigir automaticamente; devolver causa provável + evidências;
- se BLOCKED: devolver exatamente o bloqueio e o comando/ação necessária;
- se houver risco de perda de dados, parar imediatamente.

## Resultado esperado desta missão

O resultado desta missão NÃO é “corrigir tudo”.

É responder objetivamente:

> Um primeiro usuário consegue completar, no navegador real, um serviço completo do Adeus Multa até receber o documento correto, com os mesmos dados persistidos e sem fallback?

Se a resposta for não, identificar exatamente a primeira fronteira quebrada.
