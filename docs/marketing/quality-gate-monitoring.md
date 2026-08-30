# Monitoramento do Quality Gate — DefesAi

> Documento vivo. Atualizar a cada deploy de ajuste de limiares.

---

## 1. Definição dos KPIs

| KPI | Fórmula | Target | Criticidade |
|-----|---------|--------|-------------|
| **Taxa de Rejeição do Gate** | `(Peças Rejeitadas / Total Processadas) × 100` | **< 5%** | Alta |
| **Latência Média do Gate** | `Σ(Tempo Execução) / Total Execuções` | **< 2s** | Alta |
| **Falsos Positivos (FP)** | `(Peças Boas Rejeitadas / Total Processadas) × 100` | **< 2%** | Crítica |
| **Falsos Negativos (FN)** | `(Peças Ruins Aprovadas / Total Processadas) × 100` | **< 1%** | Crítica |

### Definições Operacionais
- **Peça Boa**: Aprovada por revisão humana pós-gate (sample 10%/dia)
- **Peça Ruim**: Rejeitada por revisão humana pós-gate (sample 10%/dia)
- **Consistentemente**: 3+ dias consecutivos fora do target

---

## 2. Template de Acompanhamento (14 Dias)

| Data | Total Processado | Rejeitados | Taxa Rejeição (%) | Latência Média (s) | Falsos Positivos | Falsos Negativos | Observações |
|------|------------------|------------|-------------------|--------------------|------------------|------------------|-------------|
| Dia 1 | | | | | | | |
| Dia 2 | | | | | | | |
| Dia 3 | | | | | | | |
| Dia 4 | | | | | | | |
| Dia 5 | | | | | | | |
| Dia 6 | | | | | | | |
| Dia 7 | | | | | | | |
| **Semana 1 - Resumo** | | | **Média:** | **Média:** | **Total:** | **Total:** | |
| Dia 8 | | | | | | | |
| Dia 9 | | | | | | | |
| Dia 10 | | | | | | | |
| Dia 11 | | | | | | | |
| Dia 12 | | | | | | | |
| Dia 13 | | | | | | | |
| Dia 14 | | | | | | | |
| **Semana 2 - Resumo** | | | **Média:** | **Média:** | **Total:** | **Total:** | |
| **TOTAL 14 DIAS** | | | **Média:** | **Média:** | **Total:** | **Total:** | |

### Como Preencher (Diário - 5 min)
1. Exportar logs do gate (script `npm run gate:stats -- --date=YYYY-MM-DD`)
2. Preencher linha do dia
3. Amostragem humana: revisar 10% das peças (aleatório) → classificar FP/FN
4. Commit no repo: `git add docs/marketing/quality-gate-monitoring.md && git commit -m "chore: daily gate metrics YYYY-MM-DD"`

---

## 3. Regra de Ajuste (Recalibração de Limiares)

### Gatilhos Obrigatórios (QUALQUER um ativa)

| Condição | Ação Imediata |
|----------|---------------|
| Taxa rejeição > 10% por **3+ dias seguidos** | Abrir issue `gate:recalibrate-thresholds` + notificar @qualidade |
| Latência média > 3s por **3+ dias seguidos** | Abrir issue `gate:optimize-latency` + notificar @backend |
| FP > 2% no acumulado semanal | Revisar limiar de **nitidez/resolução** (reduzir exigência) |
| FN > 1% no acumulado semanal | Revisar limiar de **nitidez/resolução** (aumentar exigência) |

### Processo de Recalibração
```
1. Criar branch: gate/recalibrate-YYYYMMDD
2. Ajustar parâmetros em `src/lib/quality-gate/config.ts`:
   - sharpnessThreshold (padrão: 0.75)
   - resolutionMinWidth (padrão: 1200)
   - resolutionMinHeight (padrão: 800)
3. Testar local: `npm run gate:test -- --samples=100`
4. Deploy canary (10% tráfego) por 24h
5. Validar métricas no canary
6. Se OK → merge + deploy full
7. Atualizar este doc: registrar ajuste + nova baseline
```

### Parâmetros Atuais (Baseline v1.0)
```typescript
// src/lib/quality-gate/config.ts
export const QUALITY_GATE_CONFIG = {
  sharpnessThreshold: 0.75,      // 0-1, maior = mais rigoroso
  resolutionMinWidth: 1200,      // px
  resolutionMinHeight: 800,      // px
  maxFileSizeMB: 10,
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  latencyBudgetMs: 2000,         // target <2s
};
```

---

## 4. Protocolo de Coordenação Quinzenal com @qualidade

### Cadência
- **Quando**: Toda 2ª feira, 10:00 BRT (30 min)
- **Quem**: @marketing (dono métricas) + @qualidade (dono gate) + @backend (se latência)
- **Onde**: Call async + issue GitHub `gate:biweekly-review-YYYY-WW`

### Pauta Padrão (15 min cada)
1. **Review Dashboard** (5 min): Olhar 14 dias, tendências, outliers
2. **Decisão Ajuste** (10 min): 
   - Gatilhos atingidos? → Aprovar/Rejeitar recalibração
   - Sem gatilhos → "Manter baseline" + next
3. **Action Items** (5 min): Issues criadas, owners, prazos

### Template de Issue Quinzenal
```markdown
# Gate Review - Semana YYYY-WW

## Métricas da Semana
- Taxa rejeição média: X% (target <5%)
- Latência média: Xs (target <2s)
- FP total: X (target <2%)
- FN total: X (target <1%)

## Decisão
- [ ] Manter baseline atual
- [ ] Recalibrar limiares (detalhar no comentário)
- [ ] Investigar latência (envolver @backend)

## Próximos Passos
- [ ] Issue criada: #
- [ ] Owner: @
- [ ] Prazo:
```

### Escalação
- Se **FN > 1% em 2 semanas seguidas** → Escalar para @supervisor (risco produto)
- Se **Latência > 5s em qualquer dia** → Incidente P1, @backend on-call imediato

---

## 5. Automação Sugerida (Fase 2 - Pós-2-Semanas)

```yaml
# .github/workflows/gate-monitoring.yml
name: Quality Gate Monitoring
on:
  schedule:
    - cron: '0 10 * * 1'  # Toda 2ª feira 10:00
jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run gate:stats -- --last=14d --format=json > gate-metrics.json
      - run: npx tsx scripts/check-gate-thresholds.ts gate-metrics.json
      - if: failure()
        run: gh issue create --title "gate:threshold-breach-$(date +%Y-%m-%d)" --body-file gate-report.md
```

---

## Histórico de Ajustes

| Data | Versão | Parâmetro Alterado | Valor Antigo → Novo | Motivo | Aprovado Por |
|------|--------|-------------------|---------------------|--------|--------------|
| 2026-08-29 | 1.0 | Baseline inicial | — | Deploy inicial | @marketing + @qualidade |

---

**Owner**: @marketing | **Reviewer**: @qualidade | **Próxima Revisão**: 2026-09-08 (Semana 36)