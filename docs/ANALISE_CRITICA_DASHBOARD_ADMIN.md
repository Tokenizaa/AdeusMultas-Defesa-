# Análise crítica do dashboard administrativo — Adeus Multa

**Data da análise:** 2026-10-15  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Base analisada:** `main` no commit `d0a9b59022fb7b4faab4a4cca60fba36160443b8`  
**Relatório anterior:** [`docs/AUDITORIA_DASHBOARDS_PLANO_ACAO.md`](./AUDITORIA_DASHBOARDS_PLANO_ACAO.md)  
**Natureza:** inspeção estática do código e da configuração versionada. Não foram executados testes, consultas no banco de produção, chamadas autenticadas à aplicação publicada ou inspeções de variáveis secretas do ambiente.

## 1. Conclusão executiva

A estrutura atual está superdimensionada para a operação central do Adeus Multa. A navegação mistura tarefas B2C (casos, usuários, pagamentos e documentos), ferramentas de engenharia (E2E, integridade, logs e monitoramento), inteligência técnica (IA e base jurídica) e operações de crescimento/comercial. Há ainda entradas duplicadas e indicadores com fontes ou semânticas inadequadas.

**A recomendação é simplificar a navegação, não apagar indiscriminadamente os módulos.** Manter a operação de casos, pagamentos e usuários; incorporar documentos ao fluxo de casos; concentrar as ferramentas de suporte técnico numa área restrita; retirar testes da navegação operacional cotidiana; e manter marketing/comercial fora do núcleo apenas enquanto seus fluxos reais forem necessários. Nenhuma API, tabela ou serviço deve ser removido nesta fase.

Antes de considerar o dashboard confiável, há dois bloqueios prioritários:

1. **Indicadores não confiáveis:** contagens são derivadas de estados diferentes, há um KPI explicitamente fixado em zero e o dashboard exibe dados de integração hardcoded como se fossem saúde real.
2. **Segurança de APIs a confirmar:** a política de autenticação para rotas administrativas está distribuída entre middleware global, routers e handlers. O middleware de `src/server/app.ts` protege apenas alguns GETs sob `/api/marketing`; os demais GETs dependem de proteção interna. Isso exige uma matriz e testes por endpoint antes de reduzir a superfície visível. Não se conclui, sem executar as rotas e verificar todos os handlers, que todas essas rotas estejam vulneráveis.

A análise não comprova uso real ou ausência de uso por telemetria. Por isso, itens sem evidência suficiente foram classificados como **INVESTIGAR**, não como REMOVER.

## 2. Estrutura atual e caminhos relevantes

### Frontend e navegação

- `src/App.tsx`: seleciona a tela por `currentPath` e renderiza as rotas administrativas.
- `src/components/layout/AdminSidebar.tsx`: renderiza a navegação em grupos e subgrupos.
- `src/components/layout/admin-nav-groups.ts`: catálogo de links administrativos.
- `src/components/layout/AdminLayout.tsx`: layout, menu móvel, cabeçalho e rodapé.
- `src/components/admin/AdminDashboardView.tsx`: visão geral e atalhos operacionais.
- `src/components/admin/AdminCasesListView.tsx` e `AdminCaseDetailView.tsx`: fila e detalhe dos casos.
- `src/components/admin/AdminDocumentsView.tsx`: repositório de documentos derivado dos casos.
- `src/components/admin/AdminPaymentsView.tsx`: pedidos e ações de pagamento.
- `src/components/admin/AdminUsersListView.tsx` e `AdminUserDetailView.tsx`: usuários e permissões.
- `src/components/admin/AdminAiGatewayView.tsx`, `AdminIntegrationsView.tsx`, `AdminSettingsView.tsx`, `AdminMonitoringView.tsx`, `AdminAuditView.tsx`, `AdminE2ETestsView.tsx`, `AdminE2ERunDetailView.tsx` e `AdminIntegrityTestView.tsx`: ferramentas técnicas e de auditoria.
- `src/components/layout/admin-nav-groups.ts` contém grupos **Visão Geral**, **Testes & Qualidade**, **Operação**, **Crescimento**, **Inteligência** e **Sistema**. E2E e auditoria de marca-d'água aparecem tanto em “Testes & Qualidade” quanto em “Sistema”.
- O grupo Crescimento inclui dez destinos de marketing, seis destinos de prospecção e nove destinos comerciais. Isso torna o menu extenso e mistura tarefas de naturezas distintas.

