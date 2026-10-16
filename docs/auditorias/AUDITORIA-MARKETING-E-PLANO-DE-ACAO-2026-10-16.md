# Auditoria do módulo de Marketing e plano de ação

**Projeto:** `Tokenizaa/AdeusMultas-Defesa-`  
**Data:** 2026-10-16  
**Escopo:** Marketing B2C, criação de conteúdo e mídia, publicação social, métricas, prospecção B2B e integrações relacionadas.  
**Tipo:** Auditoria estática do código e da documentação do repositório.  
**Branch:** `docs/auditoria-marketing-plano-acao-2026-10-16`  
**Status:** Diagnóstico e plano documentados; nenhuma alteração funcional executada.

## 1. Resumo executivo

O módulo acumulou telas e caminhos de execução paralelos. O maior problema de experiência é a criação de mídia duplicada no Estúdio Criativo e no editor de conteúdo. O maior risco técnico é a diferença entre o frontend atual, o backend Express legado e o Worker Cloudflare, que não expõe os mesmos contratos de mídia.

A solução recomendada não é reconstruir o Marketing OS nem adicionar outra camada de agentes. É simplificar a experiência e escolher um caminho canônico para cada operação, preservando as funcionalidades comprovadamente usadas.

### Prioridades

1. **P0 — Confiabilidade:** confirmar o caminho real de produção e corrigir contratos de API, persistência de mídia, publicação e schema.
2. **P1 — Criação simples:** unificar texto, imagem e vídeo em um único fluxo de criação.
3. **P1 — Publicação segura:** ter um caminho canônico com aprovação, agendamento, publicação e tratamento de falhas.
4. **P2 — Dados confiáveis:** remover métricas calculadas por estimativa e exibir apenas valores rastreáveis.
5. **P2 — Limpeza:** remover código legado somente após confirmar ausência de consumidores e cobrir o comportamento por testes.

## 2. Método e limites

Foram examinados arquivos do repositório na branch padrão `main`, incluindo componentes React, rotas Express, rotas Cloudflare, cron, migrações e auditorias anteriores. As referências abaixo são evidências de código; elas não provam, por si só, que uma integração esteja ativa no ambiente de produção.

**Não foi executado nesta auditoria:** login em produção, chamadas reais a provedores de IA, publicação em Meta, envio de WhatsApp, consulta ao banco produtivo, build, lint ou testes E2E. Portanto, qualquer afirmação sobre operação real deve ser validada na fase de diagnóstico operacional, sem enviar mensagens ou publicar conteúdo.

As auditorias de agosto de 2026 foram usadas como histórico, não como prova automática do estado atual. Em particular, a documentação antiga diz que não havia agendador, mas o código atual contém `cloudflare/cron.ts` e registra `scheduledTick` no Worker. A implementação existe; seu funcionamento em produção ainda precisa ser verificado.

## 3. Achados confirmados por código

### A-01 — Criação de imagem e vídeo duplicada

**Severidade:** Alta para manutenção e experiência.

- `src/components/marketing/components/MediaStudioView.tsx` implementa geração de imagem, geração de vídeo, monitoramento de operação, parâmetros e mensagens de estado.
- `src/components/marketing/components/ContentEditor.tsx` implementa novamente geração de imagem e vídeo, chamadas HTTP, polling e tratamento de resultado.
- Os dois componentes chamam `/api/generate-image`, `/api/generate-video`, `/api/video-status` e `/api/video-download`, mantendo lógica e estados separados.

**Impacto:** duas experiências para tarefas semelhantes, manutenção duplicada e comportamento inconsistente.

**Ação:** criar um único fluxo de criação e um único serviço/contrato de mídia. O editor passa a consumir o resultado desse fluxo, sem manter uma segunda implementação de geração.

### A-02 — Vídeo de demonstração pode ser apresentado como vídeo gerado

**Severidade:** Alta.

