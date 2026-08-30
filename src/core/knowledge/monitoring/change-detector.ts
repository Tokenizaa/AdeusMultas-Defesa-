/**
 * @file change-detector.ts
 * Detector de Alterações e Análise de Diffs Jurídico-Operacionais.
 * Compara snapshots temporais, analisa alterações textuais e identifica tipos de mudança.
 */

import { KnowledgeSnapshot, KnowledgeChange, ChangeType, RiskLevel, KnowledgeSource } from '../types';
import { calculateSha256Sync } from './hash-generator';

export class ChangeDetector {
  /**
   * Compara o snapshot atual com o snapshot anterior para determinar se houve alteração.
   */
  public static detectChange(
    currentSnapshot: KnowledgeSnapshot,
    previousSnapshot: KnowledgeSnapshot | null,
    source: KnowledgeSource
  ): KnowledgeChange | null {
    // Se for o primeiro snapshot, não há alteração prévia para comparar
    if (!previousSnapshot) {
      return null;
    }

    // Se o hash é idêntico, nada mudou
    if (currentSnapshot.contentHash === previousSnapshot.contentHash) {
      return null;
    }

    const { changeType, riskLevel, title, description, diffSummary } = this.analyzeDiff(
      previousSnapshot.normalizedText,
      currentSnapshot.normalizedText,
      source
    );

    const changeId = `CHG_${source.id}_${Date.now()}`;

    return {
      id: changeId,
      sourceId: source.id,
      sourceUrl: source.url,
      uf: source.uf,
      organId: source.organId,
      discoveredAt: currentSnapshot.fetchedAt,
      changeType,
      riskLevel,
      title,
      description,
      previousValue: previousSnapshot.normalizedText.slice(0, 1000),
      newValue: currentSnapshot.normalizedText.slice(0, 1000),
      previousHash: previousSnapshot.contentHash,
      newHash: currentSnapshot.contentHash,
      diffSummary,
      status: 'PENDING_REVIEW', // Padrão de segurança: passa pela esteira de validação
    };
  }

  /**
   * Analisa a diferença textual entre versões e infere o tipo e gravidade da mudança.
   */
  public static analyzeDiff(
    oldText: string,
    newText: string,
    source: KnowledgeSource
  ): {
    changeType: ChangeType;
    riskLevel: RiskLevel;
    title: string;
    description: string;
    diffSummary: string;
  } {
    const oldLines = oldText.split('\n').filter((l) => l.trim().length > 0);
    const newLines = newText.split('\n').filter((l) => l.trim().length > 0);

    const addedLines = newLines.filter((l) => !oldLines.includes(l));
    const removedLines = oldLines.filter((l) => !newLines.includes(l));

    const addedContent = addedLines.join(' ');
    const removedContent = removedLines.join(' ');
    const combinedChangedText = (addedContent + ' ' + removedContent).toLowerCase();

    let changeType: ChangeType = 'MODIFIED_TEXT';
    let riskLevel: RiskLevel = 'P2_MAINTENANCE';
    let title = `Alteração de conteúdo detectada em ${source.title}`;
    let description = `Foram detectadas ${addedLines.length} linhas adicionadas e ${removedLines.length} linhas removidas.`;

    // 1. Detecção de Revogação ou Anulação de Norma (P0)
    if (
      combinedChangedText.includes('revoga') ||
      combinedChangedText.includes('revogado') ||
      combinedChangedText.includes('tornar sem efeito') ||
      combinedChangedText.includes('inconstitucional')
    ) {
      changeType = 'REVOCATION';
      riskLevel = 'P0_LEGAL_CRITICAL';
      title = `Possível Revogação Normativa Detectada em ${source.title}`;
      description = `O termo 'revoga'/'revogado' foi detectado nas alterações da fonte oficial.`;
    }
    // 2. Detecção de Nova Regulamentação / Lei / Resolução (P0)
    else if (
      combinedChangedText.includes('resolucao') ||
      combinedChangedText.includes('resolução') ||
      combinedChangedText.includes('lei nº') ||
      combinedChangedText.includes('portaria senatran') ||
      combinedChangedText.includes('deliberacao')
    ) {
      changeType = 'NEW_REGULATION';
      riskLevel = 'P0_LEGAL_CRITICAL';
      title = `Nova Regulamentação ou Resolução Detectada em ${source.title}`;
      description = `Alteração com termos normativos de CONTRAN/SENATRAN/Leis identificada.`;
    }
    // 3. Detecção de Mudança de Prazo Processual (P0)
    else if (
      combinedChangedText.includes('prazo') &&
      (combinedChangedText.includes('dias') || combinedChangedText.includes('decadencia'))
    ) {
      changeType = 'DEADLINE_CHANGE';
      riskLevel = 'P0_LEGAL_CRITICAL';
      title = `Alteração em Prazos Processuais em ${source.title}`;
      description = `Mudança relacionada a contagem de dias ou prazos de defesa detectada.`;
    }
    // 4. Detecção de Mudança de Competência de Fiscalização (P0)
    else if (
      combinedChangedText.includes('competencia') ||
      combinedChangedText.includes('competência') ||
      combinedChangedText.includes('art. 24') ||
      combinedChangedText.includes('art. 22')
    ) {
      changeType = 'COMPETENCE_CHANGE';
      riskLevel = 'P0_LEGAL_CRITICAL';
      title = `Alteração de Competência de Trânsito em ${source.title}`;
      description = `Detecção de mudança nas regras de competência de autuação municipal/estadual.`;
    }
    // 5. Detecção de Mudança de URL do Portal de Protocolo (P1)
    else if (
      combinedChangedText.includes('portal') ||
      combinedChangedText.includes('novo endereco') ||
      combinedChangedText.includes('novo site') ||
      combinedChangedText.includes('sistema indisponivel')
    ) {
      changeType = 'PORTAL_URL_CHANGE';
      riskLevel = 'P1_OPERATIONAL_HIGH';
      title = `Alteração no Portal de Protocolo em ${source.title}`;
      description = `Instruções ou links de acesso ao sistema de protocolo foram modificados.`;
    }
    // 6. Detecção de Mudança de Endereço Físico ou Atendimento (P2)
    else if (
      combinedChangedText.includes('endereco') ||
      combinedChangedText.includes('endereço') ||
      combinedChangedText.includes('sede') ||
      combinedChangedText.includes('cep')
    ) {
      changeType = 'ADDRESS_CHANGE';
      riskLevel = 'P2_MAINTENANCE';
      title = `Alteração de Endereço ou Local de Atendimento em ${source.title}`;
      description = `Atualização de dados de contato ou endereço presencial detectada.`;
    }

    const diffSummary = `+ ${addedLines.slice(0, 3).join(' | ')}\n- ${removedLines.slice(0, 3).join(' | ')}`;

    return {
      changeType,
      riskLevel,
      title,
      description,
      diffSummary: diffSummary.slice(0, 500),
    };
  }
}