Rotas renderizadas por `src/App.tsx`:

| Rota ou família | Componente / finalidade |
|---|---|
| `/admin` | Visão geral operacional |
| `/admin/cases`, `/admin/cases/:id` | Lista e detalhe de casos |
| `/admin/users`, `/admin/users/:id` | Usuários e permissões |
| `/admin/documents` | Documentos/minutas |
| `/admin/payments` | Pagamentos |
| `/admin/commercial/*` | Preços, promoções, cupons, bônus, indicações, comissões e testes comerciais |
| `/admin/marketing*` | Marketing e prospecção |
| `/admin/ai`, `/admin/knowledge` | IA e base jurídica |
| `/admin/integrations`, `/admin/settings` | Integrações e configurações |
| `/admin/monitoring`, `/admin/logs`, `/admin/audit` | Monitoramento, logs e auditoria |
| `/admin/e2e-tests*`, `/admin/integrity-tests` | Testes técnicos |

### Backend e dados

- `src/server/app.ts`: monta os routers e aplica middlewares por família de endpoints.
- `src/server/middleware/auth-middleware.ts`: valida identidade e aplica `requireAdmin`.
- `src/server/routes/admin.ts`: overview, pagamentos, documentos, usuários e informações de IA/integrações.
- `src/server/routes/payments.ts` e `src/server/integrations/gateway/gateway-manager.ts`: criação/consulta de pagamento e seleção de gateway.
- `src/server/routes/analytics.ts`: endpoint adicional de analytics, com cálculos distintos dos usados no overview.
- `src/server/routes/monitoring.ts`, `logs.ts`, `audit.ts`, `settings.ts` e `e2e-tests.ts`: observabilidade, auditoria, configuração e testes.
- `src/server/routes/marketing.ts`, `marketing-automation.ts`, `commercial.ts` e `meta.ts`: funcionalidades de crescimento, ofertas e integrações.
- `supabase/migrations/`: schema versionado; a migration `20261015000002_allow_venopag_payment_gateway.sql` aceita `pagbank`, `ggpixapi` e `venopag` na coluna `payment_orders.gateway`.

## 3. Inventário e classificação

As classificações abaixo são decisões de produto recomendadas com base nas dependências encontradas no código. **Não significam que a implementação já foi alterada.**

