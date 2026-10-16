# ADR-012: Firecrawl como mecanismo de descoberta da Prospecção B2B

- **Status:** Proposto para implementação incremental
- **Data:** 2026-10-16
- **Escopo:** módulo de Prospecção B2B do Adeus Multas
- **Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
- **Branch de trabalho:** `main`
- **Dependências externas:** Firecrawl API; Supabase já utilizado pelo módulo

## 1. Contexto e evidências da auditoria

O módulo já possui interface administrativa, coleta com Selenium/Google Maps, normalização, classificação, deduplicação, persistência no Supabase, campanhas e automação comercial. Portanto, esta iniciativa não é uma reconstrução do módulo.

Na inspeção estática do código disponível em `main`, não foram encontradas referências de runtime a `FIRECRAWL_API_KEY` nem ao endpoint `api.firecrawl.dev`. Firecrawl aparece em documentação/skills do agente, mas isso não comprova integração operacional.

Arquivos relevantes já identificados:
- `src/components/marketing/components/ProspectingPage.tsx`
- `src/components/marketing/prospecting/ProspectingCollectionTab.tsx`
- `src/scraper-prospecting/`
- `src/scraper-prospecting/selenium/google-maps-scraper.ts`
- `src/scraper-prospecting/classifier.ts`
- `src/scraper-prospecting/persister.ts`
- `src/server/routes/marketing-automation.ts`
- `src/server/services/marketing-automation/worker.ts`
- `src/server/services/prospecting-responder.ts`

Limitação da auditoria: os resultados acima descrevem o código inspecionado, não confirmam contagens atuais no Supabase, configuração do ambiente publicado, execução real do scraper ou entrega/recebimento de WhatsApp.

## 2. Decisão

Integrar Firecrawl como mecanismo principal de **descoberta de empresas e páginas públicas**, preservando inicialmente o pipeline existente de validação, normalização, classificação, deduplicação, armazenamento e operação comercial.

Não substituir o módulo inteiro nem remover Selenium nesta primeira etapa. O Selenium só poderá ser desativado/removido depois de testes comparativos documentados demonstrarem que não é necessário para nenhuma fonte ainda suportada.

Firecrawl não deve ser tratado como garantia de cobertura total da web, nem como acesso irrestrito a Google Maps, diretórios ou sites com restrições. A coleta será segmentada, paginada/retomável e limitada por orçamento, fonte e região.

## 3. Objetivo do produto

Criar uma base nacional de potenciais parceiros B2B para Adeus Multas, deduplicada e continuamente atualizável, priorizando:
1. Despachantes de trânsito;
2. Advogados de trânsito;
3. Autoescolas/CFCs;
4. Corretores de seguros de veículos;
5. Gestores de frotas e locadoras;
6. Consultorias de transporte e profissionais de regularização veicular;
7. Concessionárias e revendas, se houver sinal comercial útil.

O produto deve permitir descoberta inicial ampla e novas execuções incrementais, sem reprocessar indiscriminadamente toda a base a cada execução.

## 4. Arquitetura pretendida

1. **Orquestração de buscas:** criar consultas por segmento, município/região e fontes públicas; permitir limites, pausa e retomada.
2. **Adaptador Firecrawl:** encapsular autenticação, pesquisa, extração, timeout, retry com backoff, rate limit e tratamento de erros. Não espalhar chamadas HTTP do provedor pelo frontend.
3. **Normalização:** converter resultados do provedor para o contrato interno de lead já utilizado pelo módulo.
4. **Qualificação:** classificar segmento e confiança com evidências explícitas; distinguir dado observado, inferido e ausente. Não inventar telefone, email, endereço ou atividade.
5. **Deduplicação:** usar identificadores estáveis e normalizados (domínio, telefone, email e nome+localidade, conforme disponibilidade), com regras para não fundir empresas distintas.
6. **Persistência:** reutilizar as tabelas e o mecanismo de persistência existentes sempre que o esquema atual suportar os campos; propor migração somente após inspecionar esquema, índices, constraints e políticas reais.
7. **Execução retomável:** registrar execução, consulta/região, estado, contadores, erros e checkpoints usando infraestrutura durável já disponível. Não depender apenas de estado em memória ou de um `setInterval` em processo efêmero para trabalho crítico.
8. **Interface:** reaproveitar a tela atual de coleta e apresentar estado real da execução selecionada, novos leads, atualizados, duplicados, rejeitados, erros e consumo/custo quando disponível.
9. **Atualização incremental:** revisitar fontes/resultados já conhecidos com política de recência e prioridade, atualizar dados verificáveis e manter histórico de origem/última verificação.
10. **Saída comercial:** manter campanhas e WhatsApp desacoplados da descoberta; nenhum contato automático deve ser disparado apenas porque um lead foi encontrado.

## 5. Segurança, privacidade e conformidade

