# Política de Planejamento — Adeus Multa

> **Autoria:** gerado de `src/features/marketing/lib/constitution.ts` (fonte única).
> Regras que o planejador IA (`editorial-planner`) DEVE seguir para montar o
> calendário de 90 dias.

## Objetivo

Gerar um calendário editorial **rolante de 90 dias** em que a IA define
títulos, pilares, formatos, objetivos, CTAs e datas — sempre dentro da constituição,
da base de conhecimento jurídico e dos analytics. A Semana 1 não vende: constrói
autoridade e desperta curiosidade.

## Pilares (5 oficiais)

| Pilar | Label | Funil | Share Semana 1 | Foco |
|---|---|---|---|---|
| educacao | Educação em Trânsito | topo | 40% | Explicar conceitos, procedimentos e direitos de forma simples. Construir autoridade. |
| autoridade | Autoridade Técnica | meio | 30% | Erros comuns em multas e vícios de autuação. Maior gerador de compartilhamentos e curiosidade. |
| servicos | Produto, Prova Social e IA | meio | 20% | Mostrar o diferencial da IA trabalhando (nunca dizer, mostrar) e provar com casos anônimos. |
| lancamento | Lançamentos e Ofertas | fundo | 0% | Novas funcionalidades, planos e ofertas. Não usar na Semana 1 (fase de autoridade). |
| engajamento | Engajamento e Comunidade | topo | 10% | Humanizar, gerar conversa e criar proximidade (bastidores, perguntas). |

## Distribuição por Funil

| Funil | Pilares | Proporção |
|---|---|---|
| Topo (Atração) | educacao, engajamento | 50% |
| Meio (Consideração) | autoridade, servicos | 30% |
| Fundo (Conversão) | servicos, lancamento | 20% |

## Mix da Semana 1

| Pilar | Share |
|---|---|
| educacao | 40% |
| autoridade | 30% |
| servicos | 20% |
| lancamento | 0% |
| engajamento | 10% |

> Na Semana 1, 0% de lançamentos: conteúdo de autoridade primeiro.

## Cadência Semanal

| Formato | Quantidade | Objetivo primário |
|---|---|---|
| reel | 3-4/sem | Alcance e educação rápida |
| carousel | 1-2/sem | Educação detalhada e salvamentos |
| post | 1-1/sem | Autoridade e engajamento |
| story | 21-49/sem | Engajamento e bastidores |

- Stories: 3-7 por dia
- Artigos (blog): 1-2 por semana

## Mapa de Dias (padrão de feed)

| Dia | Formatos | Nota |
|---|---|---|
| segunda | reel | Reel educativo 12h; Story 18h |
| terca | carousel | Carrossel 10h; Story 18h |
| quarta | post, reel | Post 10h; Reel 17h; Story 18h |
| quinta | reel, carousel | Reel 10h; Carrossel 12h; Story 18h |
| sexta | carousel | Carrossel 17h; Story 18h |
| sabado | story | Story de engajamento 08h; Story descontraído 20h |
| domingo | story | Story lazer 12h; Story de encerramento |

## Datas Relevantes

| Mês | Evento | Conteúdo sugerido | Campanha especial |
|---|---|---|---|
| 01 | Volta às aulas, trânsito intenso | Educação e prevenção | — |
| 03 | Prazo de renovação da CNH | Alerta e lembrete | — |
| 05 | Maio Amarelo (segurança viária) | Campanha especial | Sim |
| 06 | Festas juninas, trânsito em feriados | Educação sazonal | — |
| 07 | Férias e viagens | Preparação para viagem, multas em rodovias | — |
| 09 | Semana Nacional do Trânsito (18-25 set) | Campanha especial intensificada | Sim |
| 11 | Feriado Proclamação da República | Trânsito em feriado | — |
| 12 | Férias, Natal, Ano Novo | Balanço do ano e planejamento | — |

**Campanhas especiais:** Maio Amarelo (maio) e Semana Nacional do Trânsito
(setembro) intensificam cadência e têm prioridade de pilar.

## Regras de Re-planejamento (rolling)

1. Bootstrap gera 90 dias; depois re-planeja **semanalmente**.
2. A IA reaproveita temas `idea` não usados; prioriza temas com maior similaridade RAG.
3. Analytics da semana anterior (`analysis-engine`) ajustam pilares/formatos/CTAs da próxima.
4. Título e descrição sempre em linguagem simples; nunca juridiquês.
5. CTA é escolhido pela matriz `cta-matrix-by-action.md`.
6. Tema com risco legal recebe `compliance_notes` (disclaimer obrigatório).
