# Fase 1 — Inventário técnico e baseline

**Data:** 2026-10-17  
**Escopo desta auditoria:** conteúdo remoto do GitHub, branch `main`; nenhuma alteração no código do produto.  
**Referência do repositório:** commit observado mais recente `a97123033248ea4bb1d295b1e163b45779ba5916` — [ver commit](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/a97123033248ea4bb1d295b1e163b45779ba5916).  
**Status da Fase 1:** **PARCIAL / BLOQUEADA**. O inventário de código foi iniciado e os riscos principais foram confirmados no conteúdo de `main`, mas a baseline executável e a identificação independente da versão ativa em produção não foram concluídas.

## 1. Proteção do legado e limites da execução

- Esta entrega só criou/atualizou documentação na branch `docs/onboarding-rebuild-plan`.
- Não houve edição de código de produto, alteração de banco, migração, deploy, cobrança nem escrita em produção.
- A auditoria remota não acessa o working tree WSL do usuário; portanto não declara limpo o checkout local, não inspeciona arquivos não rastreados/stashes locais e não altera nenhum deles.
- A branch documental e o PR #37 continuam separados de `main`; não foram mesclados.
- O código do repositório não é considerado automaticamente igual ao bundle/Worker publicado.

## 2. Baseline do repositório

### Arquitetura identificada

| Camada | Arquivo | Evidência / responsabilidade |
|---|---|---|
| Entrada Cloudflare | `cloudflare/worker.ts` | Registra as rotas de onboarding, casos, OCR, pagamentos e documentos; `/api/health` consulta a conectividade do banco e a configuração do gateway. |
| Configuração de produção declarada | `wrangler.jsonc` | Worker `adeusmulta`, entrada `cloudflare/worker.ts`, assets em `./dist`, binding AI e configuração de Supabase/gateway. |
| Wizard | `src/components/onboarding/OnboardingWizard.tsx` | Composição e estado das etapas; importa as etapas de identificação, dados específicos, processamento, resultado gratuito e geração de documento (linhas 84–94). |
| Persistência de navegação | `src/components/onboarding/OnboardingWizard.tsx` | `sessionStorage` guarda etapa, `savedCaseId`, `savedClaimToken` e data; o comentário proíbe persistir PII no armazenamento do browser (linhas 33–81). |
| Identificação/OCR | `src/components/onboarding/steps/InfractionIdentificationStep.tsx` | Coleta dados e chama `/api/ocr/analyze` (linhas 87–142). |
| Processamento local | `src/components/onboarding/steps/AnalysisProcessingStep.tsx` | Executa `ExpertRuleEngine.evaluate` no browser (linha 49) e percorre etapas com timers (linhas 56–80). |
| Motor determinístico | `src/core/rules/rule-engine.ts` | Avalia regras, gaps e inconsistências; calcula `overallSuccessRate` com uma tabela fixa de pontuações (linhas 909–930). |
| Entrada anônima e casos | `cloudflare/routes/cases.ts` | `POST /cases/anonymous` cria o caso anônimo (a partir da linha 46); rotas autenticadas reavaliam dados no servidor. |
| OCR Worker | `cloudflare/routes/ocr.ts` | Lê imagem multipart ou string base64 e retorna campos normalizados (linhas 71–135). |
| Pesquisa e geração jurídica | `cloudflare/rag-adapter.ts` | Adaptador de pesquisa lexical de fontes e análise; possui fallback determinístico quando a pesquisa falha. |
| Quality Gate de documento | `cloudflare/quality-gate.ts` e `cloudflare/routes/cases.ts` | O endpoint de geração de defesa chama o gate canônico e rejeita a minuta quando `overallPass` é falso; verificar qualidade substantiva separadamente. |
| E2E de onboarding anônimo | `tests/onboarding-anonymous-production.spec.ts` | Caminho até a barreira de autenticação, reconciliação por identificador sintético e limpeza por AIT; inclui escrita/exclusão no Supabase. |
| Configuração Playwright | `playwright.config.ts` | Exige `PLAYWRIGHT_BASE_URL` HTTPS e configura a suíte como execução contra implantação Cloudflare/produção, não localhost. |

### Comandos definidos em `package.json`

| Objetivo | Comando declarado | Resultado nesta execução |
|---|---|---|
| Build | `bun run build` (documentado em `CLOUDFLARE.md`) | **Não executado** — ambiente local do repositório não está disponível nesta sessão. |
| Typecheck/lint | `npm run lint` → `tsc --noEmit` | **Não executado**. |
| Testes unitários | `npm run test:unit` → `vitest run` | **Não executado**. |
| E2E de produção | `npm test` / `npm run test:e2e` | **Não executado**; requer URL HTTPS e pode criar/excluir registros no banco. |
| Governança | `npm run governance:check` | **Não executado**. |

Não se atribuem resultados de aprovação/reprovação aos comandos que não foram executados. O status CI visível no commit consultado não substitui a execução dos testes específicos do onboarding.

## 3. Achados confirmados no código de `main`

### P1 — Contrato OCR incompatível (bloqueador funcional)

**Frontend:** `src/components/onboarding/steps/InfractionIdentificationStep.tsx:87–101` envia JSON com `rawText: "Arquivo de Notificação: <nome>"`; não envia bytes/base64 do arquivo. A UI espera `data.success && data.extractedData` e lê `extractedData.infraction/vehicle`.

**Worker:** `cloudflare/routes/ocr.ts:71–87` exige arquivo em multipart (`file` ou `image`) ou o campo `image` em base64. Em `100–130`, aceita apenas JPEG/PNG/WEBP/GIF e retorna via adaptador os campos `rawText` e `fields`, não o contrato esperado pelo componente.