Em `ContentEditor.tsx`, se a resposta JSON do download não contiver `videoUrl`, o código usa um vídeo de demonstração público como fallback e apresenta a mensagem de que o vídeo foi gerado com sucesso.

**Impacto:** o usuário pode acreditar que recebeu a mídia solicitada quando, na realidade, recebeu um vídeo de amostra.

**Ação:** remover o fallback demonstrativo do fluxo produtivo. Resultado sem URL/arquivo válido deve ser tratado como falha explícita, sem mensagem de sucesso.

### A-03 — Vídeo gerado não é persistido junto ao conteúdo pelo editor

**Severidade:** Alta.

O editor mantém `attachedVideoUrl` no estado, mas a função `persist` envia `imageUrl` e `mediaUrl` sem incluir `videoUrl: attachedVideoUrl`. Assim, o vídeo pode aparecer temporariamente na sessão e não ser salvo como parte do conteúdo.

**Ação:** persistir os campos de mídia de forma explícita e validar o ciclo completo: gerar → visualizar → salvar → reabrir → publicar.

### A-04 — Contrato de geração não está exposto pelo Worker Cloudflare

**Severidade:** Crítica se a aplicação estiver usando o Worker como backend de produção.

O frontend chama os endpoints `/api/generate-image` e `/api/generate-video`. O arquivo `cloudflare/worker.ts` registra rotas de marketing, comunicação, IA e outros módulos, mas não registra as rotas Express de mídia (`src/server/routes/media.ts`) nem implementa os quatro endpoints usados pelos componentes. O fallback do Worker responde 404 para rotas `/api/*` não implementadas.

O backend Express tem uma implementação separada em `src/server/routes/media.ts`, com contratos próprios como `/api/media/image`, `/api/media/video` e `/api/media/image-to-video`.

**Impacto:** a interface pode funcionar em um ambiente Express e falhar no deploy Cloudflare, ou depender de roteamento/proxy não documentado.

**Ação:** confirmar o backend realmente servido em produção. Depois, definir um contrato canônico compatível com Cloudflare e adaptar o frontend a ele. Não criar um segundo conjunto de endpoints como remendo.

### A-05 — Publicação manual e agendada podem concorrer

**Severidade:** Alta.

- `cloudflare/routes/marketing.ts` publica conteúdo pela rota `/marketing/publish/:id`.
- `cloudflare/cron.ts` procura conteúdo com status `agendado` e horário vencido, publica e só depois atualiza o registro para `publicado`.
- A rota manual não faz uma reivindicação atômica do conteúdo nem bloqueia explicitamente um conteúdo já publicado antes de enviar à Meta.

**Impacto:** chamadas concorrentes, repetição de cron ou falha após publicação externa podem provocar publicação duplicada ou estado divergente.

**Ação:** criar uma transição de estado atômica antes da publicação, com controle de concorrência/idempotência, registro do resultado externo e política de retry explícita. A operação manual e o cron devem chamar o mesmo serviço de publicação.

### A-06 — Falha de publicação agendada pode ser repetida sem limite claro

**Severidade:** Alta.

No cron atual, quando o provedor retorna falha, o código registra `external_status: 'failed'`, mas mantém `status: 'agendado'`. A consulta do próximo tick continua selecionando esse conteúdo vencido.

**Impacto:** novas tentativas podem ocorrer a cada execução do cron sem limite de tentativas, backoff ou estado de falha terminal claramente aplicado.

**Ação:** definir estados e política de retry explícitos: número máximo de tentativas, espera progressiva, erro visível no painel e ação de reprocessar manualmente.

### A-07 — Métricas de conversão não são métricas observadas

**Severidade:** Alta para decisões de negócio.

Em `src/server/workers/marketing-metrics.worker.ts`, `newCasesGenerated` é calculado como metade do número de publicações e `conversionRate` é estimado a partir do número de publicações. `monthlyReach` permanece com o valor acumulado em memória, sem coleta real implementada nesse arquivo.

**Impacto:** números podem parecer resultados reais e induzir decisões erradas de conteúdo ou orçamento.

