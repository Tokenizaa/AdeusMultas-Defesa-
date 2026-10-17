# Inventário funcional — Crescimento → Operação de Marketing

**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Escopo:** inventário descritivo dos destinos, componentes e funções identificáveis no código.  
**Objetivo desta etapa:** registrar o que existe e para que cada parte aparenta servir, antes de avaliar qualidade, integração, falhas ou propor alterações.

> Este documento registra a estrutura identificada no código. A presença de um componente ou de uma ação na interface não comprova, por si só, que o fluxo esteja funcionando corretamente em produção.

## 1. Localização no menu administrativo

O grupo **Crescimento** contém três áreas distintas. Este inventário detalha somente **Operação de Marketing**. Prospecção B2B Autônoma e Gestão Comercial são módulos vizinhos, não devem ser confundidos com as telas internas da Operação de Marketing.

### 1.1 Destinos de Operação de Marketing

| Item do menu | Rota / parâmetro | Função aparente |
|---|---|---|
| Dashboard Geral | `/admin/marketing` | Visão resumida da operação de marketing |
| Inbox Unificado | `/admin/marketing?view=inbox` | Atendimento e conversas de canais integrados |
| Kanban Editorial | `/admin/marketing?view=planning` | Organização visual do fluxo editorial |
| Biblioteca de Conteúdos | `/admin/marketing?view=contents` | Consulta e gestão dos conteúdos |
| Estúdio Criativo IA | `/admin/marketing?view=studio` | Criação de materiais com recursos de IA |
| Agendamento & Fila | `/admin/marketing?view=schedule` | Visualização de publicações e itens na fila |
| Automações de Postagem | `/admin/marketing?view=automations` | Acesso à área associada à publicação automatizada |
| Canais Conectados | `/admin/marketing?view=channels` | Consulta e conexão de canais |
| Análise de Resultados | `/admin/marketing?view=results` | Exibição de indicadores de resultados |
| Configurações de Marca | `/admin/marketing?view=settings` | Configurações de identidade e operação |

### 1.2 Observação sobre o roteamento

O componente `MarketingOSView.tsx` centraliza a seleção das telas. Os aliases identificados no código são:

- `planning` → `contents`
- `schedule` → `publication`
- `automations` → `publication`

Assim, dez destinos aparecem no menu, mas nem todos correspondem a dez implementações de tela independentes. O Kanban Editorial e a Biblioteca de Conteúdos compartilham a área de conteúdo; Agendamento & Fila e Automações de Postagem compartilham a área de publicação. O comportamento específico de cada alias deve ser confirmado na navegação completa antes de concluir se há diferenças funcionais entre eles.

## 2. Inventário de telas e componentes

### 2.1 Dashboard Geral

**Componente principal:** `MarketingDashboard.tsx`

Funções e blocos identificados:

- Indicadores resumidos: Alcance Mensal, Novos Casos, Conversão e Publicados.
- Exibição de alertas ou estado operacional.
- Acesso ao Estúdio Criativo IA.
- Informações relacionadas a agentes e ciclos de execução.

**Papel na operação:** concentrar uma visão resumida do estado do marketing e oferecer acesso a atividades relacionadas.

### 2.2 Inbox Unificado

**Componente principal:** `InboxView.tsx`

Funções e blocos identificados:

- Lista e pesquisa de conversas.
- Referências a canais de WhatsApp (Evolution), Instagram Direct e Messenger.
- Indicadores de conversas, leads qualificados e respostas por IA.
- Consulta do histórico e interface para envio de mensagens.
- Alternância entre IA automática e atendimento humano.
- Exibição de dados do contato/motorista: nome, telefone, origem e identificador do canal.
- Exibição de informações de infração: enquadramento CTB, placa, valor estimado e anotações.
- Painel de diagnóstico de mensageria.
- Interface de simulação de mensagem recebida, destinada a testes.

**Papel na operação:** reunir conversas e informações do contato em uma interface de atendimento, com recursos associados à automação por IA e à transferência para atendimento humano.

### 2.3 Kanban Editorial e Biblioteca de Conteúdos

**Componente principal:** `ContentView.tsx`

Funções e blocos identificados:

- Apresentação de conteúdos em Kanban, lista ou cartões.
- Busca por título ou tese jurídica.
- Filtros e atributos de canal, formato, status, agendamento e qualidade.
- Ação para criar conteúdo.
- Organização de itens do fluxo editorial e consulta dos conteúdos existentes.

**Papel na operação:** organizar e localizar materiais de marketing ao longo do fluxo editorial.

### 2.4 Editor de Conteúdo

**Componente:** `ContentEditor.tsx`

Funções e campos identificados:

- Edição do título e do texto/copy, com suporte a Markdown.
- Seleção de canal, formato e agendamento.
- Edição de hashtags.
- Canais listados: Instagram, Facebook, TikTok, Blog/SEO, LinkedIn e E-mail.
- Formatos listados: carrossel, publicação única, Reels/roteiro, artigo SEO, infográfico e newsletter.
- Ações relacionadas à geração por IA e ao gerenciamento de versões.
- Atualização do status do conteúdo.
- Ação de publicação via Meta.

**Papel na operação:** editar e preparar o material antes de sua publicação ou encaminhamento no fluxo editorial.

### 2.5 Estúdio Criativo IA

**Componente principal:** `MediaStudioView.tsx`

Funções e recursos identificados:

- Geração de imagens.
- Envio de uma imagem-base.
- Recursos de animação/geração de vídeo com Veo.
- Entrada de prompts e seleção de formatos de saída.
- Download dos materiais gerados.
- Geração de uma semana de publicações (sete dias).
- Encaminhamento do conteúdo criado para o fluxo editorial.

