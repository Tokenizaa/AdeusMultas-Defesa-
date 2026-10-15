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

**Correções funcionais adicionais — 2026-10-15**

- Removida a exibição de senha E2E fixa no dashboard.
- Removidos os estados de teste que apareciam como aprovados e a data atual fictícia quando não havia execuções registradas.
- Os resultados E2E agora distinguem carregamento, falha, ausência de resultados e status devolvido pela API; foi incluída ação de nova tentativa.
- Removida a alegação visual de “Isolamento 100% Auditado”, que não era comprovada pelo componente.
- O dashboard recebe do App os estados de carregamento e erro da API de casos, com tentativa manual de recuperação; erro não é apresentado como lista vazia.
- Os KPIs ficam como “—” enquanto os dados carregam ou quando a API falha, evitando zeros enganosos.
- “Em análise” conta apenas estados analisando e gerando_documento; analisado não é mais contado como processamento em andamento.
- A lista recente usa botão semântico com foco visível e suporte a teclado.
- Código de infração ausente passa a aparecer como “Código não informado”, sem inventar um código.
- Textos auxiliares foram ajustados para não afirmar acompanhamento de todos os casos nem auditoria E2E sem evidência.

**Validação atual:** o build de produção do preview Vercel concluiu com sucesso no commit `8bc0c135309b7dee87db4461099ec5f24bb3423e` (deployment `dpl_CFR7uiPrG1xNKBdM18XSshw3ehic`). A primeira tentativa de build falhou por fechamento JSX ausente; o erro foi corrigido e o build seguinte passou. Ainda faltam `npm run lint`, `npm run test:unit` e testes E2E autenticados em estados reais. A sessão de navegador automatizado não foi executada porque o provedor de browser não disponibilizou créditos. Não considerar a fase certificada até esses testes restantes passarem.

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