| Área / funcionalidade | Decisão | Justificativa e destino |
|---|---|---|
| Visão geral operacional | **MANTER** | Deve destacar exceções acionáveis e saúde real. Reduzir indicadores para poucos números confiáveis e links para resolver problemas. |
| Casos e autuações | **MANTER** | É o centro da operação: localizar caso, consultar estado, verificar pagamento e resolver pendências. |
| Detalhe do caso | **MANTER** | Deve concentrar histórico, dados, pagamento e documento associado, com ações condicionadas a autorização e estado. |
| Documentos e petições | **CONSOLIDAR** | `AdminDocumentsView` percorre `caseRepository` e constrói uma lista a partir de `defenseDraft` do caso; não é evidência de um repositório documental independente. Incorporar lista/estado/visualização ao caso e manter uma visão filtrada de documentos apenas se houver tarefa operacional distinta comprovada. |
| Pagamentos | **MANTER** | Necessário para conciliação, consulta de estado e suporte ao checkout. Simulação e disparo de webhook devem ser restritos a sandbox/teste e nunca confundidos com operação financeira real. |
| Usuários e permissões | **MANTER** | `AdminUsersListView` permite promover/rebaixar papel; é uma operação sensível. Manter acesso estritamente administrativo, com confirmação e trilha de auditoria. |
| Gestão comercial | **CONSOLIDAR** | Preços, promoções e cupons podem permanecer como operações comerciais, com navegação agrupada. Bônus, indicações e comissões precisam de evidência de uso e conciliação antes de ocupar o menu principal. |
| Marketing e inbox | **RESTRINGIR** | Não é necessário para atender um caso B2C, mas o código contém publicação, conteúdo, inbox e integração Meta. Manter apenas se a operação de aquisição estiver ativa; colocar num espaço de crescimento separado e acessível a papéis autorizados. |
| Prospecção B2B e coleta de leads | **INVESTIGAR** | Existem rotas e telas para leads, campanhas, filas e coleta. Não remover sem verificar dados persistidos, jobs, agendamentos, consumidores e obrigações de opt-out/privacidade. Se não estiver em uso, desativar por fase própria, com plano de dados e jobs. |
| IA / gateway de provedores | **RESTRINGIR** | Útil para diagnóstico técnico, não para a navegação cotidiana. O componente contém descrições de provedores incompatíveis com outras partes do projeto. Manter somente métricas e controles realmente ligados ao runtime implantado. |
| Base jurídica / conhecimento | **RESTRINGIR** | Pode sustentar o produto e o motor de defesa; não é uma ferramenta descartável. Expor apenas as tarefas editoriais/operacionais realmente usadas e separar monitoramento técnico da navegação do atendente. |
| Hub de integrações | **CONSOLIDAR** | Sobrepõe diagnóstico de saúde, gateway, Meta, OCR e banco com Monitoramento e Configurações. Consolidar diagnóstico técnico, sem duplicar configurações editáveis ou operações de teste. |
| Configurações | **RESTRINGIR** | Manter mudanças de configuração essenciais, mas limitar por permissão e registrar ator, data, valor anterior/novo quando sensível. Remover controles de provedores obsoletos apenas após confirmar runtime e consumidores. |
| Monitoramento e saúde | **CONSOLIDAR** | Manter saúde de serviços, alertas e métricas técnicas num único centro restrito. Não exibir disponibilidade histórica se só há uma sondagem instantânea. |
| Logs operacionais | **CONSOLIDAR** | Integrar busca de logs e rastreamento de correlação ao centro técnico. A ação de limpar logs é destrutiva e deve ser reavaliada; preservar auditoria e evidência de incidentes. |
| Auditoria / LGPD | **MANTER** | Necessária para rastrear operações sensíveis e apoiar investigação. Evitar confundir logs transitórios em memória com trilha de auditoria persistente. |
| Central de testes E2E | **RESTRINGIR** | Ferramenta de engenharia, não área operacional do produto. Retirar do menu diário e manter numa área técnica protegida ou fora do frontend de produção após avaliar o uso. |
| Teste de integridade/marca-d'água | **RESTRINGIR** | Ferramenta técnica. Manter fora da navegação comum; validar se é necessária em produção e se os dados de teste são sintéticos. |
| Afiliados, indicações e comissões | **INVESTIGAR** | Há rotas comerciais e portal público de afiliado. Verificar transações, saldos, pagamentos, regras e uso real antes de consolidar ou retirar. Não remover ledger ou histórico financeiro por simplificação visual. |
| Páginas e endpoints duplicados | **CONSOLIDAR** | O menu duplica E2E e integridade. `src/server/routes/admin.ts` e outros routers também mantêm aliases de compatibilidade. Remover aliases somente depois de busca de consumidores e teste de contrato. |

### O que deve sair da navegação principal

- A segunda entrada de **Central de Testes E2E** e a segunda entrada de **Auditoria Marca-d'Água**.
- Links de execução de testes, detalhes de runs e ferramentas de integridade do menu de operação cotidiana; não necessariamente suas APIs.
- Entradas técnicas repetidas entre Hub de Integrações, Configurações e Monitoramento, depois de definir uma única área de diagnóstico.
- A página independente de documentos como destino primário, se a consolidação no caso cobrir busca, estado, acesso ao arquivo e suporte. Não apagar sua API antes de validar consumidores.

### Estrutura de navegação recomendada

1. **Operação**
   - Visão geral
   - Casos
   - Pagamentos
   - Usuários e permissões
