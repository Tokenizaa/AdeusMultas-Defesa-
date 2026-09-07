# E2E GOLDEN PATH — ROADMAP DE AUDITORIA E EXECUÇÃO

**Produto:** Adeus Multa  
**Objetivo:** provar uma jornada vertical real, coerente e auditável, do primeiro acesso do usuário ao documento final persistido.  
**Regra:** uma fase por vez. Cada fase termina com evidência, atualização deste documento e commit próprio.

---

# 1. VISÃO GERAL

A execução será conduzida em fases independentes para evitar que investigação, correção, automação e validação sejam misturadas.

```text
FASE 0 — MAPEAMENTO FORENSE
        ↓
FASE 1 — AUDITORIA DE CONTRATOS E DATA LINEAGE
        ↓
FASE 2 — CORREÇÃO DOS BLOQUEADORES
        ↓
FASE 3 — PREPARAÇÃO DO AMBIENTE E TEST DATA
        ↓
FASE 4 — GOLDEN PATH PLAYWRIGHT
        ↓
FASE 5 — VALIDAÇÃO DE PERSISTÊNCIA E DOCUMENTO
        ↓
FASE 6 — HARDENING / REGRESSÃO DO GOLDEN PATH
        ↓
FASE 7 — MATRIZ DE SERVIÇOS E VARIAÇÕES
        ↓
FASE 8 — GATE FINAL E HANDOFF PARA AUDITORIA
```

**Importante:** nenhuma fase deve pular a anterior sem registrar formalmente o motivo.

---

# 2. FASE 0 — MAPEAMENTO FORENSE

## Objetivo

Descobrir como o produto realmente funciona hoje, sem alterar o sistema.

## O que será feito

- mapear primeira rota e primeiro acesso;
- mapear autenticação e sessão;
- reconstruir a ordem real do onboarding;
- identificar componentes, hooks e estado;
- identificar todos os campos e validações;
- mapear selectors existentes;
- mapear APIs, payloads e respostas;
- mapear criação e persistência do caso;
- mapear repositories, stores e fontes de verdade;
- mapear análise;
- mapear pagamento e autorização;
- mapear geração do documento;
- mapear storage e URL final;
- localizar mocks, fixtures, fakes e fallbacks;
- catalogar os testes existentes e o que cada um realmente prova.

## Regra

**READ-ONLY.** Não corrigir código, testes, banco ou configuração.

## Saída

`docs/audit/E2E-CONTRACT-MAP.md`

## Critério de conclusão

Mapa factual suficiente para reconstruir o fluxo sem depender de tentativa e erro no navegador.

## Commit

`docs(audit): map e2e product contract`

---

# 3. FASE 1 — AUDITORIA DE CONTRATOS E DATA LINEAGE

## Objetivo

Confrontar o mapa da Fase 0 e descobrir onde a cadeia quebra ou possui contratos incoerentes.

## O que será feito

Para cada etapa, confrontar:

`UI → state → API → backend → persistência → consumidor seguinte`

Validar especialmente:

- user ID;
- case ID;
- dados do caso;
- analysis ID;
- payment ID;
- document ID;
- autorização para geração;
- relação caso/usuário;
- relação pagamento/caso;
- relação documento/caso;
- conteúdo do documento versus dados de entrada.

Investigar explicitamente divergências como:

`casesStore ≠ caseRepository`

ou qualquer equivalente encontrado no código atual.

## Regra

**Ainda não corrigir.** O objetivo é produzir diagnóstico e causa-raiz antes da implementação.

## Saída

Atualização de `docs/audit/E2E-GOLDEN-PATH-AUDIT.md` com:

- 🟢 confirmado;
- 🔴 bloqueadores;
- 🟡 riscos;
- ⚫ não verificável;
- primeira divergência do lineage;
- camada responsável;
- correção recomendada.

## Commit

`docs(audit): identify golden path contract gaps`

---

# 4. FASE 2 — CORREÇÃO DOS BLOQUEADORES

## Objetivo

Corrigir os defeitos reais encontrados nas Fases 0–1 sem mascará-los nos testes.

## O que será feito

- corrigir fonte de verdade divergente;
- corrigir contratos frontend/backend;
- corrigir persistência;
- corrigir autorização;
- corrigir fluxo de pagamento;
- corrigir lineage de análise;
- corrigir geração/documento;
- remover fallbacks produtivos indevidos;
- corrigir outros bloqueadores comprovados.

Usar os agentes especializados existentes:

- `@frontend`
- `@backend`
- `@banco`
- `@architecture-test`
- `@qualidade`

## Regra

Não adaptar o teste para aceitar o defeito.

Não criar fake data para contornar integração.

Cada correção deve ter evidência e teste apropriado.

## Saída

Código corrigido + testes de regressão direcionados + atualização da auditoria.

## Commit

Mensagem conforme a correção, por exemplo:

`fix(e2e): align case payment and document lineage`

---

# 5. FASE 3 — PREPARAÇÃO DO AMBIENTE E TEST DATA

## Objetivo

Preparar uma execução E2E real, determinística e segura.

## O que será feito

- validar servidor local;
- validar build/runtime necessário;
- validar usuário de teste;
- validar autenticação real;
- definir dados exclusivos do Golden Path;
- garantir isolamento dos dados;
- verificar acesso às fontes de persistência;
- definir captura de requests/responses;
- configurar tracing/screenshots/video quando necessário;
- confirmar selectors estáveis;
- remover dependências de dados manuais não reproduzíveis.

## Regra

Não usar credenciais reais no repositório.

Não registrar secrets, tokens ou dados pessoais em evidências.

## Critério de conclusão

O ambiente deve estar pronto para executar a jornada sem alterações improvisadas durante o teste.

## Commit

Somente se houver alterações versionáveis de infraestrutura/test harness.

---

# 6. FASE 4 — GOLDEN PATH PLAYWRIGHT

## Objetivo

Executar a primeira jornada vertical real do produto.

## Fluxo-alvo

```text
primeiro acesso
→ autenticação
→ serviço
→ dados
→ caso
→ análise
→ pagamento
→ autorização
→ geração
→ documento
```

A sequência exata deve respeitar o fluxo real descoberto nas fases anteriores.

## O que será comprovado

- usuário real de teste;
- case ID real;
- dados fornecidos pelo usuário;
- analysis ID;
- payment ID;
- document ID;
- preservação da identidade dos dados;
- ausência de fallback/fake no caminho produtivo;
- estado final acessível.

## Regra

Teste verde isolado não equivale a Golden Path PASS.

## Saída

Teste Playwright definitivo + artifacts + relatório de execução.

## Commit

`test(e2e): establish real product golden path`

---

# 7. FASE 5 — VALIDAÇÃO DE PERSISTÊNCIA E DOCUMENTO

## Objetivo

Provar que o resultado exibido no frontend é o mesmo resultado persistido no sistema.

## O que será feito

Validar diretamente, conforme acesso disponível:

- caso no banco;
- usuário relacionado;
- dados do caso;
- análise relacionada;
- pagamento relacionado;
- status de autorização;
- documento persistido;
- document ID;
- relação documento/caso/usuário;
- storage;
- URL final;
- conteúdo mínimo do documento;
- correspondência entre dados de entrada e documento final.

## Regra anti-fallback

Se o documento apresentar dados diferentes dos fornecidos no Golden Path, é `🔴 FAIL`, mesmo que a interface e o Playwright estejam verdes.

## Saída

Evidência de lineage completo:

`user → case → analysis → payment → document`

## Commit

Atualização de auditoria/evidências e correções adicionais, se necessárias.

---

# 8. FASE 6 — HARDENING / REGRESSÃO DO GOLDEN PATH

## Objetivo

Garantir que a correção não seja frágil e que o Golden Path continue reproduzível.

## O que será feito

- rerun do Golden Path limpo;
- verificar isolamento de dados;
- verificar estabilidade dos selectors;
- eliminar waits/retries artificiais;
- verificar comportamento de erro;
- verificar que não existem regressões introduzidas pelas correções;
- confirmar que testes não dependem de estado residual.

## Regra

Não transformar o teste em uma coleção de retries para esconder instabilidade.

## Saída

Golden Path reproduzível e documentado.

---

# 9. FASE 7 — MATRIZ DE SERVIÇOS E VARIAÇÕES

## Objetivo

Somente depois de uma jornada vertical comprovadamente funcional, expandir a cobertura.

## O que será feito

Expandir progressivamente para:

- serviços;
- tipos de procedimento;
- categorias de infração;
- UFs suportadas;
- órgãos;
- cenários de pagamento;
- cenários de análise;
- variações de documento.

A matriz deve respeitar a cobertura real do produto e não criar falsa impressão de cobertura nacional.

## Regra

Não expandir para dezenas de combinações enquanto o Golden Path base estiver quebrado.

