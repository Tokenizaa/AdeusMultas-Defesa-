import { ScraperLogger } from './types';

export class ConsoleLogger implements ScraperLogger {
  private prefix = '[scraper-prospecting]';

  private format(level: string, message: string, meta?: Record<string, unknown>) {
    const time = new Date().toISOString();
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
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