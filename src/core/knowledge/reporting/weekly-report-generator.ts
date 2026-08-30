/**
 * @file weekly-report-generator.ts
 * Gerador de Relatórios Semanais Automatizados de Monitoramento Nacional (27 UFs + Federal).
 */

import { MonitoringCycleSummary, KnowledgeChange, ReviewQueueItem, KnowledgeSource } from '../types';
import { NATIONAL_STATES_DB } from '../national-registry';

export class WeeklyReportGenerator {
  /**
   * Gera o conteúdo em Markdown do relatório semanal de monitoramento nacional.
   */
  public static generateMarkdownReport(
    summary: MonitoringCycleSummary,
    sources: KnowledgeSource[],
    changes: KnowledgeChange[],
    reviewItems: ReviewQueueItem[]
  ): string {
    const states = Object.values(NATIONAL_STATES_DB);
    const dateFormatted = summary.completedAt.split('T')[0];
    const availabilityPct =
      summary.totalSources > 0
        ? Math.round((summary.successfulFetches / summary.totalSources) * 100)
        : 100;

    return `# RELATÓRIO NACIONAL DE MONITORAMENTO JURÍDICO-OPERACIONAL (SNM-JO)
**Ciclo Semanal:** \`${summary.cycleId}\`  
**Data de Execução:** ${dateFormatted} (${summary.startedAt} às ${summary.completedAt})  
**Status Global:** ${summary.changesByRisk.P0_LEGAL_CRITICAL > 0 ? '⚠️ ATENÇÃO - P0 PENDENTE' : '✅ OPERACIONAL NORMAL'}  
**Disponibilidade de Fontes:** ${availabilityPct}% (${summary.successfulFetches}/${summary.totalSources} fontes online)

---

## 1. RESUMO EXECUTIVO NACIONAL

O Sistema Nacional de Monitoramento Jurídico-Operacional (SNM-JO) executou a varredura programada em todas as fontes oficiais dos **26 Estados + Distrito Federal + Âmbito Federal (Tier 1 a Tier 3)**.

| Métrica | Valor Registrado | Observação |
|---|---|---|
| **Total de Fontes Monitoradas** | ${summary.totalSources} | Planalto, SENATRAN, CONTRAN, PRF, DNIT, 27 DETRANs, CETRANs |
| **Consultas com Sucesso** | ${summary.successfulFetches} | Respostas HTTP válidas |
| **Falhas de Conexão / Timeouts** | ${summary.failedFetches} | Monitoradas para rechecagem |
| **Snapshots Gravados** | ${summary.snapshotsCreated} | Histórico com hashes SHA-256 |
| **Alterações Detectadas** | ${summary.changesDetected} | Análise semântica e estrutural de diffs |
| **Críticas P0 (Revisão Humana)** | ${summary.changesByRisk.P0_LEGAL_CRITICAL} | Impacto legal direto |
| **Operacionais P1 (Revisão Humana)** | ${summary.changesByRisk.P1_OPERATIONAL_HIGH} | Mudança de portal/canais |
| **Manutenções P2 (Cadastro)** | ${summary.changesByRisk.P2_MAINTENANCE} | Endereços e contatos |
| **Informativas P3 (Automáticas)** | ${summary.changesByRisk.P3_INFO} | Registros sem impacto direto |
| **Fila de Revisão Humana Ativa** | ${reviewItems.filter((r) => r.status === 'PENDING_REVIEW').length} | Itens aguardando validação |

---

## 2. COBERTURA DAS 27 UNIDADES FEDERATIVAS

| UF | Estado | Região | DETRAN Oficial | Instância Recursal (CETRAN/CONTRANDIFE) | Rede de Atendimento |
|---|---|---|---|---|---|
${states
  .map(
    (st) =>
      `| **${st.uf}** | ${st.name} | ${st.region} | ${st.detranId} | ${st.cetranId} | ${st.serviceNetworkName} |`
  )
  .join('\n')}

---

## 3. ALTERAÇÕES DETECTADAS NO CICLO

${
  changes.length === 0
    ? '_Nenhuma alteração de conteúdo foi detectada nas fontes oficiais durante este ciclo de monitoramento._'
    : changes
        .map(
          (c, idx) => `### 3.${idx + 1}. [${c.riskLevel}] ${c.title}
- **UF:** ${c.uf}
- **Tipo de Mudança:** \`${c.changeType}\`
- **Fonte Oficial:** [${c.sourceUrl}](${c.sourceUrl})
- **Resumo:** ${c.description}
- **Status:** \`${c.status}\`
\`\`\`diff
${c.diffSummary}
\`\`\`
`
        )
        .join('\n')
}

---

## 4. FILA DE REVISÃO HUMANA (HUMAN-IN-THE-LOOP)

${
  reviewItems.length === 0
    ? '_A fila de revisão jurídica está zerada. Todas as bases operam em conformidade canônica._'
    : reviewItems
        .map(
          (r, idx) => `### Item #${idx + 1} — [${r.riskLevel}] ${r.sourceTitle}
- **ID da Revisão:** \`${r.id}\`
- **UF:** ${r.uf} | **Órgão:** ${r.organName || 'Nacional'}
- **Tipo:** \`${r.changeType}\`
- **Impacto Jurídico/Operacional:** ${r.impact}
- **Status Atual:** \`${r.status}\`
- **URL da Fonte Primária:** ${r.sourceUrl}
`
        )
        .join('\n')
}

---

## 5. DIRETRIZES & RECOMENDAÇÕES OPERACIONAIS

1. **Prioridade Máxima:** Revisar imediatamente quaisquer itens classificados como \`P0_LEGAL_CRITICAL\` antes da emissão de peças recursais para a UF afetada.
2. **Versionamento Temporal:** Ao aprovar uma alteração de prazo ou competência, verificar a data do fato gerador (data da infração) para manter a aplicação da regra anterior a casos pretéritos.
3. **Próxima Execução:** Agendada automaticamente para o próximo ciclo de 7 dias via \`WeeklyMonitorScheduler\`.
`;
  }
}