- Segredo Firecrawl exclusivamente no backend/segredos do runtime; nunca no bundle do frontend, logs, respostas HTTP ou repositório.
- Confirmar a configuração do runtime real (incluindo Cloudflare, se aplicável) antes de habilitar execução em produção; não presumir que variáveis locais são herdadas pelo ambiente publicado.
- Validar autenticação e autorização das rotas administrativas, permissões Supabase/RLS e validação dos parâmetros de busca.
- Aplicar limites por execução, por fonte e por período; impedir loops, execuções duplicadas e custos sem controle.
- Respeitar termos de uso, políticas de acesso, robots.txt quando aplicável e limites dos sites consultados.
- Armazenar apenas dados empresariais necessários à finalidade; registrar URL de origem e momento da coleta. Para dados pessoais de contato, definir base legal, finalidade, retenção, canal de oposição/descadastro e supressão de contatos antes de ampliar o outreach, em conformidade com a LGPD.
- Nunca enviar WhatsApp/email automaticamente como efeito colateral da coleta; exigir regras comerciais e controles de opt-out separados.

## 6. Plano de implementação por fases completas

### Fase 1 — Contratos e prova técnica, sem substituir o coletor atual
- Reconciliar o estado local com `origin/main` antes de editar; preservar mudanças e commits existentes.
- Inspecionar contratos reais do lead, tabelas/constraints, migrations, RLS, rotas e infraestrutura de jobs.
- Confirmar versão atual da API Firecrawl e formato suportado de busca/extração pela documentação oficial.
- Implementar adaptador backend com validação, timeout, retry limitado e erros tipados.
- Adicionar testes unitários e um teste de integração controlado, sem disparar outreach e sem modificar dados comerciais existentes.
- Documentar variáveis necessárias por ambiente sem registrar valores secretos.
- Critério de saída: busca/extrator validado em pequena amostra, segredo protegido, testes passando e consumo mensurável.

### Fase 2 — Ingestão integrada e deduplicada
- Mapear os resultados Firecrawl para o contrato de lead atual.
- Reutilizar a persistência existente; adicionar migration somente se necessária e justificada por evidência do esquema.
- Garantir idempotência, proveniência, estado de validação e distinção entre campos ausentes e valores reais.
- Testar duplicatas, registros incompletos, falhas parciais e repetição da mesma execução.
- Critério de saída: executar a mesma coleta duas vezes não duplica leads e não sobrescreve dados melhores com dados vazios.

### Fase 3 — Descoberta segmentada, ampla e retomável
- Criar catálogo de consultas por segmento e região, com parâmetros configuráveis e limites explícitos.
- Permitir lotes, pausa/retomada, checkpoints e recuperação de falha.
- Começar por amostra controlada de cidades/segmentos antes de ampliar para o Brasil.
- Medir empresas únicas, qualificação, contatos úteis, duplicatas, falhas, tempo e créditos/custo.
- Critério de saída: cobertura e custo observáveis por segmento/região, sem depender de uma única consulta que prometa encontrar todos os negócios.

### Fase 4 — Atualização incremental e qualificação
- Reconsultar com prioridade dados antigos, incompletos ou de maior valor potencial.
- Registrar última verificação, origem e mudanças relevantes.
- Expandir o classificador para todos os segmentos aprovados e separar categoria de score de prioridade.
- Não criar score sem critérios explicáveis e testes com exemplos reais.
- Critério de saída: atualização não duplica registros, não degrada dados válidos e a priorização pode ser explicada.

### Fase 5 — Interface operacional e validação de ponta a ponta
- Integrar estados reais de execução à interface atual sem criar um segundo painel ou outro fluxo paralelo.
- Corrigir métricas para que reflitam a execução selecionada, não o total global da base.
- Validar autenticação, limites, logs sem segredos, persistência, falhas, retomada e experiência administrativa.
- Comparar Firecrawl e Selenium em uma amostra equivalente e decidir, com dados, se Selenium continua necessário.
- Critério de saída: testes automatizados e validação controlada documentada. Deploy em produção somente mediante autorização explícita.

## 7. Métricas de sucesso

O comparativo deve usar a mesma amostra de segmentos e regiões para os dois mecanismos, quando ambos forem aplicáveis:
- leads únicos encontrados;
- percentual classificado corretamente em revisão amostral;
- percentual com site/telefone/email públicos verificáveis;
- taxa de duplicação;
- taxa de registros rejeitados ou incompletos;
- custo por lead único qualificado;
- tempo total e taxa de falhas;
- percentual de atualizações que agregam informação útil.

Não estabelecer metas numéricas definitivas antes de medir a linha de base atual e o custo real da API.

## 8. Fora de escopo

- Reescrever toda a Prospecção B2B;
- substituir ou redesenhar campanhas, WhatsApp e CRM sem necessidade demonstrada;
- prometer cobertura integral de empresas brasileiras;
- disparar campanhas ou mensagens durante coleta/testes;
- alterar produção, fazer deploy ou apagar o Selenium antes dos critérios de saída;
- criar um sistema separado ou uma segunda base de leads.

## 9. Regras de execução e segurança de mudanças