2. **Crescimento e comercial** *(visível apenas se os fluxos estiverem ativos)*
   - Marketing/inbox
   - Preços e ofertas
   - Afiliados/comissões, somente se comprovadamente usados
3. **Sistema** *(restrito)*
   - Saúde e alertas
   - Logs e auditoria
   - Integrações/configurações
   - Base jurídica/IA somente para tarefas técnicas ou editoriais autorizadas
4. **Ferramentas de engenharia** *(acesso técnico; fora do menu operacional diário)*
   - E2E
   - Testes de integridade

Não criar páginas novas para implementar esta estrutura. A primeira entrega deve simplificar grupos e consolidar fluxos existentes. A consolidação de telas só deve acontecer depois de os contratos de dados e de autorização estarem corretos.

## 4. KPIs: o que é confiável e o que precisa mudar

### Problemas confirmados no código

Em `src/server/routes/admin.ts`, `GET /api/admin/overview`:

- `totalUsers` é calculado como quantidade de emails únicos encontrados nos casos, não como total de usuários em `user_profiles`. O rótulo “usuários” não representa o universo de contas.
- `pendingJobs` é retornado como **`0` hardcoded**, com comentário de que não há sistema de filas implementado nesse contrato. Deve desaparecer do dashboard até haver uma fonte real.
- `systemUptimePercent` é calculado como proporção dos serviços que respondem `HEALTHY` numa consulta atual. Isso é uma fotografia de saúde, não uptime histórico.
- `defenseReadyCases` aceita status `defense_ready`/`defesa_pronta` **ou qualquer `defenseDraft` existente**, sem condicionar a contagem a pagamento. Não usar esse número como sinônimo de documentos liberados.
- `totalRevenue` tenta somar `payment_orders` com status `PAID`, mas usa fallback para valores de pagamento dos casos quando a consulta falha ou retorna lista vazia. A troca silenciosa de fonte torna o número difícil de reconciliar e pode produzir divergências.
- `paidCases` combina `isPaid` e diferentes status de pagamento. É preciso mapear estados canônicos e reconciliar casos com pedidos para evitar contagens inconsistentes.
- A taxa de conversão usa casos pagos dividido por todos os casos; deve ser rotulada como conversão de caso para pago, com janela temporal explícita, ou removida até definir coorte e denominador.
- `thesesCount` conta argumentos usados em casos, não o total de teses ativas na base jurídica.

Em `src/components/admin/AdminDashboardView.tsx`:

- “Aguardando Pagamento” é calculado como `totalCases - paidCases`, que inclui qualquer caso não pago, não necessariamente casos cujo estado canônico é aguardando pagamento.
- O dashboard usa `/api/health/test` e apresenta sondagens de serviços. O estado de uma sondagem não deve ser apresentado como disponibilidade histórica.
- A UI identifica IA como NVIDIA/9Router e pagamento como PagBank, enquanto outras partes do projeto documentam outro runtime e outros gateways.

Em `src/server/routes/admin.ts`, `GET /api/admin/integrations/overview`:

- Respostas como `pagbank.status = 'HEALTHY'`, status de banco/Storage e OCR, além de precisão de parser `98.2`, são valores constantes. Não podem ser exibidos como observações reais sem uma verificação executada e evidência correspondente.

Em `src/server/routes/analytics.ts`:

- Há um conjunto de métricas paralelo, com fórmulas diferentes: `mrr` usa valor padrão `89.9` quando não há valor do pagamento; “economias geradas” é `totalProcessed * 240`; taxa de deferimento é inferida de um score de análise. Esses valores são estimativas/simulações, não receita recorrente, economia comprovada ou deferimentos observados. Não os promover a KPI operacional.

### KPIs recomendados para a visão geral

Manter somente indicadores com origem, período e regra documentados:

