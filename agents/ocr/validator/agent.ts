/**
 * Agente: ocr-validator
 * Cruza dados extraídos do OCR com dados do usuário e regras do CTB
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, ValidatedField } from "@/lib/types/agent-interfaces";

export class OCRValidatorAgent extends BaseAgent {
  protected name = "ocr-validator";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    const validatedFields = this.validateFields(context);

    context.validated_fields = validatedFields;
    context.metadata.validatedFields = validatedFields;
    context.metadata.stepsCompleted.push("ocr-validator");
    this.recordUsage(["ocr-validation", `${validatedFields.length}-validated`]);

    return context;
  }

  public validateFields(context: CaseContext): ValidatedField[] {
    const validated: ValidatedField[] = [];
    const { infraction, ocr } = context;
    const extracted = ocr?.extracted_fields || {};

    // 1. Validar Placa
    const plateValue = infraction.placa || extracted.placa?.value || "";
    const isPlateValid = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(plateValue) || /^[A-Z]{3}-?[0-9]{4}$/i.test(plateValue);
    if (plateValue) {
      validated.push({
        campo: "placa",
        valor: plateValue.toUpperCase(),
        fonte_confianca: isPlateValid ? (extracted.placa ? 0.95 : 0.85) : 0.4,
        status: isPlateValid ? "valid" : "warning",
      });
    }

    // 2. Validar Número do Auto de Infração
    const aitValue = infraction.numeroAuto || extracted.numero_auto?.value || "";
    if (aitValue) {
      const isAitValid = aitValue.length >= 5;
      validated.push({
        campo: "numeroAuto",
        valor: aitValue,
        fonte_confianca: isAitValid ? 0.92 : 0.5,
        status: isAitValid ? "valid" : "warning",
      });
    }

    // 3. Validar Código da Infração
    const codeValue = infraction.codigoInfracao || extracted.codigo_infracao?.value || "";
    if (codeValue) {
      const isCodeFormatValid = /^[0-9]{3}[-\s]?[0-9][0-9A-Z]$/i.test(codeValue);
      validated.push({
        campo: "codigoInfracao",
        valor: codeValue,
        fonte_confianca: isCodeFormatValid ? 0.96 : 0.6,
        status: isCodeFormatValid ? "valid" : "warning",
      });
    }

    // 4. Validar Órgão Autuador
    const autuadorValue = infraction.orgaoAutuador || extracted.orgao_autuador?.value || "";
    if (autuadorValue) {
      validated.push({
        campo: "orgaoAutuador",
        valor: autuadorValue,
        fonte_confianca: 0.9,
        status: "valid",
      });
    }

    return validated;
  }
}
