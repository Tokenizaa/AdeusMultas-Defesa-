---
name: adeus-multa-design-system
description: Use quando construir, revisar ou iterar UI no Adeus Multa (DefesAi) — componentes, telas, landing, onboarding, dashboard ou marketing. Garante o uso dos tokens visuais canônicos (oklch, tipografia, raio, espaçamento) do DESIGN.md e a consistência de interface. Aciona também ao revisar acessibilidade, estados de UI, ou QA visual de telas.
---

# Skill: Design System Adeus Multa (tokens + QA visual)

## Por que esta skill existe

O Adeus Multa tem um **design system canônico** em `DESIGN.md` (tokens oklch, tipografia
Merriweather/Inter, raios, espaçamentos). Componentes que ignoram esses tokens geram UI
inconsistente e "genérica" (shadcn-default). **Usar os tokens é obrigatório**, não sugestão.

**Fonte da verdade:** `DESIGN.md` (289 linhas). Esta skill é o atalho para os valores-chave

- as regras de QA visual. Se houver conflito, `DESIGN.md` manda.

## Tokens canônicos (do DESIGN.md)

### Cores (oklch)

| Token              | Valor                                     |
| ------------------ | ----------------------------------------- |
| `primary`          | `oklch(0.48 0.17 258)` — azul da marca    |
| `foreground`       | `oklch(0.24 0 0)` — texto principal       |
| `background`       | `oklch(1 0 0)` — branco                   |
| `muted`            | `oklch(0.96 0 0)`                         |
| `muted-foreground` | `oklch(0.5 0.01 260)`                     |
| `secondary`        | `oklch(0.97 0.005 260)`                   |
| `accent`           | `oklch(0.955 0.03 260)`                   |
| `border`           | `oklch(0.9 0 0)`                          |
| `destructive`      | `oklch(0.58 0.22 29)` — vermelho          |
| `success`          | `oklch(0.62 0.15 155)` — verde            |
| `warning`          | `oklch(0.79 0.16 82)` — âmbar             |
| `info`             | `oklch(0.48 0.17 258)` — mesmo da primary |
| `ring` / `input`   | `oklch(0.48 0.17 258)` / `oklch(0.9 0 0)` |

### Tipografia

| Estilo     | Família                          | Tamanho                  | Peso | Line-height     |
| ---------- | -------------------------------- | ------------------------ | ---- | --------------- |
| `display`  | **Merriweather, Georgia, serif** | `clamp(2rem,5vw,3.5rem)` | 700  | 1.1, ls -0.02em |
| `headline` | Inter                            | `clamp(1.5rem,3vw,2rem)` | 600  | 1.2, ls -0.01em |
| `title`    | Inter                            | 1.25rem                  | 600  | 1.3             |
| `body`     | Inter                            | 1rem                     | 400  | 1.6             |
| `label`    | Inter                            | 0.875rem                 | 500  | —               |

### Raios & Espaçamento

- `rounded`: sm 4 · md 8 · lg 12 · xl 16
- `spacing`: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48

### Botões canônicos

| Variante    | BG          | Texto                    | Raio | Padding                |
| ----------- | ----------- | ------------------------ | ---- | ---------------------- |
| `primary`   | `primary`   | branco `oklch(0.99 0 0)` | 8    | 10x20                  |
| `secondary` | `secondary` | `foreground`             | 8    | 10x20                  |
| `ghost`     | transparent | `primary`                | 8    | 10x20                  |
| `card`      | branco      | —                        | 12   | 24 (border 1px border) |

## Regras de uso

1. **Sempre tokens do DESIGN.md** — nunca hex hardcoded fora do design system.
   Marketing usa `--mkt-*` (`src/styles/marketing-tokens.css`); app usa tokens shadcn/design.
2. **Merriweather** é só para `display` (títulos hero/landing). Corpo/UI = Inter.
3. **Contraste**: botão primary = texto branco sobre azul marca (contraste validado);
   nunca texto `muted-foreground` sobre `muted` para conteúdo principal.
4. **Estados**: toda ação tem hover/disabled/loading; erro usa `destructive`; sucesso `success`.
5. **A UI não pode mentir**: estado vazio/impossível mostra mensagem honesta + caminho de
   ação (ex.: "sem integração configurada" + botão), nunca finge sucesso.

## QA Visual (prova pela tela, nunca "a olho")

- **Medir por ferramenta**: `getBoundingClientRect`/`getComputedStyle` via Playwright para
  validar ordem visual, alinhamento, persistência posicional.
- **Curl não prova UX** — só diagnóstico. Prova = tela (screenshot numerado + trace).
- Screenshot **antes** da asserção (artefato de erro do Playwright pode não trazer snapshot).
- Acessibilidade: AxeBuilder filtrando `serious`/`critical` (o projeto usa `@axe-core/playwright`).
- **Zero erros de console** em telas novas: `page.on("pageerror")` + console.error zerados.
- Evidência em diretório padrão (ex.: `.superpowers/evidence/`).

## Anti-padrões

- ❌ Hex color hardcoded fora do token (ex.: `#1e3a8a` em vez de `var(--primary)`/oklch do DESIGN)
- ❌ Usar Merriweather em corpo de texto
- ❌ UI que esconde erro (spinner infinito sem fallback)
- ❌ Medir layout "a olho" em vez de `getBoundingClientRect`
- ❌ Botão sem estado disabled/loading