| KPI | Fonte canônica necessária | Regra de exibição |
|---|---|---|
| Casos ativos | tabela/repositório canônico de casos | Definir quais estados contam como ativos; excluir duplicatas e casos encerrados conforme regra explícita. |
| Casos aguardando ação | casos + estado canônico | Contar somente estados operacionais explícitos, nunca `total - pagos`. |
| Pagamentos pendentes | `payment_orders` e estado canônico do pedido | Contar pedidos pendentes distintos; não inferir pelo estado do caso. |
| Pagamentos confirmados / receita conciliada | `payment_orders` e gateway registrado no pedido | Somar pedidos únicos confirmados, com moeda/unidade explícita; falha de consulta deve gerar erro/indisponibilidade, não fallback silencioso. |
| Documentos liberados | estado persistido de documento ou regra canônica caso+pagamento+documento | Contar somente documento realmente gerado e liberado. Se não houver entidade persistida de documento, rotular como casos com documento pronto, após validar regra. |
| Saúde atual | health checks executados no momento | Mostrar status e hora da última verificação. Não chamar de uptime. |

**Não incluir por enquanto:** “pendências de fila” hardcoded, uptime histórico sem série temporal, economia estimada, taxa de deferimento não observada, contagem de teses derivada de uso e métricas de IA de provedores que não sejam os usados no runtime.

## 5. Gateway de pagamento: conflito documentado, runtime ainda precisa de confirmação

As evidências versionadas são divergentes:

- `.env.example` declara VenoPag como gateway PIX principal no Cloudflare Worker e define `VENO_PRIMARY_GATEWAY=venopag`.
- A migration `supabase/migrations/20261015000002_allow_venopag_payment_gateway.sql` permite `venopag` em `payment_orders.gateway`.
- `wrangler.json` define o Worker `cloudflare/worker.ts` para o domínio de produção `adeusmulta.defesai.com.br`.
- O backend Express em `src/server/integrations/gateway/gateway-manager.ts` tipa gateways como `pagbank`, `ggpixapi` e `test`; em produção rejeita `PAYMENT_ACTIVE_GATEWAY=pagbank` e resolve para `ggpixapi`. Esse resolver não lista `venopag`.
- `src/server/routes/admin.ts`, `AdminPaymentsView.tsx`, `AdminIntegrationsView.tsx`, `AdminDashboardView.tsx` e `admin-nav-groups.ts` ainda rotulam operações como PagBank e/ou GGPIX.

**Conclusão:** o código versionado sugere VenoPag como principal no caminho Cloudflare e GGPIXAPI como caminho de produção do resolver Express. Isso não comprova qual endpoint recebe as transações reais hoje. As variáveis secretas/configurações do ambiente e a execução real não foram consultadas nesta análise.

**Decisão:** não renomear tudo para VenoPag nem para PagBank nesta fase. Primeiro, rastrear checkout → Worker → API de criação → gateway → webhook → `payment_orders`; consultar a configuração efetiva do ambiente de produção sem expor segredos; comparar gateway registrado nos pedidos recentes e confirmar qual webhook processa os eventos. Depois, centralizar o nome do gateway ativo no backend e fazer a UI consumir essa informação. Pagamentos antigos devem continuar associados ao gateway que os criou.

## 6. Autenticação, autorização e auditoria

### Controles positivos observados

- `src/server/routes/admin.ts` aplica `router.use(authenticateToken, requireAdmin)` ao router administrativo.
- `src/server/middleware/auth-middleware.ts` documenta que identidade e papel não devem ser derivados de headers de cliente forjáveis e implementa resposta 401/403 para acesso administrativo.
- `src/server/routes/monitoring.ts`, `logs.ts`, `audit.ts` e `settings.ts` também aplicam autenticação e papel administrativo em suas rotas protegidas.
- A gestão de papel usa RPC `admin_update_user_role_by_email`, em vez de aceitar a mudança apenas no estado visual.

### Riscos e verificações obrigatórias