**Conclusão:** o fluxo OCR atual do componente e o endpoint Worker não estão contratualmente alinhados. Ainda é necessário confirmar se há um proxy legado alternativo atendendo `/api/ocr/analyze` no runtime ativo; isso não foi possível confirmar nesta execução.

### P1 — Mensagens de progresso afirmam trabalho que o trecho não demonstra

Em `src/components/onboarding/steps/AnalysisProcessingStep.tsx:49–80`, a análise executada pelo componente é `ExpertRuleEngine.evaluate` local. Os textos das etapas incluem “Calibrando probabilidade de deferimento ...” e “Diagnóstico jurídico ... concluído”, enquanto a progressão ocorre com timers. O trecho não mostra a conclusão de pesquisa remota nem uma calibração estatística antes de exibir essas mensagens. Isso deve ser corrigido ou comprovado com evidência de runtime antes de reutilizar a experiência.

### P1 — Indicador de êxito não possui calibração demonstrada

Em `src/core/rules/rule-engine.ts:909–930`, `overallSuccessRate` parte de 35 e recebe valores fixos conforme argumentos detectados (por exemplo, 98 para `ARG-048`, 94 para `ARG-051`, 92 para `ARG-001`); em seguida é limitado ao intervalo 25–99. No código inspecionado não há cálculo a partir de uma amostra observada de decisões administrativas. Até existir estudo de calibração, o indicador não deve ser descrito como probabilidade estatística de deferimento.

### P2 — Valores iniciais de nome/telefone podem ser confundidos com dados do usuário

Em `src/components/onboarding/steps/InfractionIdentificationStep.tsx:66–67`, o estado local usa nomes/telefone de exemplo quando as props estão vazias. O formulário exige esses valores em `79–85`. Confirmar se o payload final sempre é atualizado a partir dos campos e eliminar defaults fictícios da experiência real, preservando-os apenas em fixtures de teste.

### P2 — Retomada do wizard preserva metadados, não o formulário completo

Em `src/components/onboarding/OnboardingWizard.tsx:33–81`, o armazenamento do browser contém apenas etapa, IDs/token e timestamp, o que é positivo para minimizar PII. Porém o trecho, isoladamente, não prova a reidratação completa dos dados do caso a partir do servidor após recarregar/retornar. Isso precisa de um teste de retomada específico; não se deve ampliar armazenamento local para compensar.

### Controles úteis existentes a preservar e validar

- O Worker separa a entrada anônima da criação autenticada de casos.
- A rota anônima aplica limite por IP e valida os campos mínimos (`cloudflare/routes/cases.ts:46–97`).
- O motor registra `dataGaps` para regras cujos dados obrigatórios faltam; a semântica desconhecido/negado ainda precisa ser validada por cenário.
- O endpoint de geração de defesa executa `runCanonicalQualityGate` e bloqueia com HTTP 422 quando o gate reprova. Isso é um controle estrutural útil, mas não prova por si só que toda tese está juridicamente correta ou que o documento será aceito pela autoridade.
- A política declarada de sessão evita guardar PII do caso em `localStorage/sessionStorage`; manter essa proteção durante a reconstrução.

## 4. Versão publicada em produção

A documentação do repositório identifica o Worker Cloudflare `adeusmulta`, a entrada `cloudflare/worker.ts`, o domínio `https://adeusmulta.defesai.com.br` e a configuração `wrangler.jsonc` como fonte de verdade (`CLOUDFLARE.md:3–11`, `wrangler.jsonc:3–39`). O commit remoto observado contém um marcador `[DEPLOY-PRODUCTION]` e o arquivo `cloudflare/worker.ts` tem comentário de release.

**Bloqueio:** não foi possível obter uma confirmação independente do version ID/deployment ID ativo no Cloudflare nem inspecionar a aplicação real pela URL nesta execução. Portanto, **não declarar que o Worker ativo corresponde a `a971230` ou que os defeitos acima já foram reproduzidos em produção**. O acesso de leitura ao site não retornou evidência utilizável; nenhum endpoint mutável foi chamado.

## 5. Riscos e ações para fechar a Fase 1

1. **Baseline local pendente:** no checkout WSL correto, registrar `git status --short --branch`, `git rev-parse HEAD`, `git ls-files --others --exclude-standard` e `git stash list` sem reset/clean; preservar todos os arquivos locais, stashes e worktrees.
2. **Execução de qualidade pendente:** executar build, lint/typecheck, unit tests e governance check na cópia correta do repositório, registrando códigos de saída e logs resumidos. Não executar o E2E de produção até validar isolamento/reconciliação e o mecanismo de limpeza por identificador exato.
3. **Versão de produção pendente:** obter o deployment/version ID ativo do Worker Cloudflare por uma fonte administrativa autorizada e associá-lo ao commit de origem; não inferir por nome de domínio ou mensagem de commit.
4. **Runtime OCR pendente:** confirmar qual rota atende `/api/ocr/analyze` em produção e reproduzir o contrato com arquivo sintético, sem criar caso nem efetuar cobrança.
5. **Baseline E2E pendente:** os testes de escrita em produção permanecem bloqueados até que o identificador sintético seja único, a reconciliação encontre exatamente o registro criado e a limpeza confirme remoção do mesmo ID; nenhuma cobrança real.

## 6. Decisão da Fase 1

**Status: BLOQUEADA / PARCIAL.** O inventário remoto e a análise estática foram realizados, com riscos funcionais concretos identificados. Os critérios de saída ainda não foram atendidos porque não existe resultado executado de build/testes nesta sessão, o working tree local não foi inspecionado e o deployment ativo não foi correlacionado a um commit.

A próxima ação é fechar esses três itens de baseline e runtime. A reconstrução da interface e a Fase 2 não devem começar até haver evidência suficiente e o working tree local estar protegido.
