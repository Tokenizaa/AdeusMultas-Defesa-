# Guardrails de Autonomia — Adeus Multa

> **Autoria:** gerado de `src/features/marketing/lib/constitution.ts` (fonte única).
> Operação **totalmente autônoma**: planeja, gera, valida e publica sem intervenção humana.
> Este documento define as proteções automáticas obrigatórias.

## Princípio

> A IA define os parâmetros. O sistema planeja, gera, valida e publica sozinho.

- Planejamento: IA gera os 90 dias a partir da constituição + KB + analytics.
- Produção: IA gera o conteúdo de cada tema.
- Validação: `legal-sync` + `validateContent` são **gates duros**.
- Publicação: `publication-worker` publica automaticamente. Rastreio completo em
  `marketing_events` + `content-meta` (origem/agente/tentativas).

## Gate de Validação Legal (imutável)

Conteúdo **nunca** é publicado se:

- `legal_status` != `approved` (legal-sync).
- `validateContent` não passar.
- Contiver termo bloqueado abaixo sem substituição.

Regeneração: máx **2 tentativas** por tema; depois o tema
volta a `idea` e é substituído na próxima rodada.

### Termos bloqueados

| Termo | Motivo | Substituir por |
|---|---|---|
| "garantido" | Promessa de resultado | "consistente" |
| "infalível" | Impossível tecnicamente | "preciso" |
| "revolucionário" | Clichê de marketing | "prático" |
| "milagroso" | Sensacionalista | "eficaz" |
| "advogado de IA" | Falsa equivalência | "assistente de defesa" |
| "processo judicial" | Confunde esfera administrativa | "procedimento administrativo" |
| "sentença" | Termo judicial, não administrativo | "decisão" |

### Enquadramentos permitidos (safe frames)

- "que poderia ser cancelada"
- "possíveis inconsistências"
- "fundamentos para defesa"
- "cada caso é analisado individualmente"
- "a decisão final cabe à autoridade de trânsito"
- "sem promessas de vitória: clareza, agilidade e documentos bem fundamentados"

### Sempre informar

- existe prazo para defesa
- a IA é assistiva e orienta o usuário
- o usuário pode revisar o documento antes de protocolar (opcional)

### Disclaimer obrigatório

> Os resultados podem variar de acordo com cada caso. A plataforma é uma ferramenta de auxílio e não substitui a orientação de um advogado em casos complexos. A decisão final cabe à autoridade de trânsito.

## Kill-Switches (auto-pausa)

Se qualquer condição disparar, o sistema registra evento em `marketing_events` e
pausa até a próxima rodada de planejamento:

| Switch | Detecção | Limiar | Ação |
|---|---|---|---|
| legal-reprovacao | Taxa de reprovação do legal-sync na rodada | 30% | Pausa a rodada; planner revisa constituição/prompts |
| geracao-falha | Falhas consecutivas de geração de conteúdo | 3 temas seguidos | Pausa geração; verifica provedor LLM (9Router combo) |
| engajamento-colapso | Engajamento abaixo da média das 2 semanas anteriores | 20% por 2 semanas seguidas | analysis-engine marca campanha paused; planner reduz cadência |
| fila-vazia | Sem tema publicável no horizonte de publicação | 7 dias | Bloqueia publicação até próxima rodada de planejamento |

## Canais

- **Instagram:** CTA de diagnóstico via link na bio; nunca link no corpo.
- **Facebook (grupos):** conteúdo educativo sem link; link aparece só quando perguntam.