- `src/server/app.ts` aplica proteção global a alguns métodos/paths de marketing, mas não a todos os GETs de forma uniforme. Conferir cada handler montado em `/api/marketing` e os caminhos de automação antes de declarar a superfície protegida. Criar uma matriz endpoint → método → autenticação → papel → efeito colateral e testar acesso anônimo, cidadão e admin.
- A tela de pagamentos contém ações de simulação e disparo de webhook sandbox. Confirmar que as rotas recusam essas ações em produção e que a interface deixa o ambiente explícito.
- `AdminMonitoringView.tsx` envia `user: 'admin@defesai.com.br'` no reconhecimento de alerta. A identidade de auditoria deve vir do usuário autenticado no servidor, não de um valor fixo do cliente.
- `AdminMonitoringView.tsx` oferece limpeza de logs em memória. Confirmar se isso é necessário, adicionar confirmação e garantir que a trilha de auditoria não seja apagada junto.
- `src/server/routes/admin.ts` expõe dados de usuários e permite alterar papel. Validar proteção contra remoção/rebaixamento do último administrador, confirmação e trilha persistente de quem fez a alteração.
- `AdminLayout.tsx` exibe “99.98% Uptime”, “Motor CTB v1”, “NVIDIA NIM AI • 9Router”, “PagBank Orders v2” e “LGPD Auditada” como texto fixo. Remover alegações operacionais não medidas durante a simplificação.
- A autorização do frontend e o menu não substituem autorização no backend. Testar URL direta e endpoint direto em todos os módulos; não confiar apenas em item oculto no menu.

Não alterar permissões, policies, schema ou dados de produção nesta fase. Corrigir qualquer falha confirmada em uma fase de segurança própria, com teste de regressão e evidência.

## 7. Responsividade e acessibilidade

Há fundamentos úteis em `AdminLayout.tsx`: drawer móvel, barra de acessibilidade, skip/accessibility anchors e área principal focável. Entretanto, o layout usa `h-screen w-screen overflow-hidden` e scroll independente; deve ser testado com zoom, viewport pequeno e teclado para garantir que tabelas/modais não fiquem inacessíveis.

A simplificação recomendada deve priorizar:
- menos grupos e destinos, sem navegação duplicada;
- foco visível, nomes acessíveis e navegação por teclado;
- evitar cartões que dependem apenas de cor para comunicar status;
- tabelas com alternativa utilizável em 375 px e 768 px;
- confirmação para ações destrutivas e feedback claro de carregamento, vazio, erro e sucesso;
- remover textos fixos de saúde/uptime e versões sem fonte observável.

Não há evidência de execução de axe, Lighthouse, teste por leitor de tela ou inspeção visual automatizada nesta análise.

## 8. Plano de implementação em fases completas

### Fase 1 — Contratos operacionais e segurança (bloqueante)
1. Mapear estados canônicos de casos, pagamentos e documentos; definir denominadores e fonte por KPI.
2. Rastrear o fluxo de pagamento de ponta a ponta e confirmar o gateway efetivo em produção.
3. Fechar a matriz de autorização para todos os endpoints administrativos, incluindo marketing, comercial, logs, integrações e ferramentas técnicas.
4. Corrigir qualquer endpoint sem proteção apropriada, identidade de auditoria fornecida pelo cliente e ações sandbox disponíveis em produção.
5. Criar testes por papel e regressão para geração documental sem pagamento e para operações administrativas sensíveis.

**Aceite:** nenhuma API administrativa acessível sem papel autorizado; origem e regra de cada KPI documentadas; gateway e webhooks coerentes com evidência; nenhuma simulação financeira em produção.

### Fase 2 — Confiabilidade dos indicadores e dados
1. Corrigir overview e analytics para usar fontes canônicas sem fallback silencioso nem valores financeiros presumidos.
2. Remover métricas hardcoded e alegações fixas de uptime/saúde.
3. Unificar o significado dos estados entre API, filtros e UI.
4. Validar casos, pedidos e documentos com fixtures e consultas de reconciliação.

**Aceite:** contagens reproduzíveis a partir da fonte; falha de consulta exibida como falha, não como zero/fallback; nenhuma métrica estimada rotulada como resultado observado.

