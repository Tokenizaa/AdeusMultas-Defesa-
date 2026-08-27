import { LeadType, RawLead } from './types';

const DESPACHANTE_KEYWORDS = [
  'despachante',
  'despachante de trânsito',
  'despachante documentalista',
  'despachante veículos',
  'despachante veicular',
  'despachante detran',
];

const ADVOGADO_KEYWORDS = [
  'advogado direito de trânsito',
  'advogado trânsito',
  'advogado defesa multa',
  'advogado suspensão cnh',
  'advogado cassação cnh',
  'advogado trânsito',
  'direito de trânsito',
  'trânsito direito',
  'advocacia de trânsito',
  'defesa de multa',
  'suspensão cnh',
  'cassação cnh',
];

export function classifyLead(raw: RawLead): LeadType | null {
  const haystack = [raw.category, raw.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isDespachante = DESPACHANTE_KEYWORDS.some((kw) => haystack.includes(kw));
  const isAdvogado = ADVOGADO_KEYWORDS.some((kw) => haystack.includes(kw));

  if (isDespachante && !isAdvogado) return 'despachante';
  if (isAdvogado && !isDespachante) return 'advogado_transito';

  if (isDespachante && isAdvogado) {
    if (raw.category) {
      const cat = raw.category.toLowerCase();
      if (cat.includes('advogado')) return 'advogado_transito';
      if (cat.includes('despachante')) return 'despachante';
    }
    return null;
  }

  return null;
}