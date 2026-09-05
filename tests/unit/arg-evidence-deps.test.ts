/**
 * Fase 8-P1B — Testes de dependência de evidência para ARG-012, ARG-019, ARG-020.
 *
 * Estes testes provam que:
 *  - evidência ausente → tese não recomendada.
 *  - evidência explicitamente `false` → tese não recomendada.
 *  - evidência explicitamente `true` → tese recomendada.
 *  - ausência de `evidenceFlags` não gera falso positivo.
 *  - nenhuma outra tese é alterada indevidamente.
 *  - o comportamento jurídico existente da tese permanece preservado quando a evidência está presente.
 */
import { describe, it, expect } from 'vitest';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';

describe('Fase 8-P1B — Evidência obrigatória para ARG-012/019/020', () => {
  // Helper: verifica se um argumento está presente nas teses correspondentes
  const hasTese = (teseTitulo: string, context: ReturnType<typeof RagPipeline.retrieveContext>) => {
    return context.matchedTeses.some((t) => t.titulo.includes(teseTitulo));
  };

  describe('ARG-012 — Parada sobre Linha de Retenção (infração 605-01)', () => {
    const codigo = '605-01';
    const tituloEsperado = 'Parada sobre a Linha de Retenção';

    it('NÃO recomenda a tese quando evidenceFlags está ausente', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('NÃO recomenda a tese quando evidenceFlags existe mas a chave específica é undefined', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { outraChave: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('NÃO recomenda a tese quando a evidência está explicitamente como false', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoRetencaoTrafego: false },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('RECOMENDA a tese quando a evidência está explicitamente como true', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoRetencaoTrafego: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(true);
    });

    it('outras teses (sem dependência de evidência) continuam sendo recomendadas mesmo sem evidência', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      // ARG-009 (Semáforo - Amarelo) também é recomendado para 605-01, sem exigir evidência
      const temArg009 = ctx.matchedTeses.some((t) => t.baseLegal.includes('Art. 208') || t.titulo.includes('Amarelo'));
      expect(temArg009).toBe(true);
    });
  });

  describe('ARG-019 — Comunicação por Sistema de Áudio (infração 736-62)', () => {
    const codigo = '736-62';
    const tituloEsperado = 'Comunicação por Sistema de Áudio';

    it('NÃO recomenda a tese quando evidenceFlags está ausente', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('NÃO recomenda a tese quando a evidência está explicitamente como false', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { manualVeiculoOuFotoPainel: false },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('RECOMENDA a tese quando a evidência está explicitamente como true', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { manualVeiculoOuFotoPainel: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(true);
    });

    it('outras teses (sem dependência de evidência) continuam sendo recomendadas mesmo sem evidência', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      // ARG-015 (outra tese de celular) deve aparecer normalmente
      const temArg015 = ctx.matchedTeses.some((t) => t.titulo.includes('Abordagem') || t.titulo.includes('Celular'));
      expect(temArg015).toBe(true);
    });
  });

  describe('ARG-020 — Inexistência de Placa R-6a (infração 545-21)', () => {
    const codigo = '545-21';
    const tituloEsperado = 'Inexistência ou Ilegibilidade de Placa R-6a';

    it('NÃO recomenda a tese quando evidenceFlags está ausente', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('NÃO recomenda a tese quando a evidência está explicitamente como false', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoPlacaR6aAusente: false },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(false);
    });

    it('RECOMENDA a tese quando a evidência está explicitamente como true', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: codigo,
        evidenceFlags: { fotoPlacaR6aAusente: true },
      });
      expect(hasTese(tituloEsperado, ctx)).toBe(true);
    });

    it('outras teses (sem dependência de evidência) continuam sendo recomendadas mesmo sem evidência', () => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: codigo });
      // ARG-021 (outra tese de estacionamento) deve aparecer normalmente
      const temOutra = ctx.matchedTeses.length > 0;
      expect(temOutra).toBe(true);
    });
  });

  describe('Segurança — não infere evidência a partir de upload/OCR', () => {
    it('a presença de photoProofUrls NÃO é tratada como evidência para ARG-012', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: '605-01',
        // upload presente, mas evidência específica ausente
        photoProofUrls: ['https://example.com/foto.jpg'],
        ocrExtractedText: 'Texto extraído do AIT',
      } as any);
      // ARG-012 NÃO deve aparecer
      expect(hasTese('Parada sobre a Linha de Retenção', ctx)).toBe(false);
    });

    it('a presença de ocrExtractedText NÃO é tratada como evidência para ARG-019', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: '736-62',
        ocrExtractedText: 'Texto extraído',
      } as any);
      // ARG-019 NÃO deve aparecer
      expect(hasTese('Comunicação por Sistema de Áudio', ctx)).toBe(false);
    });

    it('a presença de notes NÃO é tratada como evidência para ARG-020', () => {
      const ctx = RagPipeline.retrieveContext({
        codigoInfracao: '545-21',
        notes: 'O condutor estacionou na via',
      } as any);
      // ARG-020 NÃO deve aparecer
      expect(hasTese('Inexistência ou Ilegibilidade de Placa R-6a', ctx)).toBe(false);
    });
  });
});