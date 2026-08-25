# DESIGN.md — Contrato de Marca DefesAi

> Fonte da verdade visual do projeto. Todos os agentes (@frontend, @design, @qualidade) devem consultar este arquivo antes de gerar ou modificar qualquer artefato visual.

---

## 1. Identidade da Marca

| Atributo | Valor |
|----------|-------|
| **Nome** | DefesAi | Adeus Multa |
| **Tagline** | Sistema de Defesa Autônoma para Multas de Trânsito |
| **Posicionamento** | Inteligência jurídica determinística para geração de defesas e recursos de trânsito em conformidade com CTB e CONTRAN |
| **Tom de Voz** | Técnico, acessível, confiável, transparente, humanizado |
| **Público** | Condutores brasileiros, advogados de trânsito, órgãos autuadores |

---

## 2. Paleta de Cores (Padrão GOV.BR)

### Cores Primárias — Azul Institucional
| Token | Hex | Uso | Contraste Mínimo |
|-------|-----|-----|------------------|
| `--blue-warm-vivid-70` | `#071D41` | Headlines, footer bg, header institucional | — |
| `--blue-warm-vivid-60` | `#155BCB` | **Primary actions**, links, focus ring, badges ativos | 4.5:1 sobre branco |
| `--blue-warm-vivid-80` | `#0C326F` | Hover states, borders institucionais | — |
| `--blue-warm-20` | `#C2D9FF` | Backgrounds sutis, chips informativos | — |
| `--blue-warm-10` | `#E7EFFF` | Backgrounds muito sutis, hover cards | — |

### Cores de Apoio
| Token | Hex | Uso |
|-------|-----|-----|
| `--orange-500` | `#FF6B35` | **CTA secundário**, "Análise Gratuita", ícones de destaque |
| `--orange-600` | `#E85D2E` | Hover CTA laranja |
| `--green-cool-vivid-50` | `#168821` | Success, badges "Concluído", checkmarks |
| `--green-cool-10` | `#E3F5E1` | Background success |
| `--red-vivid-50` | `#E52207` | Error, alertas críticos, ações destrutivas |
| `--red-vivid-10` | `#FDE8E5` | Background error |
| `--yellow-vivid-20` | `#FFCD07` | Aviso, destaque em botões primários (sparkle) |
| `--yellow-vivid-10` | `#FFF5C2` | Background aviso |

### Neutros (Escala GOV.BR)
| Token | Hex | Uso |
|-------|-----|-----|
| `--pure-white` | `#FFFFFF` | Cards, modais, inputs |
| `--gray-2` | `#F8F8F8` | **Page background** |
| `--gray-5` | `#F0F0F0` | Dividers sutis, input bg default |
| `--gray-10` | `#E6E6E6` | Borders padrão, hover backgrounds |
| `--gray-20` | `#CCCCCC` | Borders mais fortes, header border |
| `--gray-60` | `#555555` | Text secondary, placeholders |
| `--gray-80` | `#333333` | Text primary (quase preto) |
| `--gray-90` | `#1B1B1B` | **Text principal** (headlines, body) |

### Semânticas de Cor (Tailwind v4)
```css
/* Mapeamento para classes utilitárias */
--color-primary: var(--blue-warm-vivid-60);
--color-primary-hover: var(--blue-warm-vivid-80);
--color-primary-bg: var(--blue-warm-10);
--color-secondary: var(--orange-500);
--color-secondary-hover: var(--orange-600);
--color-success: var(--green-cool-vivid-50);
--color-success-bg: var(--green-cool-10);
--color-error: var(--red-vivid-50);
--color-error-bg: var(--red-vivid-10);
--color-warning: var(--yellow-vivid-20);
--color-warning-bg: var(--yellow-vivid-10);
--color-bg-page: var(--gray-2);
--color-bg-card: var(--pure-white);
--color-border: var(--gray-10);
--color-border-strong: var(--gray-20);
--color-text-primary: var(--gray-90);
--color-text-secondary: var(--gray-60);
--color-text-muted: var(--gray-50); /* não existe, usar gray-60 */
--color-focus: var(--blue-warm-vivid-60);
```

---

## 3. Tipografia (OBRIGATÓRIO — eMAG / WCAG 2.1 AA)

### Fonte Oficial
```css
--font-family-gov: 'Rawline', 'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```
- **Rawline**: Display/headlines (pesos 400-700)
- **Raleway**: UI, body, labels (pesos 400-700)
- **Fallback**: System UI stack

### Escala Tipográfica Mínima (16px base)