**Ação:** remover estimativas apresentadas como fatos. Até integrar fontes reais, exibir “não disponível” ou “não conectado”. Para cada métrica, documentar fonte, período, fórmula e horário da última atualização.

### A-08 — Contrato de banco diverge dos valores usados pela interface

**Severidade:** Alta; precisa ser validada contra o schema efetivamente aplicado.

A migração `supabase/migrations/20260829120002_baseline_unversioned_marketing_tables.sql` limita `editorial_content.format` a `carrossel`, `artigo_seo`, `reels_roteiro`, `infografico` e `newsletter`, enquanto o frontend usa também `post_imagem`. A migração limita `status` a quatro valores, enquanto o frontend tipa também `reprovado_qualidade`.

A mesma migração documenta que algumas tabelas e estruturas foram criadas fora do versionamento anteriormente. Isso torna necessário conferir o schema aplicado, não apenas o arquivo local.

**Impacto:** gravações podem falhar por restrições, ou ambientes diferentes podem se comportar de maneira distinta.

**Ação:** inventariar valores realmente usados, escolher um contrato único e versioná-lo em migrações. Testar criação, edição, reprovação, aprovação e agendamento em banco de teste antes de alterar dados de produção.

### A-09 — Atualização de conteúdo envia objeto sem mapeamento explícito

**Severidade:** Média/alta.

Em `cloudflare/routes/marketing.ts`, o `PUT /marketing/contents/:id` aplica `update({ ...body, updated_at: ... })` diretamente ao banco. O frontend trabalha com nomes camelCase como `copyText`, `imageUrl` e `scheduledDate`, enquanto a tabela usa nomes snake_case como `copy_text`, `image_url` e `scheduled_date`.

**Impacto:** campos podem ser ignorados ou rejeitados, dependendo do payload recebido; o contrato é frágil e não valida campos permitidos.

**Ação:** implementar um DTO/schema explícito para criação e atualização, com conversão camelCase/snake_case, validação de tipos e lista de campos aceitos.

### A-10 — Navegação fragmentada e opções em excesso

**Severidade:** Alta para usabilidade.

`MarketingOSView.tsx` divide a operação em grupos e telas como Dashboard Geral, Inbox, Conteúdo, Estúdio Criativo IA, Publicação, Canais Conectados, Análise de Resultados, Configurações e Prospecção. A criação de mídia fica separada da edição do conteúdo.

**Impacto:** o usuário precisa decidir em qual ferramenta entrar antes de conseguir concluir uma tarefa simples.

**Ação:** reduzir a navegação visível para poucas áreas orientadas a tarefas, sem eliminar funções antes de confirmar seu uso.

### A-11 — O upload de mídia tem uma rota Cloudflare, mas a geração é outro fluxo

**Severidade:** Média.

`/marketing/media/upload` no Worker aceita mídia em base64, limita o arquivo a 50 MB e envia ao Supabase Storage. Essa rota resolve armazenamento, não geração. O código de geração usado pelo frontend está separado no Express.

**Impacto:** gerar, armazenar e anexar mídia não compõem hoje um único contrato evidente.

**Ação:** unificar a jornada no frontend e separar internamente três responsabilidades claras: gerar, armazenar e associar ao conteúdo. Cada etapa deve retornar estado e erro explícitos.

### A-12 — Auditorias antigas e código atual divergem

**Severidade:** Média.

Documentos como `AUDITORIA-MARKETING.md`, `docs/adr/ADR-017-Marketing-Platform-Governance-Audit.md` e `docs/auditoria-marketingos-b2c-b2b-whatsapp.md` contêm achados operacionais e arquiteturais úteis, mas são datados de agosto de 2026. Parte das afirmações sobre agendamento e caminhos de execução não coincide integralmente com o Worker Cloudflare atual.

**Ação:** tratar os documentos antigos como histórico. Atualizar o índice de auditoria com data, evidência, ambiente observado e estado (confirmado por código, confirmado por execução, risco ou não verificado).