**Papel na operação:** produzir materiais criativos e encaminhá-los ao processo de conteúdo.

### 2.6 Agendamento & Fila / Automações de Postagem

**Componente principal:** `PublicationDashboard.tsx`

Funções e blocos identificados:

- Listagem de conteúdos agendados.
- Visualização da fila e de jobs.
- Exibição de status, canal e horário.
- Estados relacionados à publicação.
- Informações sobre o ciclo autônomo.

**Papel na operação:** acompanhar itens destinados à publicação e o estado registrado de sua execução.

**Nota de roteamento:** os destinos de agendamento e automações apontam para esta área por meio dos aliases identificados em `MarketingOSView.tsx`. O inventário não presume que exista uma tela autônoma de automações separada.

### 2.7 Canais Conectados

**Componente principal:** `ChannelsView.tsx`

Funções identificadas:

- Apresentação da integração com a Meta.
- Ação para conectar a Meta.

**Papel na operação:** apresentar e iniciar o fluxo de conexão do canal Meta. O inventário do componente visível não confirma o estado real das credenciais nem o sucesso da conexão em produção.

### 2.8 Análise de Resultados

**Componente principal:** `ResultsView.tsx`

Indicadores identificados:

- Alcance mensal.
- Novos casos.
- Conversão.
- Publicados.
- Agendados.

**Papel na operação:** exibir um resumo de métricas relacionadas às atividades de marketing e publicação. A origem, fórmula, período e atualização de cada indicador ainda precisam ser mapeados em uma etapa própria.

### 2.9 Configurações de Marca

**Componente principal:** `MarketingSettings.tsx`

Funções e campos identificados:

- Identidade visual.
- Cores primárias.
- Palavras proibidas.
- Informações sobre ciclo/orquestrador.
- Informações sobre agentes.

**Papel na operação:** reunir parâmetros de identidade e algumas configurações relacionadas à execução do marketing.

## 3. Componentes transversais identificados

### 3.1 Hook de serviços de marketing

**Arquivo:** `src/components/marketing/hooks/use-marketing-service.ts`

Operações identificadas:

- Atualizar dados de marketing (`refreshMarketingData`).
- Criar conteúdo manual (`createManualContent`).
- Atualizar status e campos de conteúdo.
- Buscar versões de conteúdo.
- Executar um passo do ciclo (`runCycleTick`).
- Gerar conteúdo.
- Publicar via Meta.
- Conectar e desconectar a Meta.

**Papel transversal:** disponibilizar operações compartilhadas pela interface. A lista de funções, isoladamente, não comprova o comportamento de cada integração ou sua disponibilidade em produção.

### 3.2 Serviços, rotas e workers relacionados

Os seguintes arquivos foram identificados como relacionados à estrutura de marketing:

- `src/server/services/marketing-service.ts`
- `src/server/workers/marketing-orchestrator.worker.ts`
- `src/server/workers/marketing-metrics.worker.ts`
- `src/server/workers/meta-publisher.worker.ts`
- `src/server/routes/marketing.ts`
- `src/server/routes/marketing-automation.ts`
- `src/data/marketing-agents-data.ts`
- `src/features/growth/api/index.ts`
- `src/features/growth/hooks/use-growth.ts`

**Papel provável conforme a identificação dos arquivos:** serviço de domínio, orquestração de ciclos, métricas, publicação, rotas de API, dados de agentes e acesso a funções de crescimento. O mapeamento de chamadas, entradas, saídas, persistência e dependências entre esses arquivos ainda não foi concluído; portanto, esta lista não afirma uma cadeia de execução validada.

## 4. Módulos vizinhos — fora do escopo desta etapa

O menu Crescimento também apresenta áreas separadas:

- **Prospecção B2B Autônoma:** Visão Geral, Leads, Campanhas, Automação, Fila e Coleta.
- **Gestão Comercial (Hub):** Visão Geral, Preços, Promoções, Cupons, Bônus, Indicações, Comissões e Configurações.

Essas áreas não são contabilizadas como telas internas da Operação de Marketing neste inventário. A integração entre elas e a Operação de Marketing não foi validada nesta etapa.

## 5. Limites do levantamento

Este documento registra nomes, destinos e funções aparentes com base na estrutura de código identificada. Ainda não determina:

- Se cada botão ou ação funciona de ponta a ponta.
- Quais tabelas, views ou funções do banco alimentam cada indicador.
- Quais rotas de API são chamadas por cada tela.
- Como autenticação, autorização e permissões são aplicadas em cada operação.
- Quais tarefas são executadas por agendadores, workers ou ciclos autônomos.
- Se os canais e credenciais estão conectados e operacionais em produção.
- Se os números exibidos têm fórmulas, fontes e períodos consistentes.
- Se há componentes duplicados, recursos sem uso ou funcionalidades incompletas.

Nenhuma alteração de código, banco de dados, configuração ou comportamento da aplicação faz parte desta etapa.

## 6. Próxima etapa do inventário

Completar o mapeamento tela por tela, registrando para cada bloco:

1. Componente e responsabilidade.
2. Dados exibidos e sua origem.
3. Ações disponíveis e o que cada ação chama.
4. Rotas/API, serviços, workers e persistência envolvidos.
5. Relações com outras telas e módulos.
6. Estado observado no código, sem confundir implementação encontrada com funcionamento validado.

A avaliação crítica e as propostas de intervenção devem ocorrer somente depois de o inventário funcional estar completo.
