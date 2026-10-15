# Auditoria dos Dashboards — DefesAi

**Data:** 2026-10-15  
**Escopo:** dashboard do condutor, lista/detalhe de casos, console administrativo, comercial, pagamentos, observabilidade, conhecimento, marketing e afiliados.  
**Objetivo:** estabelecer um plano verificável para deixar os painéis coerentes, seguros e aptos para operação.

## Sumário executivo

Os dashboards já possuem uma topologia funcional ampla, porém ainda há divergência entre o contrato de estados do banco/API e os estados usados em alguns componentes React. O maior risco imediato é de indicadores incorretos no painel do condutor, especialmente contagens de casos prontos, em análise e rascunho. O segundo risco é operacional: vários painéis administrativos fazem chamadas `fetch` diretamente e precisam ser auditados para garantir propagação de autenticação, tratamento de erro e autorização no backend.

O dashboard não deve ser considerado certificado para produção antes da execução do plano abaixo, principalmente dos testes de autorização por papel e dos testes visuais autenticados.

## Achados priorizados

### P0 — Indicadores do dashboard do condutor usam estados que não são canônicos

`src/components/user/UserDashboardView.tsx` calcula métricas com estados em inglês (`defense_ready`, `filed`, `analyzed`, `paid`, `draft`), enquanto o schema e o backend usam estados como `analisado`, `defesa_pronta`, `finalizado` e `aguardando_pagamento`.

**Impacto:** cartões de métricas podem mostrar zero ou classificar casos na categoria errada. Isso afeta diretamente a confiança do usuário e a operação de suporte.

**Ação:** criar um único mapper de status canônico compartilhado por dashboard, tabela e detalhe; cobrir todos os estados permitidos pelo banco; remover comparações literais espalhadas.

### P0 — Geração documental precisa permanecer protegida por pagamento no backend

O endpoint `POST /api/cases/:id/generate-defense` agora exige `is_paid=true`, e o botão do detalhe também é bloqueado para casos não pagos. Essa proteção foi publicada e validada por testes de autorização.

**Ação de manutenção:** adicionar teste E2E autenticado do dashboard para comprovar a experiência visual e um teste de regressão que tente chamar o endpoint diretamente com caso não pago.

### P1 — Chamadas administrativas precisam de contrato uniforme de autenticação e erro

Há componentes administrativos que chamam `fetch('/api/...')` diretamente, enquanto outros usam `useAuthFetch` ou o cliente `api`. Cada chamada deve ser verificada contra o middleware de autenticação/autorização correspondente.

**Impacto:** telas podem aparecer vazias, falhar silenciosamente ou depender de cookies/headers implícitos; mensagens de erro ficam inconsistentes.

**Ação:** padronizar `useAuthFetch`/cliente autenticado, exigir `res.ok`, normalizar erros e incluir estados de loading, vazio e falha em cada painel.

### P1 — Console administrativo possui superfície maior que o necessário para o primeiro release

O menu inclui IA, marketing, prospecção, conhecimento, afiliados, comercial, E2E, integridade, logs, monitoramento e integrações. Cada rota precisa de matriz explícita de permissão, não apenas do agrupamento visual do menu.

**Ação:** catalogar rota → papel → operação; validar acesso direto por URL para cidadão, operador e administrador; esconder somente é UX, nunca controle de segurança.

### P1 — Nomenclatura e textos operacionais estão parcialmente desatualizados

Há títulos que ainda mencionam PagBank enquanto o gateway primário atual é VenoPag. Também existem estados e rótulos misturados entre português e inglês.

**Ação:** centralizar labels, gateway ativo, estados e mensagens de erro em contratos compartilhados; remover textos específicos de provedores antigos onde não forem aplicáveis.

### P2 — Sincronização global de casos pode exibir estado anterior

`App.tsx` possui invalidação por evento e recarga dos casos, mas `activeCase` é mantido em estado local. É necessário validar retomada por URL, atualização após webhook, logout/login e múltiplas abas.

**Ação:** definir fonte única de verdade para `cases`/`activeCase`, invalidar após mutações e testar concorrência entre pagamento, webhook e navegação.

### P2 — Acessibilidade e responsividade precisam de auditoria visual sistemática

A navegação possui IDs e alguns labels acessíveis, mas a quantidade de painéis e tabelas exige teste em viewport móvel, teclado, foco, contraste, mensagens de erro e banners persistentes de LGPD/cookies.

**Ação:** executar matriz desktop/mobile, teclado-only e axe/Lighthouse; corrigir overflow, foco perdido em modais, tabelas sem alternativa móvel e botões sem nome acessível.

## Execução inicial — Dashboard do usuário

**Branch:** `fix/user-dashboard-canonical-status`  
**Commit da implementação:** `479c2b7826ba5e73a285d61cc42051527071a82b`

Alterações aplicadas em `src/components/user/UserDashboardView.tsx`:

- Os contadores agora usam estados canônicos definidos em `src/types/index.ts`: `defesa_pronta`, `analisando`, `analisado`, `gerando_documento` e `aguardando_pagamento`.
- Os estados legados `novo` e `aguardando_documentos` são apresentados como rascunho, sem serem confundidos com estados de análise.
- A lista recente exibe rótulos compatíveis com os estados canônicos.
- Foram removidos os valores fixos de economia potencial e pontos protegidos: esses indicadores não tinham base individual confiável e exibiam números mesmo quando não havia defesas prontas.
- Os indicadores de análise e pagamento pendente passaram a exibir contagens derivadas dos casos carregados.

