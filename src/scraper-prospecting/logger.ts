import { ScraperLogger } from './types';

const PII_FIELDS = ['phone', 'cellphone', 'contactPhone', 'email', 'name', 'contactName', 'plate', 'licensePlate', 'cpf', 'cnh', 'rg'];
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b(\d{2})\s?9?\s?\d{4}\s?\d{4}\b/g, '(**) *****-****'],   // Brazilian phone
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '***@***.***'], // email
  [/\b[A-Z]{3}[-]?\d{4}\b/g, '***-****'],                        // Brazilian plate
  [/\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g, '***.$2.***-**'], // CPF
];

function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {};
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lowerK = k.toLowerCase();
    if (PII_FIELDS.some((f) => lowerK.includes(f))) {
      if (typeof v === 'string') {
        let masked = v;
        for (const [pattern, replacement] of PII_PATTERNS) {
          masked = masked.replace(pattern, replacement);
        }
        cleaned[k] = masked;
      } else {
        cleaned[k] = v;
      }
    } else if (typeof v === 'string') {
      let masked = v;
      for (const [pattern, replacement] of PII_PATTERNS) {
        masked = masked.replace(pattern, replacement);
      }
      cleaned[k] = masked;
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export class ConsoleLogger implements ScraperLogger {
  private prefix = '[scraper-prospecting]';

  private format(level: string, message: string, meta?: Record<string, unknown>) {
    const time = new Date().toISOString();
    const sanitized = sanitizeMeta(meta);
    const metaStr = Object.keys(sanitized).length > 0 ? ` ${JSON.stringify(sanitized)}` : '';
    return `${time} ${this.prefix} ${level.toUpperCase()} ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, meta?: Record<string, unknown>) {
    console.error(this.format('error', message, meta));
  }
}

export const logger = new ConsoleLogger();