## Saída

Matriz de cobertura com:

`SUPPORTED / PARTIAL / UNSUPPORTED / NOT_TESTED`

---

# 10. FASE 8 — GATE FINAL E HANDOFF PARA AUDITORIA

## Objetivo

Produzir o estado final auditável no GitHub.

## O que será feito

Consolidar:

- mapa do contrato;
- auditoria;
- correções;
- testes;
- evidências;
- lineage;
- matriz de cobertura;
- limitações conhecidas;
- commits relevantes.

## Critério de PASS FINAL

Só declarar Golden Path aprovado se houver evidência simultânea de:

```text
🟢 usuário autenticado
🟢 caso real criado
🟢 caso persistido
🟢 dados preservados
🟢 análise ligada ao caso
🟢 pagamento ligado ao caso
🟢 autorização real
🟢 documento real gerado
🟢 documento ligado ao mesmo caso/usuário
🟢 conteúdo coerente
🟢 storage persistido
🟢 URL final acessível
🟢 ausência de fallback/fake
```

## Saída

Relatório final de auditoria + referência dos commits.

---

# 11. PROTOCOLO VISUAL OBRIGATÓRIO

Todos os agentes envolvidos devem utilizar:

- 🟢 `PASS` — comprovado;
- 🔴 `FAIL` — defeito concreto;
- 🟡 `WARNING` — risco não bloqueante;
- 🟠 `PENDING` — ainda não executado/comprovado;
- ⚫ `BLOCKED` — dependência externa;
- 🔵 `INFO` — descoberta relevante.

Todo relatório de fase deve começar com um resumo visual:

```text
# 🔎 FASE N — RESULTADO

## 🟢 CONFIRMADO
## 🔴 BLOQUEADORES
## 🟡 RISCOS
## 🟠 PENDÊNCIAS
## ⚫ BLOQUEADO
## 📊 PROGRESSO
## 🎯 PRÓXIMA AÇÃO
```

Nunca usar `PASS` somente porque build, TypeScript ou um teste isolado passou.

---

# 12. PROTOCOLO DE ATUALIZAÇÃO DESTE ROADMAP

Este arquivo é o **documento mestre de coordenação** da auditoria.

## O agente local deve atualizar

Ao terminar cada fase:

1. marcar o status da fase;
2. registrar data/commit;
3. registrar principais evidências;
4. registrar bloqueadores;
5. registrar próxima fase;
6. não apagar histórico anterior.

## Auditor externo deve atualizar

Após revisar cada commit no GitHub, a auditoria pode acrescentar:

- validação independente;
- divergências encontradas na revisão;
- status de auditoria;
- observações que o agente local não poderia confirmar.

## Nunca fazer

- marcar uma fase como PASS sem evidência;
- apagar FAIL para deixar o roadmap verde;
- misturar conclusões de fases futuras em fases ainda não executadas.

---

# 13. ESTADO ATUAL

| Fase | Status | Commit | Auditoria |
|---|---|---|---|
| Fase 0 — Mapeamento Forense | 🟠 PENDING | — | 🟠 PENDING |
| Fase 1 — Contratos/Data Lineage | 🟠 PENDING | — | 🟠 PENDING |
| Fase 2 — Correção dos Bloqueadores | 🟠 PENDING | — | 🟠 PENDING |
| Fase 3 — Ambiente/Test Data | 🟠 PENDING | — | 🟠 PENDING |
| Fase 4 — Golden Path Playwright | 🟠 PENDING | — | 🟠 PENDING |
| Fase 5 — Persistência/Documento | 🟠 PENDING | — | 🟠 PENDING |
| Fase 6 — Hardening/Regressão | 🟠 PENDING | — | 🟠 PENDING |
| Fase 7 — Matriz de Serviços | 🟠 PENDING | — | 🟠 PENDING |
| Fase 8 — Gate Final/Handoff | 🟠 PENDING | — | 🟠 PENDING |

---

# 14. REGRA OPERACIONAL PARA O AGENTE LOCAL

O agente local deve consultar este documento **antes de iniciar qualquer fase**.

Ele deve executar **somente a fase explicitamente delegada**.

Ao terminar:

1. atualizar este roadmap;
2. produzir os artefatos da fase;
3. executar as validações previstas;
4. fazer o commit da fase;
5. informar o SHA;
6. parar.

A próxima fase será liberada somente após revisão do resultado.

**Este roadmap é a referência operacional compartilhada entre o agente local e os auditores.**