## 4. Simplificação proposta para o usuário

A interface deve ser centrada em tarefas e evitar duas entradas para a mesma operação.

1. **Visão geral:** estado da operação, conteúdos pendentes, próximos agendamentos e alertas reais.
2. **Criar conteúdo:** um único fluxo para texto, imagem ou vídeo.
3. **Publicações:** biblioteca, revisão/aprovação, calendário, agendamento, histórico e falhas.
4. **Público e conversas:** prospecção B2B e atendimento, com distinção clara entre os dois.
5. **Configurações:** marca, canais conectados e automações avançadas.

A área Comercial deve permanecer separada até a auditoria de dependências confirmar quais funções são usadas e se compartilham o mesmo objetivo operacional.

### Fluxo de criação recomendado

1. Escolher objetivo ou tema.
2. Escolher formato: texto, imagem ou vídeo.
3. Gerar uma proposta inicial com padrões sensatos.
4. Revisar texto e mídia no mesmo lugar.
5. Salvar como rascunho ou enviar para aprovação.
6. Só então agendar ou publicar.

As opções técnicas (modelo, resolução, proporção, prompt avançado e imagem de referência) ficam em “Opções avançadas”. Vídeo deve ser outro formato dentro do mesmo fluxo, não outro produto/tela.

## 5. Plano de ação por fases completas

As fases devem ser executadas uma por vez, de ponta a ponta. Cada fase termina com documentação atualizada, testes e critérios de aceite antes de começar a próxima.

### Fase 1 — Fechar a verdade operacional e os contratos

**Objetivo:** saber qual backend atende a produção e quais contratos estão realmente disponíveis.

- Confirmar configuração e caminho de deploy do Worker Cloudflare e do Express.
- Mapear todas as rotas usadas pela interface e identificar o backend que as atende.
- Comparar os schemas do frontend, Express, Worker e Supabase para conteúdo, mídia, estados e publicação.
- Verificar migrações aplicadas e restrições no ambiente de teste; não executar mudanças de schema em produção.
- Fazer testes controlados sem publicar nem enviar mensagens.
- Atualizar esta auditoria com resultados de execução, separando evidência de código de evidência operacional.

**Critérios de aceite:** mapa de rotas completo; contratos canônicos documentados; incompatibilidades reproduzidas ou descartadas; nenhuma publicação/mensagem real disparada durante o diagnóstico.

### Fase 2 — Unificar a criação de conteúdo e mídia

**Objetivo:** oferecer um só fluxo de criação e eliminar a lógica duplicada.

- Definir um único serviço/contrato de geração de texto, imagem e vídeo compatível com o backend de produção.
- Reutilizar esse serviço no Estúdio e no editor, depois remover a segunda implementação de geração.
- Eliminar o vídeo de demonstração como fallback de sucesso.
- Persistir corretamente imagem, vídeo, prompt, formato, MIME type e metadados necessários.
- Implementar estados claros: aguardando, gerando, concluído e falhou; permitir tentar novamente sem perder o texto.
- Simplificar a tela com padrões automáticos e opções avançadas recolhidas.
- Testar geração real quando as credenciais/provedores de teste estiverem disponíveis; sem credenciais, validar a falha e não simular sucesso.

**Critérios de aceite:** uma única implementação de geração; nenhum falso positivo; mídia sobrevive a salvar/reabrir; build e testes relevantes passam.

### Fase 3 — Tornar aprovação, agendamento e publicação seguros

**Objetivo:** garantir um único caminho de publicação.

- Unificar publicação manual e agendada em um serviço compartilhado.
- Implementar reivindicação atômica do conteúdo e idempotência.
- Definir estados para publicação em andamento, sucesso e falha.
- Limitar tentativas e aplicar backoff; permitir reprocessamento manual com erro visível.
- Impedir que conteúdo publicado seja enviado novamente por uma rota concorrente.
- Testar com adaptador simulado ou conta de teste, nunca disparando publicação real sem autorização explícita.

