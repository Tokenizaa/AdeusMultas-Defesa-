/**
 * Agente: ocr-field-extractor
 * Extrai campos específicos de documentos de trânsito via padrões e regex determinísticos
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, OCRFieldResult } from "@/lib/types/agent-interfaces";

export class OCRExtractorAgent extends BaseAgent {
  protected name = "ocr-field-extractor";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    const rawText = context.ocr?.raw_text || "";
    const extracted = this.extractFields(rawText);

    context.ocr = {
      ...(context.ocr || {}),
      extracted_fields: extracted.fields,
      _meta: extracted.meta,
    };

    // Auto-preencher dados da infração se estiverem vazios no contexto
    if (!context.infraction.placa && extracted.fields.placa?.value) {
      context.infraction.placa = extracted.fields.placa.value;
    }
    if (!context.infraction.numeroAuto && extracted.fields.numero_auto?.value) {
      context.infraction.numeroAuto = extracted.fields.numero_auto.value;
    }
    if (!context.infraction.codigoInfracao && extracted.fields.codigo_infracao?.value) {
      context.infraction.codigoInfracao = extracted.fields.codigo_infracao.value;
    }
    if (!context.infraction.data && extracted.fields.data_infracao?.value) {
      context.infraction.data = extracted.fields.data_infracao.value;
    }
    if (!context.infraction.orgaoAutuador && extracted.fields.orgao_autuador?.value) {
      context.infraction.orgaoAutuador = extracted.fields.orgao_autuador.value;
    }
    if (extracted.fields.velocidade_medida?.value && !context.infraction.velocidadeMedida) {
      context.infraction.velocidadeMedida = Number(extracted.fields.velocidade_medida.value);
    }
    if (extracted.fields.velocidade_limite?.value && !context.infraction.velocidadeLimite) {
      context.infraction.velocidadeLimite = Number(extracted.fields.velocidade_limite.value);
    }

    context.metadata.stepsCompleted.push("ocr-extractor");
    this.recordUsage(["field-extraction", `${extracted.meta.total_fields}-fields-found`]);

    return context;
  }

  public extractFields(rawText: string): {
    fields: Record<string, OCRFieldResult>;
    meta: { total_fields: number; avg_confidence: number; parser: string };
  } {
    const fields: Record<string, OCRFieldResult> = {};

    // 1. Placa (Mercosul: [A-Z]{3}[0-9][A-Z0-9][0-9]{2} ou Antiga: [A-Z]{3}-?[0-9]{4})
    const plateMatch = rawText.match(/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/i) ||
      rawText.match(/\b([A-Z]{3}[-\s]?[0-9]{4})\b/i);
    if (plateMatch) {
      const cleanPlate = plateMatch[1].replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      fields.placa = { value: cleanPlate, confidence: 0.96 };
    }

    // 2. Número do Auto de Infração (ex: 1B892014, AB01234567, 1029384)
    const aitMatch = rawText.match(/auto(?:\s*de\s*infra[çc][ãa]o|\s*n[º°.]?|\s*:)\s*([A-Z0-9]{6,12})/i) ||
      rawText.match(/\b([A-Z0-9]{2}[0-9]{6,8})\b/);
    if (aitMatch) {
      fields.numero_auto = { value: aitMatch[1].trim().toUpperCase(), confidence: 0.92 };
    }

    // 3. Código da Infração (ex: 745-50, 74550, 51691, 605-01, 736-62)
    const codeMatch = rawText.match(/c[óo]d(?:igo)?(?:\s*da\s*infra[çc][ãa]o|\s*enquadramento|\s*:)?\s*([0-9]{3}[-\s]?[0-9]{2})/i) ||
      rawText.match(/\b([5-8][0-9]{2}[-\s]?[0-9][0-9A-Z])\b/);
    if (codeMatch) {
      const formattedCode = codeMatch[1].replace(/\s+/g, "").replace(/^([0-9]{3})([0-9]{2})$/, "$1-$2");
      fields.codigo_infracao = { value: formattedCode, confidence: 0.94 };
    }

    // 4. Data da infração (DD/MM/YYYY)
    const dateMatch = rawText.match(/data(?:\s*da\s*infra[çc][ãa]o|\s*cometimento|\s*:)?\s*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.][12][09][0-9]{2})/i) ||
      rawText.match(/\b([0-3][0-9]\/[0-1][0-9]\/20[2-3][0-9])\b/);
    if (dateMatch) {
      fields.data_infracao = { value: dateMatch[1].replace(/[\-.]/g, "/"), confidence: 0.95 };
    }

    // 5. Órgão Autuador
    const autuadorMatch = rawText.match(/(DETRAN[-\s]?[A-Z]{2}|PRF|POL[ÍI]CIA RODOVI[ÁA]RIA FEDERAL|DNIT|DER[-\s]?[A-Z]{2}|CET[-\s]?[A-Z]{2}|BHTRANS|URBS|EMDEC|SMTT)/i);
    if (autuadorMatch) {
      fields.orgao_autuador = { value: autuadorMatch[1].toUpperCase(), confidence: 0.93 };
    }

    // 6. Velocidades (para multas de radar)
    const speedLimitMatch = rawText.match(/limite(?:\s*regulamentar|\s*permitido|\s*:)?\s*([0-9]{2,3})\s*km/i);
    if (speedLimitMatch) {
      fields.velocidade_limite = { value: parseInt(speedLimitMatch[1], 10), confidence: 0.9 };
    }

    const speedMeasuredMatch = rawText.match(/(?:velocidade\s*)?medida(?:\s*:)?\s*([0-9]{2,3})\s*km/i);
    if (speedMeasuredMatch) {
      fields.velocidade_medida = { value: parseInt(speedMeasuredMatch[1], 10), confidence: 0.9 };
    }

    const totalFields = Object.keys(fields).length;
    const avgConfidence = totalFields > 0
      ? Object.values(fields).reduce((acc, f) => acc + f.confidence, 0) / totalFields
      : 0;

    return {
      fields,
      meta: {
        total_fields: totalFields,
        avg_confidence: Math.round(avgConfidence * 100) / 100,
        parser: "adeumulta_ekb_regex_v2",
      },
    };
  }
}
