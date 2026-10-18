export interface ManualIntakeInput {
  aitNumber: string;
  infractionCode: string;
  autuadorBody: string;
  dateTime: string;
  location: string;
  plate: string;
  brandModel: string;
  serviceType: 'defesa_previa' | 'recurso_jari';
}

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
