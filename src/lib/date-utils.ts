/**
 * Utilitários de formatação de data para o padrão brasileiro.
 * 
 * Padrão visual obrigatório: dd/mm/yy (ex.: 27/10/26)
 * Padrão interno/ISO: YYYY-MM-DD (ex.: 2026-10-27)
 * 
 * Conversões:
 *   formatDateBR(isoDate) → "dd/mm/yy"
   parseDateBR(brDate) → isoDate string (ou null se inválido)
 * 
 * CUIDADO: Ano de 2 dígitos pode ser ambíguo. Este utilitário assume
 * que anos 00-39 correspondem a 2000-2039 e 40-99 a 1940-1999,
 * seguindo o comportamento padrão do JavaScript Date.
 */

export function formatDateBR(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return '';
  
  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
  
  // Verifica se a data é válida
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = String(date.getFullYear()).substring(2, 4); // Get 2-digit year from 4-digit
  
  return `${day}/${month}/${year}`;
}

export function parseDateBR(brDate: string): string | null {
  if (!brDate) return null;
  
  // Parse dd/mm/yy format
  const match = brDate.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  
  const [, day, month, year] = match;
  
  // Converter ano de 2 dígitos para 4 dígitos
  // Anos 00-39 -> 2000-2039, 40-99 -> 1940-1999
  let fullYear = Number(year);
  if (fullYear >= 0 && fullYear <= 39) {
    fullYear += 2000;
  } else if (fullYear >= 40 && fullYear <= 99) {
    fullYear += 1900;
  }
  
  const date = new Date(fullYear, Number(month) - 1, Number(day));
  
  // Validar que a data é realmente válida
  if (isNaN(date.getTime()) || date.getDate() !== Number(day) || date.getMonth() + 1 !== Number(month)) {
    return null;
  }
  
  // Retornar em formato ISO para consistência interna
  return date.toISOString().split('T')[0];
}

export function parseIsoDate(isoDate: string): string | null {
  if (!isoDate) return null;
  
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  
  if (isNaN(date.getTime()) || date.getDate() !== Number(day) || date.getMonth() + 1 !== Number(month)) {
    return null;
  }
  
  return isoDate; // Already in ISO format
}

/**
 * Converte um objeto InfractionData, transformando todas as datas de ISO para formato BR de exibição.
 * Não modifica o objeto original, retorna um novo com as datas formatadas.
 */
export function formatInfractionDataDatesBR(infractionData: any): any {
  if (!infractionData) return infractionData;
  
  const result = { ...infractionData };
  
  const dateFields = [
    'dateTime',
    'notificationExpeditionDate', 
    'notificationDeliveryDate',
    'defenseDeadline',
    'inmetroAferitionDate',
  ];
  
  for (const field of dateFields) {
    if (result[field]) {
      result[`${field}Display`] = formatDateBR(result[field]);
    } else {
      result[`${field}Display`] = '';
    }
  }
  
  return result;
}

/**
 * Converte datas formatadas de volta para ISO no infractionData.
 * Útil quando o usuário digita datas no formato dd/mm/yy e quer salvar internamente.
 */
export function parseInfractionDataDatesBR(infractionData: any): any {
  if (!infractionData) return infractionData;
  
  const result = { ...infractionData };
  
  const dateFields = [
    'dateTime',
    'notificationExpeditionDate', 
    'notificationDeliveryDate',
    'defenseDeadline',
    'inmetroAferitionDate',
  ];
  
  for (const field of dateFields) {
    const displayKey = `${field}Display`;
    if (result[displayKey]) {
      const parsed = parseDateBR(result[displayKey]);
      if (parsed) {
        result[field] = parsed;
      }
    }
    // Remover a chave de display se existir
    delete result[displayKey];
  }
  
  return result;
}

/**
 * Normaliza valores recebidos para o formato exigido por <input type="date">.
 * Aceita ISO (YYYY-MM-DD ou timestamp ISO) e datas brasileiras dd/mm/yy ou dd/mm/yyyy.
 * Retorna string vazia para valores inválidos, evitando warnings e datas silenciosamente incorretas.
 */
export function normalizeDateInputValue(value: string | null | undefined): string {
  if (!value) return '';

  const input = value.trim();
  if (!input) return '';

  const isoMatch = input.match(/^(\\d{4}-\\d{2}-\\d{2})(?:T.*)?$/);
  if (isoMatch) {
    return parseIsoDate(isoMatch[1]) ?? '';
  }

  const brMatch = input.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{2}|\\d{4})$/);
  if (!brMatch) return '';

  const [, dayText, monthText, yearText] = brMatch;
  const day = Number(dayText);
  const month = Number(monthText);
  let year = Number(yearText);

  if (yearText.length === 2) {
    year += year <= 39 ? 2000 : 1900;
  }

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
