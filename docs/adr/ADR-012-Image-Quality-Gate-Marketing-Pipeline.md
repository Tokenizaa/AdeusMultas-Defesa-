# ADR-012: Gate de Qualidade de Imagem no Pipeline de Marketing

- **Status**: Accepted
- **Data**: 2026-08-29
- **Autor**: @documentacao (Context Manager) — decisão implementada por @backend, especificação visual de @marketing
- **Contexto**: Peças de campanha geradas por IA saíam ruins e iam ao ar sem verificação — texto gibberish/ilegível, peça borrada, baixa resolução (768px), brilho inconsistente

---

## Problema

Imagens de campanhas de marketing geradas por IA apresentavam defeitos visuais recorrentes e eram **publicadas sem nenhuma verificação**:

- **Texto gibberish/ilegível** nos textos embutidos na peça.
- **Peça borrada** (sem nitidez).
- **Baixa resolução** (peças em ~768px, abaixo do padrão de feed 1080px).
- **Brilho inconsistente** entre peças da mesma campanha.

O pipeline (geração → enfileiramento → publicação via Meta) não tinha ponto de bloqueio: peça ruim ia ao ar, gerava dano de marca e desperdício de mídia paga.

**Critério de aceite da decisão**: peça reprovada NÃO pode ser enfileirada para publicação; falha de infraestrutura NÃO pode derrubar um pipeline que já funciona; validação 100% local (zero dependência externa de visão).

---

## Decisão

**Criar gate de qualidade de imagem operando em 2 pontos do pipeline**, com política fail-open/fail-closed explícita:

### Ponto 1 — Pós-geração (sinaliza, NÃO bloqueia)

`src/server/services/ai-media-service.ts` (`generateImage`) retorna campo `quality?: ImageQualityResult` com o resultado do gate sobre a imagem gerada. Quando a peça reprova por qualidade, loga erro (`generateImage_quality`) mas **não segura o retorno** — a cadeia de modelos com fallback e o fluxo que já funciona continuam intactos.

### Ponto 2 — Pré-enqueue (hard-reject por qualidade, fail-open por infra)

`src/server/workers/meta-publisher.worker.ts` (`MetaPublisher.enqueue`) — ponto de não-retorno antes de enfileirar na fila de publicação:

| failureKind | Significado | Ação |
|-------------|-------------|------|
| `quality` | Resolução < 500px e/ou nitidez < limiar (Laplacian) | **REJEITA** — `{ queued: false, rejected: true, reasons, quality }`, a peça NÃO é enfileirada |
| `fetch` / `decode` | Erro de infraestrutura (download falhou, formato não decodificável) | **fail-open** — loga warning (`enqueue_quality_skip`) e publica como antes |
| `null` | Passou | Enfileira normalmente |

O gate aplica-se quando `request.mediaUrl` está presente (rotas sem imagem — ex. `POST /publish` texto puro — passam direto, sem o que validar).

### Mecânica da validação (`src/server/services/image-quality.service.ts`, 100% local via `sharp`)

- **Resolução**: dimensão mínima 500px (largura OU altura abaixo reprova) — **hard**.  
  **Calibração 900→500 (2026-08-29)**: Instagram/Meta aceitam >=320px; peças reais da campanha 768x768 (nítidas) e 580x1015 (retrato, dia6 nítida sharpness 977). Em 900px todas rejeitadas → campanha virava no-op. Em 600px, dia6 nítida ainda reprovava por largura 580 — gate deve separar por QUALIDADE visual, não prender peça legada utilizável. 500px cobre formato real, mantém margem sobre floor Meta (320) e isola borrão como discriminador: só dia3 (sharpness 63) reprova.
- **Nitidez**: variância do Laplacian 3x3 em escala de cinza < 100 reprova — **hard**. Análise em redução de 384px (`analysisSize`; nitidez é característica de frequência, robusta a downscale). Calibração real: peça borrada dia3 da campanha inaugural ~54–63; peças boas 287–697.
- **Coesão visual**: luminance e contrast reportados como **métricas soft** (não reprovam por padrão — dataset de calibração insuficiente).
- **Score**: 100 base, -40 resolução, -30 nitidez (mínimo 0).
- **Download**: timeout 15s, teto 20MB, AbortController.
- **OCR**: `OCR_AVAILABLE = false` hoje (ver Upgrade path).

### Consumidores do gate (todos passam por `MetaPublisher.enqueue`)

- `src/server/routes/marketing.ts` — `POST /publish` (texto, sem mediaUrl) e `POST /publish-7-cache` (passa `imageUrl` → gate ativo).
- `src/server/workers/agents/publicacao-agent.worker.ts` — trata `enqueueResult.rejected`: loga erro e `continue` (conteúdo não publicado, sem `status: publicado`).
- `src/scripts/auto-run-campaign.ts` — loga `[REJEITADO pelo gate de qualidade]` + motivos e pula a peça.
- `tests/image-quality.test.ts` — Seção A (vetores sintéticos: nítida passa, borrada reprova, <500px reprova) + Seção B condicional (7 peças reais da campanha inaugural — esperado: todas reprovam hoje; dia3 por nitidez; pula se offline).

