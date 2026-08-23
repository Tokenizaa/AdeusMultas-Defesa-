---
name: content-flow
description: Convenções do pipeline de conteúdo — Kanban de 6 colunas, calendário editorial, drag & drop, aprovação e vínculo tema → conteúdo → criativo → publicação.
---

# Content Flow (Pipeline de Conteúdo)

Skill do agente `marketing-platform` — regras do fluxo editorial do Adeus Multa.

## Entidades e vínculos

```
marketing_themes ──promover──▶ growth_contents ──▶ growth_creatives ──▶ growth_publications
      (ideia)                  (base editorial)     (formatos)          (canais + horários)
```

## Kanban de conteúdo

Componente: `src/features/marketing/components/planning/ContentKanban.tsx`

Colunas (ordem fixa): **Ideias → Em produção → Aguardando aprovação →
Aprovado → Agendado → Publicado**.

- Ideias: cards de temas (sem drag) com ação "Transformar em conteúdo"
  (cria `growth_contents` com status `draft` e marca o tema `done`).
- Produção/Aprovação/Aprovado: drag & drop de conteúdos → atualiza
  `growth_contents.status` (draft → review → approved).
- Agendado → Publicado: drag & drop marca `growth_publications.status` como
  published via `useMarkPublicationPublished`.
- Nunca misturar `??` e `||` em expressões de fallback de título.

## Calendário editorial

Componente: `src/features/marketing/components/planning/EditorialCalendar.tsx`

- Visualizações: **Mês** (grade 7×6), **Semana**, **Lista**.
- Elementos: publicações (cor por pilar), campanhas (🚀 início/término),
  datas comemorativas (🎉 — lista local `COMMEMORATIVE_DATES`).
- Drag & drop de publicação agendada em um dia → `useMovePublication`
  (`publicationMoveSchema`: id + scheduled_at).
- Busca: `?view=calendar` / `?view=kanban` definem a aba inicial.

## Status válidos (schemas em `src/features/marketing/schemas/growth.ts`)

- Content: `draft | review | approved | archived`
- Publication: `scheduled | published | skipped`
- Creative: `draft | review | approved | archived`

## Aprovação

Fluxo: **Criador → Revisor → Aprovado → Publicado** (seção em
`/marketing/schedule` aba Aprovação e ação "Aprovar" na Biblioteca).

## Agendamento

`/marketing/schedule` — Composer: seleciona conteúdo (auto-cria criativo se
inexistente, formato derivado de `content.topic`), rede (`ig_feed/ig_reel/ig_story`),
legenda editável, data/hora, e ações: **Agendar**, **Publicar agora** (cria +
marca published), **Salvar rascunho**.

## Regras de tipo

- `ContentInsert`/`CreativeInsert` são tipos de *output* zod (defaults exigidos):
  sempre passar `tags: []`/`status`/`metadata` explicitamente.
- Updates parciais de tema: `updateTheme.mutate({ id, status } as ThemeUpdate)`.
- `useMarkPublicationPublished` espera `{ id, externalUrl? }` — não `id` cru.

## Produção (agendamento/publicação)

O fluxo editorial em produção é mantido por:
- `campaign-orchestrator` — orquestra campanhas (Edge Function)
- `publication-worker` — publica com retry/idempotência (Edge Function)
- **IA em cada etapa**: `9router-chat` para sugerir próximos passos

Manter contratos tipados; mudanças exigem revisão do `qualidade`.