**Critérios de aceite:** testes de concorrência e repetição passam; falha não provoca loop infinito; cada conteúdo tem resultado rastreável.

### Fase 4 — Corrigir métricas e governança de dados

**Objetivo:** não apresentar estimativas como resultados reais.

- Remover fórmulas estimadas de conversão e novos casos do painel.
- Integrar fontes reais somente quando houver acesso e contrato confiável.
- Identificar métricas sem fonte como indisponíveis.
- Documentar fonte, período, fórmula e última coleta.
- Convergir valores de `format` e `status` entre UI, API e banco por migrações versionadas.
- Cobrir os estados de conteúdo com testes de contrato.

**Critérios de aceite:** toda métrica exibida tem fonte e regra documentadas; nenhum valor inventado aparece como observado; banco e aplicações usam os mesmos estados.

### Fase 5 — Simplificar navegação e limpar legado

**Objetivo:** reduzir complexidade percebida e custo de manutenção sem perder recursos.

- Reorganizar as telas nas cinco áreas propostas.
- Manter aliases/rotas antigas durante a transição, se forem necessárias para links existentes.
- Auditar imports e uso real de componentes antes de remover arquivos.
- Remover telas e serviços duplicados somente depois de testes de regressão.
- Revisar acessibilidade, responsividade, estados vazios, carregamento e mensagens de erro.

**Critérios de aceite:** todas as tarefas essenciais podem ser concluídas na nova navegação; nenhum recurso ativo desaparece; não há regressões de rotas; build, lint e E2E passam.

### Fase 6 — Validar a operação integrada e encerrar

**Objetivo:** confirmar o comportamento ponta a ponta e deixar a documentação confiável.

- Executar testes automatizados e E2E dos fluxos de criação, edição, persistência, aprovação e agendamento.
- Verificar a integração com Meta em ambiente controlado, com autorização explícita antes de qualquer publicação real.
- Validar monitoramento, logs e mensagens de erro.
- Atualizar README/auditoria com arquitetura final, variáveis necessárias, limitações e procedimentos de recuperação.
- Entregar um relatório de conclusão com testes executados, resultados, riscos restantes e mudanças feitas.

**Critérios de aceite:** fluxos críticos passam; nenhuma integração é descrita como ativa sem prova; documentação coincide com o código implantado.

## 6. Ordem de prioridade e risco

| Prioridade | Itens | Motivo |
|---|---|---|
| P0 | A-04, A-05, A-06, A-08, A-09 | Podem bloquear mídia, corromper estados ou duplicar publicações |
| P1 | A-01, A-02, A-03, A-11 | Afetam diretamente criação, confiança e persistência |
| P1 | A-07 | Impede decisões confiáveis com base no painel |
| P2 | A-10, A-12 | Simplificação de experiência e manutenção documental |

## 7. Fora do escopo desta auditoria

- Não publicar conteúdo nem iniciar campanhas.
- Não enviar mensagens por WhatsApp, Meta ou outros canais.
- Não alterar dados ou schema de produção.
- Não remover componentes ainda.
- Não migrar o projeto para outra plataforma.
- Não adicionar uma nova arquitetura de agentes, filas ou infraestrutura antes de provar que é necessária.

## 8. Referências examinadas

- `src/components/marketing/MarketingOSView.tsx`
- `src/components/marketing/components/MediaStudioView.tsx`
- `src/components/marketing/components/ContentEditor.tsx`
- `src/components/marketing/hooks/use-marketing-service.ts`
- `src/server/routes/media.ts`
- `src/server/workers/marketing-metrics.worker.ts`
- `cloudflare/worker.ts`
- `cloudflare/routes/marketing.ts`
- `cloudflare/cron.ts`
- `supabase/migrations/20260829120002_baseline_unversioned_marketing_tables.sql`
- `AUDITORIA-MARKETING.md`
- `docs/adr/ADR-017-Marketing-Platform-Governance-Audit.md`
- `docs/auditoria-marketingos-b2c-b2b-whatsapp.md`