| Token | Tamanho | Line-height | Letter-spacing | Uso |
|-------|---------|-------------|----------------|-----|
| `--text-display-xl` | `clamp(2.5rem, 5vw, 4rem)` | 1.15 | `-0.02em` | Hero h1 |
| `--text-display-lg` | `clamp(2rem, 4vw, 3rem)` | 1.2 | `-0.01em` | Section h2 |
| `--text-display-md` | `clamp(1.5rem, 3vw, 2rem)` | 1.25 | `0` | Card h3 |
| `--text-heading-lg` | `1.5rem` (24px) | 1.3 | `0` | Page h1, modal titles |
| `--text-heading-md` | `1.25rem` (20px) | 1.35 | `0` | Section h2, card titles |
| `--text-heading-sm` | `1.125rem` (18px) | 1.4 | `0` | Subsection h3 |
| **`--text-body-lg`** | **`1.125rem` (18px)** | **1.6** | **`0.01em`** | **Body principal, artigos, descrições longas** |
| **`--text-body`** | **`1rem` (16px)** | **1.5** | **`0.01em`** | **Body padrão, parágrafos, labels, inputs** |
| `--text-body-sm` | `0.9375rem` (15px) | 1.5 | `0.01em` | Meta info, timestamps (mínimo absoluto) |
| `--text-caption` | `0.875rem` (14px) | 1.5 | `0.02em` | Badges, chips, footnotes |
| `--text-micro` | `0.8125rem` (13px) | 1.4 | `0.02em` | **MÍNIMO ABSOLUTO** — apenas badges, contadores, metadata técnica |

### Pesos de Fonte
| Peso | Valor | Uso |
|------|-------|-----|
| Regular | 400 | Body text |
| Medium | 500 | Labels, buttons |
| Semi-bold | 600 | Subheadings, emphasis |
| Bold | 700 | Headlines, CTAs, numbers |

### Regras Obrigatórias
1. **NUNCA usar texto < 13px** (`--text-micro` é o piso)
2. **Body text SEMPRE ≥ 16px** (`--text-body`)
3. **Line-height SEMPRE ≥ 1.5** para body text
4. **Letter-spacing SEMPRE ≥ 0.01em** para body text (melhora legibilidade)
5. **Contraste SEMPRE ≥ 4.5:1** (WCAG AA) para texto normal; ≥ 3:1 para large text (≥ 18px ou ≥ 14px bold)

---

## 4. Espaçamento (Escala 4px Base)

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-1` | `0.25rem` (4px) | Micro gaps, icon gaps |
| `--space-2` | `0.5rem` (8px) | Small gaps, padding buttons |
| `--space-3` | `0.75rem` (12px) | Medium gaps, card padding sm |
| `--space-4` | `1rem` (16px) | **Base unit**, card padding, section gaps |
| `--space-5` | `1.25rem` (20px) | Large gaps |
| `--space-6` | `1.5rem` (24px) | Section padding, modal padding |
| `--space-8` | `2rem` (32px) | Page section gaps |
| `--space-10` | `2.5rem` (40px) | Large section gaps |
| `--space-12` | `3rem` (48px) | Hero sections |

---

## 5. Bordas & Raio

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `0.375rem` (6px) | Inputs, badges, chips |
| `--radius-md` | `0.5rem` (8px) | Buttons, cards sm |
| `--radius-lg` | `0.75rem` (12px) | **Cards padrão**, modais |
| `--radius-xl` | `1rem` (16px) | Cards grandes, containers |
| `--radius-2xl` | `1.5rem` (24px) | Hero cards, modais full-screen |
| `--radius-full` | `9999px` | Pills, avatars, badges circulares |

---

## 6. Sombras (Elevation)

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-2xs` | `0 1px 2px rgb(0 0 0 / 0.05)` | Cards sutis, inputs focus |
| `--shadow-xs` | `0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.06)` | Cards padrão, dropdowns |
| `--shadow-sm` | `0 4px 6px rgb(0 0 0 / 0.07), 0 2px 4px rgb(0 0 0 / 0.06)` | Modais, popovers |
| `--shadow-md` | `0 10px 15px rgb(0 0 0 / 0.1), 0 4px 6px rgb(0 0 0 / 0.05)` | Modais grandes, drawers |
| `--shadow-lg` | `0 20px 25px rgb(0 0 0 / 0.15), 0 10px 10px rgb(0 0 0 / 0.04)` | Toasts, notifications |

---

## 7. Componentes — Especificações Visuais

### Botões
| Variante | Padding | Font | Border Radius | Estados |
|----------|---------|------|---------------|---------|
| **Primary** | `12px 24px` | `--text-body` (16px), 700 | `--radius-lg` | hover: darker, focus: ring 3px, active: scale 0.98 |
| **Secondary** | `12px 24px` | `--text-body` (16px), 700 | `--radius-lg` | border 2px, hover: bg tint |
| **Ghost** | `10px 20px` | `--text-body` (16px), 600 | `--radius-lg` | hover: bg gray-5 |
| **Destructive** | `12px 24px` | `--text-body` (16px), 700 | `--radius-lg` | bg error, hover: darker |

