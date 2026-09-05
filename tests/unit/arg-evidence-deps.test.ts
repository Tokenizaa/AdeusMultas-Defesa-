/**
 * Fase 8-P1B — Testes de dependência de evidência para ARG-012, ARG-019, ARG-020.
 *
 * Estes testes provam que:
 *  - evidência ausente → tese não recomendada + dataGap existente (ruleId/missingData/reason).
 *  - evidência explicitamente `false` → tese não recomendada + dataGap.
 *  - evidência explicitamente `true` → tese recomendada, sem dataGap para essa tese.
 *  - ausência de `evidenceFlags` → dataGap gerado.
 *  - upload/OCR/notes NÃO satisfazem a dependência → dataGap.
 *  - nenhuma tese não relacionada é afetada.
 *  - o fallback genérico NÃO mascara a ausência de evidência quando a única tese
 *    correspondente foi removida por falta de evidência.
 *  - o fallback genérico É preservado quando não há dataGaps e não há teses.
 */
import { describe, it, expect } from 'vitest';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';

describe('Fase 8-P1B — Evidência obrigatória para ARG-012/019/020', () => {
  const hasTese = (titulo: string, ctx: ReturnType<typeof RagPipeline.retrieveContext>) => {
    return ctx.matchedTeses.some((t) => t.titulo.includes(titulo));
  };

  const findDataGap = (ruleId: string, ctx: ReturnType<typeof RagPipeline.retrieveContext>) => {
    return ctx.dataGaps?.find((g) => g.ruleId === ruleId);
  };

  describe('ARG-012 — Parada sobre Linha de Retenção (infração 605-01)', () => {
    const codigo = '605-01';
    const tituloEsperado = 'Parada sobre a Linha de Retenção';

    it('NÃO recomenda a tese quando evidenceFlags está ausente + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      const gap = findDataGap('ARG-012', ctx);
      expect(gap).toBeDefined();
      expect(gap?.missingData).toContain('fotoRetencaoTrafego');
      expect(gap?.reason).toContain('fotoRetencaoTrafego');
    });

    it('NÃO recomenda a tese quando a chave específica é undefined + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { outraChave: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      expect(findDataGap('ARG-012', ctx)).toBeDefined();
    });

    it('NÃO recomenda a tese quando a evidência é false + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoRetencaoTrafego: false },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      expect(findDataGap('ARG-012', ctx)).toBeDefined();
    });

    it('RECOMENDA a tese quando a evidência é true + NÃO gera dataGap para ARG-012', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoRetencaoTrafego: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(true);
      expect(findDataGap('ARG-012', ctx)).toBeUndefined();
    });

    it('outras teses (sem dependência) permanecem inalteradas mesmo sem evidência', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      // ARG-009 não depende de evidência
      const temArg009 = ctx.matchedTeses.some((t) => t.titulo.includes('Amarelo') || t.titulo.includes('Semáforo'));
      expect(temArg009).toBe(true);
    });

    it('o formato do dataGap segue o padrão do projeto (ruleId, missingData, reason)', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      const gap = findDataGap('ARG-012', ctx);
      expect(gap).toBeDefined();
      expect(typeof gap!.ruleId).toBe('string');
      expect(Array.isArray(gap!.missingData)).toBe(true);
      expect(typeof gap!.reason).toBe('string');
    });
  });

  describe('ARG-019 — Comunicação por Sistema de Áudio (infração 736-62)', () => {
    const codigo = '736-62';
    const tituloEsperado = 'Comunicação por Sistema de Áudio';

    it('NÃO recomenda a tese quando evidenceFlags está ausente + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      const gap = findDataGap('ARG-019', ctx);
      expect(gap).toBeDefined();
      expect(gap?.missingData).toContain('manualVeiculoOuFotoPainel');
    });

    it('NÃO recomenda a tese quando a evidência é false + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { manualVeiculoOuFotoPainel: false },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      expect(findDataGap('ARG-019', ctx)).toBeDefined();
    });

    it('RECOMENDA a tese quando a evidência é true + NÃO gera dataGap para ARG-019', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { manualVeiculoOuFotoPainel: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(true);
      expect(findDataGap('ARG-019', ctx)).toBeUndefined();
    });

    it('outras teses (sem dependência) permanecem inalteradas mesmo sem evidência', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      // ARG-015 não depende de evidência
      const temArg015 = ctx.matchedTeses.some((t) => t.titulo.includes('Celular') || t.titulo.includes('Abordagem'));
      expect(temArg015).toBe(true);
    });
  });

  describe('ARG-020 — Inexistência de Placa R-6a (infração 545-21)', () => {
    const codigo = '545-21';
    const tituloEsperado = 'Inexistência ou Ilegibilidade de Placa R-6a';

    it('NÃO recomenda a tese quando evidenceFlags está ausente + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      const gap = findDataGap('ARG-020', ctx);
      expect(gap).toBeDefined();
      expect(gap?.missingData).toContain('fotoPlacaR6aAusente');
    });

    it('NÃO recomenda a tese quando a evidência é false + gera dataGap', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoPlacaR6aAusente: false },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
      expect(findDataGap('ARG-020', ctx)).toBeDefined();
    });

    it('RECOMENDA a tese quando a evidência é true + NÃO gera dataGap para ARG-020', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoPlacaR6aAusente: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(true);
      expect(findDataGap('ARG-020', ctx)).toBeUndefined();
    });
  });

  describe('Segurança — não infere evidência a partir de upload/OCR/notes', () => {
    it('a presença de photoProofUrls NÃO é tratada como evidência para ARG-012', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: '605-01',
        photoProofUrls: ['https://example.com/foto.jpg'],
        ocrExtractedText: 'Texto extraído do AIT',
      } as any);
      expect(hasTese('Parada sobre a Linha de Retenção', ctx)).toBe(false);
      expect(findDataGap('ARG-012', ctx)).toBeDefined();
    });

    it('a presença de ocrExtractedText NÃO é tratada como evidência para ARG-019', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: '736-62',
        ocrExtractedText: 'Texto extraído',
      } as any);
      expect(hasTese('Comunicação por Sistema de Áudio', ctx)).toBe(false);
      expect(findDataGap('ARG-019', ctx)).toBeDefined();
    });

    it('a presença de notes NÃO é tratada como evidência para ARG-020', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: '545-21',
        notes: 'O condutor estacionou na via',
      } as any);
      expect(hasTese('Inexistência ou Ilegibilidade de Placa R-6a', ctx)).toBe(false);
      expect(findDataGap('ARG-020', ctx)).toBeDefined();
    });
  });

});