- Trabalhar diretamente em `main`, sem criar branches ou PRs.
- Antes de alterar código, reconciliar estado local, `origin/main`, alterações não commitadas e commits locais; não usar reset destrutivo, `git clean` ou force push.
- Concluir uma fase inteira, documentar evidências e resultados, e só então avançar.
- Manter as alterações focadas; não sobrescrever trabalho não relacionado.
- Não fazer deploy nem executar outreach real sem autorização explícita.
- Em caso de falta de acesso ao Supabase/runtime, registrar a limitação e não declarar a validação como concluída.

## 10. Fontes técnicas

- Firecrawl — documentação oficial: https://docs.firecrawl.dev/
- Firecrawl — API Search: https://docs.firecrawl.dev/features/search
- Firecrawl — API Scrape: https://docs.firecrawl.dev/features/scrape
- Firecrawl — API Crawl: https://docs.firecrawl.dev/features/crawl

Antes da implementação, confirmar os endpoints, parâmetros, autenticação, limites e preços vigentes diretamente na documentação oficial. Não codificar o contrato baseado apenas nesta ADR.


## 11. Execução da Fase 1 — 2026-10-16

### Implementado no repositório

- Criado `cloudflare/services/firecrawl-prospecting.ts`: adaptador isolado para `POST https://api.firecrawl.dev/v2/search`, com autenticação Bearer, validação da consulta, limite rígido de até 5 resultados, timeout, erros tipados, normalização de URLs HTTP(S) e mensagens de erro que não propagam o corpo bruto do provedor.
- Adicionado binding tipado opcional `FIRECRAWL_API_KEY` em `cloudflare/supabase.ts`. A chave deve ser configurada como secret do Cloudflare Worker; não deve ser adicionada ao `wrangler.jsonc`, ao frontend ou ao Git.
- Criada rota administrativa de prova técnica `POST /api/marketing/prospecting/firecrawl/test` em `cloudflare/routes/marketing.ts`. Reutiliza `authenticateToken` + `requireAdmin`, executa busca somente de leitura e devolve no máximo cinco resultados. A rota informa explicitamente `persisted: false` e `outreachTriggered: false`.
- Criados testes unitários em `cloudflare/routes/firecrawl-prospecting.test.ts` para ausência de credencial, consulta inválida, limite de resultados, normalização/filtragem de URLs, throttling e erro do provedor sem vazamento de detalhes.
- Nenhuma migration foi criada; esta fase não altera o esquema nem grava leads.

### Contratos do banco identificados no repositório

- `marketing_leads` tem constraint de `lead_type` restrita a `despachante` e `advogado_transito`; os outros segmentos planejados exigirão uma decisão de modelagem na fase de ingestão, antes de tentar persistir novos tipos.
- As migrations documentam índices únicos parciais para `phone_normalized) e outros identificadores de deduplicação. A implementação Firecrawl desta fase não grava no banco e, portanto, não interage com esses índices.
- `collection_runs` existe em migrations e representa o histórico da coleta atual. Ainda é necessário validar o esquema vivo e sua disponibilidade no projeto Supabase; a inspeção do Git não prova o estado atual do banco.
- O runtime publicado é um Cloudflare Worker (`wrangler.jsonc` → `cloudflare/worker.ts`), com rotas Hono e bindings via `c.env`. O coletor Selenium atual está no backend Node/Express e não pode ser presumido executável dentro do Worker. A integração do módulo de prospecção com o runtime publicado precisa ser validada antes de conectar a interface.

### Validação e limitações

- **Testes adicionados, execução pendente:** esta sessão não tem um checkout local executável nem acesso para rodar `npm run test:unit`/typecheck no ambiente do projeto. Não marcar a Fase 1 como totalmente aprovada até o CI ou o agente local executar os testes e corrigir eventuais falhas.
- **Busca real pendente:** o conector Firecrawl desta sessão informou falta de créditos para buscar a documentação ao vivo. A implementação usa o contrato documentado da API v2 Search, mas a prova com a credencial do Worker ainda precisa ser executada pela rota administrativa.
- **Secret de produção não verificado:** a existência/configuração de `FIRECRAWL_API_KEY` no Cloudflare não pôde ser confirmada nesta sessão. A ausência da variável deve resultar em HTTP 503, sem persistência ou outreach.
- Não houve deploy, execução de campanha, envio de mensagens nem escrita no Supabase.

### Commits da Fase 1

- Adaptador: `856990b992431b1117ccf1b6330917a10782681e`
- Testes: `87a3c3831f74983b4131e5ce5ec7a8bbef454201`
- Binding: `bb1ba41165c1276d71a6e926450e1ce3892b449f`
- Rota administrativa de teste: `79db6a4fd2949481af5978b7085cd09197d4dc63`

**Estado:** implementação estática da prova técnica adicionada em `main`; aprovação de testes e chamada real ainda pendentes. A Fase 2 não deve começar até concluir essas verificações.

- **Status de checks remotos após os commits:** o check disponível para o commit documental final reportou contexto `Vercel` em falha por limite de builds da conta (`build-rate-limit`). Esse check não confirma a execução dos testes unitários desta alteração; não foi possível obter resultado de typecheck/testes do código nesta sessão.