**Limitação atual:** a alteração foi registrada no GitHub, mas ainda precisa passar por lint/typecheck, testes automatizados e validação visual autenticada antes de ser considerada concluída. A ausência desses resultados não deve ser interpretada como aprovação.

## Plano de ação

### Fase 1 — Contratos e segurança

1. Consolidar enum/mapeamento de estados de caso.
2. Auditar cada rota de dashboard e seu middleware.
3. Padronizar cliente autenticado e erros HTTP.
4. Testar acesso direto por papel e tentativa de geração sem pagamento.

**Saída:** matriz de autorização aprovada e nenhum endpoint administrativo acessível por cidadão.

### Fase 2 — Confiabilidade de dados

1. Corrigir contadores e filtros do dashboard do condutor.
2. Validar totais administrativos contra consultas SQL canônicas.
3. Testar estados: vazio, carregando, erro, pagamento pendente, pago, documento pronto e falha de webhook.
4. Validar sincronização após pagamento e atualização em outra aba.

**Saída:** indicadores reproduzíveis e divergência zero entre API, banco e interface nos fixtures de aceite.

### Fase 3 — UX e acessibilidade

1. Padronizar cabeçalhos, breadcrumbs, status badges e ações primárias.
2. Corrigir textos PagBank/VenoPag e português/inglês.
3. Testar viewport 375px, 768px e desktop.
4. Executar teclado, foco, contraste e leitores de tela nos fluxos críticos.

**Saída:** checklist visual verde para condutor, detalhe de caso, admin e checkout.

### Fase 4 — Certificação

1. E2E visual autenticado: cidadão com caso pago.
2. E2E visual autenticado: cidadão com caso não pago.
3. E2E admin: casos, pagamentos, documentos e auditoria.
4. `lint`, `tsc`, build, testes unitários/integrados e smoke de produção.
5. Registrar evidências e SHA do release.

**Saída:** relatório de aceite com bloqueios explícitos e veredito de produção.

## Critérios de aceite

- Nenhum contador usa estado fora do mapper canônico.
- Caso não pago não gera documento pela UI nem por chamada direta.
- Caso pago consegue retomar a emissão sem duplicar o caso.
- Todas as rotas admin rejeitam usuário sem papel adequado.
- Erros de API são exibidos sem `[object Object]`, JSON inválido ou mensagens cruas do provedor.
- Cada dashboard possui loading, vazio, erro e retry verificáveis.
- Fluxos críticos passam em desktop, mobile e teclado.
- Build, typecheck, lint e suíte definida no release passam sem ocultar falhas.

## Ordem recomendada

1. Corrigir mapper de status e métricas do dashboard do condutor.
2. Completar matriz de autorização e padronizar fetch autenticado dos painéis admin.
3. Criar E2E visual autenticado usando casos persistentes pagos/não pagos.
4. Executar auditoria de UX/acessibilidade e corrigir regressões.
5. Reexecutar a certificação completa e publicar novo release.

## Execução — Módulo Operação / Visão Geral administrativa

**Branch:** `fix/admin-operation-overview-contract`  
**PR:** [#28 — Corrige contrato e estados da Visão Geral de Operação](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/28)

### Problemas confirmados na inspeção estática

- `AdminDashboardView.tsx` solicitava `recentCases`, mas o endpoint Cloudflare `GET /api/admin/overview` não devolvia esse campo. Portanto, a tabela de casos recentes não tinha dados fornecidos pelo contrato oficial do Worker.
- A tela ignorava respostas HTTP não-2xx e mantinha KPIs com aparência normal, sem informar a falha.
- A consulta de receita ignorava o objeto `error` retornado pelo Supabase e podia transformar uma falha de leitura em receita zero.
- A tela fazia `fetch` direto, sem usar o wrapper de autenticação da sessão Supabase.
- Qualquer caso não marcado como pago era rotulado como “AGUARDANDO PIX”, mesmo sem comprovação de que existia uma cobrança PIX pendente.
- O frontend mostrava zeros antes de confirmar a primeira resposta da API.

### Correções registradas na branch

- O endpoint retorna até oito casos recentes, com campos derivados do schema existente de `cases`.
- Falhas nas consultas necessárias retornam HTTP 503 com código `ADMIN_OVERVIEW_UNAVAILABLE`, em vez de publicar KPIs incompletos como se fossem válidos.
- A interface usa `useAuthFetch`, valida o contrato básico da resposta e apresenta erro e ação de nova tentativa.
- A interface diferencia carregamento, ausência de casos e falha inicial; em falha de atualização, mantém os últimos dados válidos e informa que estão desatualizados.
- O status visual foi alterado para “PAGO” ou “NÃO CONFIRMADO”; a tela não presume um PIX pendente sem consultar o estado real da cobrança.
- Foram adicionados testes para o formato de `recentCases` e para falhas nas consultas administrativas.

### Estado da validação

- PR aberto; ainda não integrado em `main`.
- CI reportado até o momento: verificação Vercel pendente.
- Testes locais, typecheck/build e validação visual autenticada **não executados nesta sessão**.
- Nenhum deploy ou alteração de banco de produção realizado.

### Critério para concluir esta etapa

A etapa só pode ser marcada como concluída depois que CI, testes, build e validação visual autenticada forem executados e registrados. O próximo módulo não deve ser considerado certificado com base apenas na inspeção estática.