---

**Conclusão:** a recomendação é corrigir primeiro os contratos e a confiabilidade operacional, depois unificar a criação de mídia, tornar a publicação idempotente, corrigir métricas e só então reorganizar e remover legado. Isso reduz a complexidade sem transformar a simplificação visual em uma reescrita arriscada.


## 9. Diretriz complementar — NVIDIA padrão e remoção do 9Router na criação

**Decisão para a Fase 1:** no módulo de Marketing, NVIDIA deve ser o provedor padrão para criação de conteúdo por IA. Nenhuma criação de texto, imagem ou vídeo deve ser roteada por Ninerouter/9Router nem cair silenciosamente nesse gateway como fallback.

A diretriz se aplica ao fluxo de criação do Marketing. A Fase 1 deve mapear separadamente outros usos de IA do produto (por exemplo, embeddings, RAG e análise de documentos), para não remover dependências fora do escopo por engano. Uma remoção global de 9Router exige inventário transversal e plano de migração próprios.

### Evidências no repositório

- `src/server/observability/ai-provider-manager.ts` descreve e implementa NVIDIA → 9Router → Gemini/RAG.
- `src/server/knowledge/embedding-service.ts` descreve NVIDIA → 9Router → Gemini/vetorização determinística.
- `src/server/services/ai-media-service.ts` usa `@google/genai` e depende de `GEMINI_API_KEY` para geração de imagem/vídeo; a geração de mídia não está centralizada em NVIDIA.
- `deploy/index.mjs` contém o proxy `/_9router/v1/*` para `NINEROUTER_UPSTREAM`.
- `CLOUDFLARE.md`, `.env.example.example`, `src/server/config/config-service.ts`, documentação e observabilidade ainda citam credenciais e estados de 9Router.
- `src/server/services/ai-media-service.ts` e auditorias anteriores registram fallbacks simulados de imagem/vídeo em certas condições.

### Requisitos obrigatórios da Fase 1

1. Inventariar cada referência a `NINEROUTER`, `9router`, `/_9router` e variantes, classificando-a como criação de Marketing, outro domínio de IA, legado, documentação, monitoramento ou segredo de deploy.
2. Confirmar quais modelos e endpoints NVIDIA estão disponíveis e autenticados para texto, imagem e vídeo. Não presumir que a API de chat também gera mídia.
3. Definir NVIDIA como provedor explícito e padrão no contrato de criação do Marketing; remover seleção automática de 9Router nessa jornada.
4. Se NVIDIA não suportar uma modalidade necessária no ambiente contratado, retornar indisponibilidade clara. Não substituir silenciosamente por 9Router, Gemini, SVG, vídeo de amostra ou outro provedor.
5. Identificar quais segredos `NINEROUTER_*` podem ser desativados depois da migração. Não apagar segredos de produção antes de comprovar que nenhum outro serviço os consome.
6. Atualizar configurações, estados, métricas, testes, documentação e instruções dos agentes para refletir o provedor real, sem métricas simuladas.
7. Criar testes que falhem se o fluxo de criação do Marketing chamar 9Router ou declarar sucesso sem mídia real e válida.

### Critérios de aceite específicos

- NVIDIA é a única rota de provedor para criação de Marketing.
- Não existe fallback silencioso para 9Router nem mocks apresentados como resultados reais.
- Texto, imagem e vídeo têm suporte NVIDIA verificado individualmente; qualquer modalidade sem suporte fica explicitamente bloqueada e documentada.
- Usos de 9Router fora da criação de Marketing foram inventariados antes de remover variáveis globais ou proxies.
- A remoção de segredos e do proxy ocorre somente após busca de referências, testes e validação do runtime de produção.

**Ordem atualizada:** a Fase 1 inclui a auditoria de provedores e a confirmação das capacidades NVIDIA como requisito bloqueante. A Fase 2 só começa depois que o contrato de criação e o suporte real de cada modalidade estiverem definidos.
