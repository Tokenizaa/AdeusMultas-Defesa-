---
name: social-media-management
description: Padrões de plataforma de gestão de redes sociais (referência mLabs + Meta Business Suite + Linear/Notion). Fluxo Planejamento → Produção → Aprovação → Agendamento → Publicação → Análise → Otimização, com IA em todas as etapas.
---

# Plataforma de Gestão de Redes Sociais

Skill do agente `marketing-platform` para construir e evoluir o módulo de
gestão de redes sociais do Adeus Multa no padrão de ferramentas como mLabs.

## Princípio central

> **Conteúdo é a entidade principal. Campanha organiza a estratégia.
> Planejamento organiza o fluxo. Agendamento distribui. Interações conectam
> com a audiência. Relatórios geram aprendizado. IA presente em todas as etapas.**

## Mapa do fluxo (estágios → dados)

| Estágio | Fonte de dados | Status |
|---|---|---|
| Ideias | `marketing_themes` (status `idea`/`selected`) | idea → selected |
| Produção | `growth_contents` (status `draft`) | draft |
| Aprovação | `growth_contents` (status `review`) | review |
| Aprovado | `growth_contents` (status `approved`) | approved |
| Agendado | `growth_publications` (status `scheduled`) | scheduled |
| Publicado | `growth_publications` (status `published`) | published |

## Mapa de rotas

| Seção | Rota | Conteúdo |
|---|---|---|
| Dashboard | `/marketing` | Header (conta/período/rede/CTAs), 7 KPIs, calendário resumido, pipeline kanban, performance por canal, insights IA |
| Planejamento | `/marketing/planning` | Kanban (6 colunas, drag & drop), calendário editorial (mês/semana/lista + datas comemorativas), temas |
| Conteúdos | `/marketing/contents` | Biblioteca (abas + filtros), Criador (6 tipos + previews), Wizard, Assistente IA, Assets |
| Agendamento | `/marketing/schedule` | Fila de publicação, Composer (rede/conteúdo/legenda/horário), Aprovação |
| Interações | `/marketing/inbox` | Inbox unificada (comentários/mensagens/menções), dados do usuário, IA de resposta |
| Relatórios | `/marketing/results` | KPIs, performance por rede, ranking de conteúdo, exportação CSV/PDF |
| Configurações | `/marketing/settings` | Contas conectadas, Equipe (papéis/permissões), Marca (Brand Context), IA (modelo/prompts/regras) |

## Convenções de implementação

- **Kit de UI**: `src/components/marketing/{primitives,layout,navigation,feedback,dialogs,forms,ai}`.
  Usar `AppPage` + `PageHeader` + `PageToolbar` + `Workspace` como esqueleto de página.
- **KPIs**: `MetricCard` (label, value, icon, trend, subtext). Grids de 6–7 cards em telas xl.
- **Status**: `StatusPill` com variantes success/warning/danger/info/neutral/primary.
- **Labels**: `src/features/marketing/lib/labels.ts` — nunca duplicar mapas de labels.
- **Formatação**: `formatCompact`/`formatNumber`/`formatDateLabel` (pt-BR).
- **Acessibilidade**: labels visíveis, `aria-label` em botões de ícone, contraste WCAG AA,
  alvos ≥ 44px (DESIGN.md — Restraint Rule, Flat-By-Default, Legibility Floor).

## Métricas estimadas vs reais

Até a integração com APIs oficiais (Instagram Graph, Facebook Insights, etc.),
alcance/impressões/engajamento são **estimativas determinísticas** derivadas dos
dados locais (publications/contents). Toda estimativa exibe "estimado" na UI e
deve ser substituída pela métrica real mantendo a mesma superfície de dados.

## Verificação

- `bun run build` deve passar (validar rotas + SSR).
- `bunx tsc --noEmit` sem erros novos nos arquivos do módulo.
- `bunx eslint` sem `error` nos arquivos do módulo (warnings aceitos no baseline).

## Produção (LLMs via 9Router)

Em produção, a geração/otimização de conteúdo usa 9Router FREE:
- **Geração de conteúdo**: `9router-chat` (combo auto-fallback)
- **Embeddings do repertório**: `9router-embeddings` (NVIDIA NV-Embed-v2)
- **Análise de métricas**: `9router-chat` (análise e sugestões)
- **RAG**: `knowledge-embeddings` + `knowledge-search` (Edge Functions)

Config: `NINEROUTER_URL` + `NINEROUTER_KEY` em Supabase Secrets.