---

## Alternativas consideradas

1. **Gate só na origem (bloquear na geração)** — rejeitada. A geração roda cadeia de modelos com fallback (gemini-3-pro-image-preview → ... → flash-lite) e pode retornar fallback SVG; bloquear ali adicionaria latência ao fluxo quente e seria contornável por qualquer chamada que não passe pelo `aiMediaService`. O enforcement único no `enqueue` cobre TODOS os caminhos de publicação (rotas, worker autônomo, script).
2. **Validação por visão externa (OCR/API de visão)** — rejeitada hoje. Provedor externo com 403/instabilidade; sem API key configurada (`OCR_AVAILABLE = false`); latência externa não pode bloquear enqueue síncrono. A heurística local de borrão cobre o caso crítico (peça borrada) e texto ilegível de modelo fraco também reprova por resolução (<500px). Fica como upgrade path (OCR real via `ocr-service.ts`: OCR.space/Google Vision).
3. **Manter pipeline publicando sem verificação** — rejeitada. Dano de marca (texto gibberish no ar), desperdício de mídia paga, sem métrica de qualidade.
4. **Soft-warning sem bloqueio** — rejeitada como solução única. Sem hard-reject, peça ruim continua indo ao ar em modo autônomo (worker + auto-run) onde ninguém revisa manualmente.

---

## Consequências

### Positivas
- **Bloqueio real antes do ar**: peça reprovada não enfileira em nenhum caminho (rota, worker autônomo, script).
- **Zero dependência externa**: validação 100% local com `sharp` — sem chave, sem latência externa, sem custo por chamada.
- **fail-open protege o pipeline existente**: `fetch`/`decode` (erro transiente de rede, formato exótico) não derrubam publicação que já funciona.
- **Métricas para calibração**: score, luminance, contrast, sharpness expostos em logs e no retorno — base para endurecer thresholds futuramente.
- **Teste com peças reais**: Seção B do teste ancora o gate na campanha inaugural (7 peças, esperado: todas reprovam hoje).

### Negativas / Riscos
- **Heurística de borrão não detecta gibberish em peça nítida de alta resolução** — limite conhecido do Laplacian; OCR é o upgrade (abaixo).
- **Limiar fixo 500px pode rejeitar peça legítima menor** (ex. design 768px intencional) — hoje aceitável; correção via resolução por formato no upgrade path.
- **Latência por enqueue**: download (timeout 15s) + análise de pixels por peça — impacto no fluxo quente.
- **Campanha atual fica bloqueada**: as 7 peças reais da campanha inaugural reprovam no gate (esperado pelo teste) — campanhas precisam regenerar peças antes de publicar.
- **Falso positivo exige intervenção**: peça rejeitada não tem auto-regeneração ainda (ver upgrade path).

---

## Upgrade path (não implementado hoje)

1. **OCR real** — `ocr-service.ts` (OCR.space/Google Vision) p/ detectar texto gibberish em peças nítidas; quando houver API key configurada e tolerância a latência externa.
2. **Resolução por formato** — spec @marketing: 1080px por formato (1:1 / 9:16 / 16:9); `minDimension` parametrizado por `aspectRatio` em vez de 500 fixo.
3. **Retry com regeneração** — peça reprovada → auto-regenerar com prompt amplificado; hoje a rejeição é terminal no enqueue.
4. **Endurecer métricas soft** — luminance/contrast passam de soft para hard quando calibradas com dataset maior.

---

## Referências

- `src/server/services/image-quality.service.ts` — `validateImageQuality` (sharp; minDimension 500, minSharpness 100, analysisSize 384, failureKind quality/fetch/decode)
- `src/server/services/ai-media-service.ts` — `generateImage` retorna `quality` pós-geração; loga `generateImage_quality`; fallback SVG fica fora do gate (mime `image/svg+xml` → quality undefined)
- `src/server/workers/meta-publisher.worker.ts` — `enqueue` gate de qualidade; `enqueue_quality_skip` (fail-open) e `enqueue_rejected` (hard-reject)
- `src/server/workers/agents/publicacao-agent.worker.ts` — trata `enqueueResult.rejected` (skip conteúdo)
- `src/server/routes/marketing.ts` — `POST /publish` e `POST /publish-7-cache` via `metaPublisher.enqueue`
- `src/scripts/auto-run-campaign.ts` — loga rejeição e pula peça (NOTA: o arquivo vive em `src/scripts/`, não em `src/server/scripts/`)
- `tests/image-quality.test.ts` — vetores sintéticos + 7 peças reais da campanha inaugural (bucket Supabase `marketing-assets`)