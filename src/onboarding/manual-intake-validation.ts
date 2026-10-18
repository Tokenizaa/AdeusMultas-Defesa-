export interface ManualIntakeInput {
  aitNumber: string;
  infractionCode: string;
  autuadorBody: string;
  dateTime: string;
  location: string;
  plate: string;
  brandModel: string;
  serviceType: 'defesa_previa' | 'recurso_jari' | 'recurso_cetran' | 'suspensao_cnh' | 'cassacao_cnh' | 'indicacao_condutor' | 'conversao_advertencia';
}

export const MANUAL_SERVICE_OPTIONS = [
  { value: 'defesa_previa', label: 'Defesa prévia — notificação de autuação' },
  { value: 'recurso_jari', label: 'Recurso à JARI — notificação de penalidade' },
  { value: 'recurso_cetran', label: 'Recurso ao CETRAN — decisão da JARI' },
  { value: 'suspensao_cnh', label: 'Defesa em processo de suspensão da CNH' },
  { value: 'cassacao_cnh', label: 'Defesa em processo de cassação da CNH' },
  { value: 'indicacao_condutor', label: 'Indicação do condutor responsável' },
  { value: 'conversao_advertencia', label: 'Conversão de multa em advertência' },
] as const;

export type ManualServiceType = typeof MANUAL_SERVICE_OPTIONS[number]['value'];

export type ManualIntakeField = keyof ManualIntakeInput;
export type ManualIntakeErrors = Partial<Record<ManualIntakeField, string>>;

export function normalizeManualIntake(input: ManualIntakeInput): ManualIntakeInput {
  return {
    ...input,
    aitNumber: input.aitNumber.trim(),
    infractionCode: input.infractionCode.trim(),
    autuadorBody: input.autuadorBody.trim(),
    dateTime: input.dateTime.trim(),
    location: input.location.trim(),
    plate: input.plate.replace(/\s+/g, '').toUpperCase(),
    brandModel: input.brandModel.trim(),
  };
}

export function validateManualIntake(input: ManualIntakeInput): ManualIntakeErrors {
  const value = normalizeManualIntake(input);
  const errors: ManualIntakeErrors = {};
  if (!value.aitNumber) errors.aitNumber = 'Informe o número do auto de infração.';
  if (!value.infractionCode) errors.infractionCode = 'Informe o código da infração.';
  if (value.location.length < 5) errors.location = 'Informe o local da infração com pelo menos 5 caracteres.';
  if (value.plate.length < 7 || value.plate.length > 8) errors.plate = 'Informe uma placa válida com 7 ou 8 caracteres.';
  if (value.autuadorBody.length > 120) errors.autuadorBody = 'Use até 120 caracteres.';
  if (value.brandModel.length > 120) errors.brandModel = 'Use até 120 caracteres.';
  if (value.aitNumber.length > 80) errors.aitNumber = 'Use até 80 caracteres.';
  if (value.infractionCode.length > 20) errors.infractionCode = 'Use até 20 caracteres.';
  if (value.dateTime.length > 40) errors.dateTime = 'Verifique a data e a hora informadas.';
  return errors;
}
