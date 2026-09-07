# E2E Golden Path Audit — Adeus Multa

**Data:** 2026-09-07  
**Objetivo:** provar, com navegador real e persistência real, a coesão do fluxo de primeiro usuário até o documento final.

## 1. Situação encontrada

O repositório possui Playwright e uma quantidade relevante de testes, mas os testes atuais não comprovam ainda uma jornada vertical completa de primeiro usuário → serviço → caso → análise → pagamento → documento.

`package.json` expõe `test`, `test:e2e` e `test:e2e:service`, todos baseados em Playwright. `playwright.config.ts` atualmente sobe o servidor com credenciais Supabase locais fictícias, bloqueia várias áreas de testes e coleta trace apenas no primeiro retry. Isso é adequado para parte da suíte, mas não prova integração E2E real com Supabase. 

O teste `tests/comprehensive-case-creation.spec.ts` explicitamente bloqueia requisições ao Supabase e injeta autenticação via `localStorage`; portanto, ele é um teste de UI/fluxo controlado, não um Golden Path de primeiro usuário real.

O teste `tests/comprehensive-onboarding.spec.ts` percorre vários cenários até checkout, mas também não comprova pagamento real, geração final e conteúdo persistido do documento.

## 2. Golden Path obrigatório

```text
Browser context limpo
  ↓
Landing / primeiro acesso
  ↓
Cadastro / autenticação real
  ↓
Onboarding
  ↓
Escolha de serviço
  ↓
Dados do condutor
  ↓
Dados da infração
  ↓
Upload controlado
  ↓
Revisão
  ↓
Case persistido
  ↓
Análise
  ↓
Pagamento de teste
  ↓
Case/payment sincronizados
  ↓
Geração da defesa
  ↓
Documento persistido
  ↓
Documento exibido/baixado
  ↓
Validação de identidade e dados
```

## 3. Invariantes do Golden Path

O teste deve gerar dados sintéticos únicos por execução e provar:

- usuário criado e autenticado;
- case criado para o usuário correto;
- case persistido no banco;
- análise associada ao mesmo case;
- pagamento associado ao mesmo case;
- documento associado ao mesmo case/usuário;
- nome, CPF, AIT, placa e órgão usados no documento correspondem aos dados de entrada;
- nenhum fallback sintético conhecido (`Condutor Teste`, `123.456.789-09`, `TEST-123456`) pode aparecer quando o teste forneceu dados próprios;
- documento final é realmente produzido e persistido, não apenas uma tela de sucesso.

## 4. Achado P0 já conhecido

Existe uma fronteira problemática já identificada na execução anterior:

```text
POST /api/cases → casesStore
payment/admin → caseRepository
```

Quando o repositório não encontra o caso criado pelo wizard, há risco de fallback para dados fictícios. Este problema deve permanecer registrado durante a primeira execução do Golden Path; não deve ser mascarado pelo teste.

## 5. Estratégia de execução

### Fase A — inventário

Não alterar comportamento do produto. Mapear testes, rotas, hooks, APIs, repositories, persistência, pagamento e geração de documentos.

### Fase B — Golden Path

Criar um único teste Playwright dedicado ao primeiro usuário e a um único serviço representativo.

### Fase C — evidências

Guardar trace, screenshots em falha, console/page errors, IDs de usuário/case/payment/document e resumo por etapa.

### Fase D — correção

Corrigir somente a causa comprovada pelo primeiro failure. Reexecutar o Golden Path e a regressão correspondente.

### Fase E — matriz

Somente após o Golden Path passar, expandir para outros serviços, tipos de infração e demais cenários suportados.

## 6. Critério de confiança

Não considerar o produto E2E aprovado por:

- URL final correta isoladamente;
- texto genérico de sucesso;
- localStorage como autenticação de produção;
- bloqueio de Supabase;
- dados administrativos/fake;
- mock do pagamento;
- documento apenas existente em memória.

A aprovação exige uma cadeia verificável de entrada → persistência → processamento → documento.

## 7. Próximo executor

A execução que depende de navegador, servidor local, credenciais de teste e Supabase real deve ser delegada ao agente local. O prompt operacional correspondente está em `docs/audit/E2E-GOLDEN-PATH-LOCAL-AGENT-PROMPT.md`.