**Mínimo touch target**: 44×44px (WCAG)

### Inputs & Formulários
| Propriedade | Valor |
|-------------|-------|
| Height | `44px` mínimo (touch target) |
| Padding | `12px 16px` |
| Font | `--text-body` (16px), 400 |
| Label | `--text-body` (16px), 600, uppercase, letter-spacing 0.02em |
| Border | `1px solid var(--gray-20)` default, `2px solid var(--blue-warm-vivid-60)` focus |
| Border radius | `--radius-md` (8px) |
| Placeholder | `var(--gray-60)` |
| Error state | Border `var(--red-vivid-50)`, bg `var(--red-vivid-10)` |
| Helper text | `--text-caption` (14px), `var(--gray-60)` |

### Cards
| Propriedade | Valor |
|-------------|-------|
| Background | `var(--pure-white)` |
| Border | `1px solid var(--gray-10)` |
| Border radius | `--radius-lg` (12px) |
| Padding | `--space-4` (16px) mobile, `--space-6` (24px) desktop |
| Shadow | `--shadow-2xs` default, `--shadow-xs` hover |

### Badges / Chips
| Propriedade | Valor |
|-------------|-------|
| Font | `--text-caption` (14px), 700 |
| Padding | `4px 10px` |
| Border radius | `--radius-full` |
| Min height | `24px` |

---

## 8. Acessibilidade (eMAG / GOV.BR / WCAG 2.1 AA)

### Checklist Obrigatório por Componente
- [ ] **Focus visible**: `outline: 3px solid var(--blue-warm-vivid-60); outline-offset: 2px;`
- [ ] **Contraste**: ≥ 4.5:1 (texto normal), ≥ 3:1 (large text)
- [ ] **Touch target**: ≥ 44×44px
- [ ] **ARIA labels**: Em botões ícone, inputs sem label visível, menus
- [ ] **Skip links**: "Ir para conteúdo principal" (Alt+1)
- [ ] **Keyboard nav**: Tab order lógico, escape fecha modais
- [ ] **High contrast mode**: Suporte via `html.high-contrast`
- [ ] **Font resize**: Suporte até 1.4x (22.4px) via `fontSizeMultiplier`
- [ ] **Reduced motion**: Respeitar `prefers-reduced-motion`

### Modo Alto Contraste (Obrigatório)
```css
html.high-contrast {
  --color-bg-page: #000000;
  --color-bg-card: #000000;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #FFFFFF;
  --color-border: #FFFF00;
  --color-primary: #FFFF00;
  --color-secondary: #FFFF00;
  --color-focus: #FFFF00;
}
```

---

## 9. Layout & Breakpoints

| Breakpoint | Valor | Uso |
|------------|-------|-----|
| `sm` | `640px` | Tablet portrait, 2-col grids |
| `md` | `768px` | Tablet landscape, sidebar |
| `lg` | `1024px` | Desktop, 3-col grids |
| `xl` | `1280px` | Large desktop, max-width containers |
| `2xl` | `1536px` | Ultra-wide |

**Container max-width**: `80rem` (1280px) para conteúdo, `90rem` (1440px) para layouts admin

---

## 10. Animações & Transições

| Propriedade | Valor |
|-------------|-------|
| `--duration-fast` | `150ms` |
| `--duration-normal` | `250ms` |
| `--duration-slow` | `350ms` |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |

**Respeitar**: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`

---

## 11. Ícones

- **Biblioteca**: `lucide-react` (já instalado)
- **Tamanhos**: `16px` (inline), `20px` (botões), `24px` (cards), `32px` (hero)
- **Stroke width**: `2` (padrão lucide)
- **Cor**: Herda `currentColor` (sem hardcode)

---

## 12. Governança

### Alterações no DESIGN.md
1. Qualquer mudança nos tokens **requer ADR** (use `@documentacao`)
2. Mudanças breaking em componentes **requerem `@qualidade` review**
3. Novos componentes **devem seguir este contrato**
4. Desvios documentados em `decision-log.md`

### Validação Automática
- `@qualidade` verifica: contraste, tamanhos mínimos, focus states
- `@testes` valida: touch targets, keyboard nav, screen reader
- CI deve falhar se tokens não forem usados (lint customizado)

---

## 13. Referências

- [GOV.BR Design System](https://designsystem.gov.br/)
- [eMAG — Modelo de Acessibilidade em Governo Eletrônico](https://www.gov.br/governodigital/pt-br/acessibilidade/emag)
- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Rawline Font](https://fonts.google.com/specimen/Rawline)
- [Raleway Font](https://fonts.google.com/specimen/Raleway)

---

*Última atualização: 2025-08-20 | Versão 1.0.0 | Mantido por @agent-loop + @design*