### Fase 3 — Simplificação de navegação e fluxo de trabalho
1. Remover entradas duplicadas do menu.
2. Reduzir a navegação operacional a visão geral, casos, pagamentos e usuários.
3. Consolidar documentos no fluxo de casos, preservando busca e operações necessárias.
4. Agrupar marketing/comercial apenas se os fluxos estiverem ativos; manter IA/base jurídica e ferramentas de engenharia em acesso restrito.
5. Consolidar diagnóstico de integrações/saúde/logs sem apagar APIs antes de mapear consumidores.

**Aceite:** toda ação operacional essencial continua acessível; nenhuma função é perdida; links e rotas diretas continuam corretos; o menu não duplica entradas.

### Fase 4 — Certificação e limpeza controlada
1. Testar desktop, 375 px, 768 px, teclado e foco.
2. Executar build, typecheck/lint, testes unitários e E2E autenticado para cidadão/admin.
3. Verificar URLs antigas, aliases e consumidores antes de remover qualquer endpoint.
4. Registrar screenshots/evidências, resultados reais, SHA do commit e limitações remanescentes.

**Aceite:** suites concluídas com resultado registrado; nenhum erro ignorado; auditoria de permissões passa por papel; fluxos de casos/pagamento/documento validados ponta a ponta.

## 9. Critérios objetivos de aceite da simplificação

- [ ] Toda rota administrativa tem papel autorizado explicitamente documentado e teste de acesso direto.
- [ ] Cada KPI possui fonte, regra, janela temporal e denominador registrados.
- [ ] Nenhum KPI financeiro usa valor padrão ou fallback silencioso entre fontes.
- [ ] Nenhum status de integração ou percentual de uptime é fixo/hardcoded na UI.
- [ ] Documentos liberados são contados apenas com condição canônica comprovada.
- [ ] Gateway exibido corresponde ao runtime confirmado e aos pedidos reais; pagamentos históricos preservam seu gateway.
- [ ] Testes/simuladores ficam fora da navegação cotidiana e não podem alterar pagamentos reais em produção.
- [ ] Não há links duplicados para E2E/integridade.
- [ ] Casos, pagamentos e gestão de usuário permanecem funcionais e protegidos.
- [ ] Nenhuma API/tabela/job é removido sem busca de consumidores e verificação de dependências.
- [ ] A interface funciona em 375 px, 768 px e desktop e é navegável por teclado.
- [ ] Build, typecheck, lint e suites definidas passam, com evidência registrada.
- [ ] Não se declara concluído nenhum teste que não tenha sido executado.

## 10. Limitações e próximos passos

Esta análise foi feita a partir dos arquivos versionados no commit indicado. Não houve acesso às variáveis secretas/configuração efetiva do Worker, consulta direta ao banco de produção, inspeção de logs reais, medição de uso de páginas, execução do app ou testes. Portanto:

- **Não é possível afirmar** qual módulo tem uso real baixo ou nulo apenas pela existência de código.
- **Não é possível confirmar** o gateway efetivamente processando os pagamentos sem rastrear a execução/configuração de produção.
- **Não é possível certificar** a segurança de todos os endpoints sem testar cada rota e papel.
- A proposta não autoriza excluir tabelas, APIs, workers, jobs ou dados.

A primeira implementação deve executar a Fase 1 antes de qualquer redução de superfície. A simplificação visual/navegação vem depois que a fonte dos indicadores e as permissões estiverem comprovadas.

## Recomendação final

**Manter como núcleo:** Visão geral operacional, Casos, Pagamentos e Usuários/Permissões.  
**Consolidar:** Documentos dentro do fluxo de casos; saúde, integrações e logs num centro técnico coerente; preços/ofertas dentro de um único espaço comercial.  
**Restringir:** IA, base jurídica administrativa, configurações, monitoramento, auditoria, marketing e operações comerciais sensíveis.  
**Retirar do menu operacional:** links duplicados de E2E e integridade; manter as ferramentas de engenharia em espaço restrito.  
**Investigar antes de decidir:** prospecção, afiliados, indicações/comissões, automações e qualquer módulo cuja utilização dependa de dados/jobs externos.

O principal ganho não vem de redesenhar o dashboard inteiro: vem de reduzir a navegação ao trabalho real, parar de exibir métricas não comprovadas e estabelecer autorização verificável em cada endpoint.
