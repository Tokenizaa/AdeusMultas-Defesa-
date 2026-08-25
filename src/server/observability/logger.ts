/**
 * @file logger.ts
 * Centralized Structured Logger & Observability Engine for DefesAi
 * 
 * Features:
 * 1. Standard structured schema with requestId & correlationId for end-to-end tracing.
 * 2. Automatic data sanitization (strips API keys, bearer tokens, full CPFs, passwords, secrets).
 * 3. In-memory bounded ring buffer (2000 items) with query, search and export API.
 * 4. Multi-level support (DEBUG, INFO, WARN, ERROR, FATAL).
 * 5. Emits events on eventBus for real-time observability integration.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogService =
  | 'ai'
  | 'ai_media'
  | 'media'
  | 'supabase'
  | 'payments'
  | 'meta'
  | 'ocr'
  | 'pipeline'
  | 'marketing'
  | 'messaging'
  | 'system'
  | 'auth'
  | 'communication'
  | 'commercial'
  | 'knowledge'
  | 'email'
  | 'push'
  | 'whatsapp';

export type LogOperationStatus =
  | 'success'
  | 'failed'
  | 'timeout'
  | 'retrying'
  | 'fallback'
  | 'skipped'
  | 'pending';

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: LogService;
  module: string;
  operation: string;
  requestId: string;
  correlationId: string;
  userId?: string;
  caseId?: string;
  provider?: 'nvidia' | '9router' | 'gemini' | 'supabase' | 'pagbank' | 'meta' | 'evolution' | 'internal';
  model?: string;
  duration?: number; // ms
  status: LogOperationStatus;
  errorCode?: string;
  message: string;
  metadata?: Record<string, any>;
  sanitized: boolean;
  [key: string]: any;
}

export interface LogFilterParams {
  level?: LogLevel;
  service?: LogService;
  provider?: string;
  status?: LogOperationStatus;
  correlationId?: string;
  caseId?: string;
  requestId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

const MAX_LOG_BUFFER_SIZE = 2000;

class StructuredLogger {
  private buffer: StructuredLogEntry[] = [];
  private listeners: Set<(entry: StructuredLogEntry) => void> = new Set();

  /**
   * Sanitizes object data, stripping sensitive tokens, keys, passwords and masking CPFs.
   */
  public sanitize(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') {
      if (typeof data === 'string') {
        return this.sanitizeString(data);
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const cleaned: Record<string, any> = {};
    const sensitiveKeys = [
      'key',
      'apikey',
      'api_key',
      'token',
      'access_token',
      'secret',
      'password',
      'authorization',
      'bearer',
      'creditcard',
      'card_number',
      'cvv',
    ];

    for (const [k, v] of Object.entries(data)) {
      const lowerKey = k.toLowerCase().replace(/[-_]/g, '');
      const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

      if (isSensitive && typeof v === 'string' && v.length > 0) {
        cleaned[k] = '••••[PROTEGIDO]••••';
      } else if (k === 'cpf' || k === 'clientCpf' || k === 'applicantCpf') {
        cleaned[k] = typeof v === 'string' ? this.maskCpf(v) : v;
      } else {
        cleaned[k] = this.sanitize(v);
      }
    }

    return cleaned;
  }

  private sanitizeString(str: string): string {
    // Mask Bearer tokens
    let sanitized = str.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer ••••[PROTECTED]••••');
    // Mask raw NVIDIA/Gemini/OpenAI-style keys
    sanitized = sanitized.replace(/nvapi-[A-Za-z0-9\-_]{20,}/g, 'nvapi-••••••••');
    sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza••••••••');
    // Mask full CPF numbers
    sanitized = sanitized.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/g, '***.$2.***-**');
    return sanitized;
  }

  private maskCpf(cpf: string): string {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.***-${clean.slice(9, 11)}`;
    }
    return '***.***.***-**';
  }

  /**
   * Primary entry point for structured log emission
   */
  public log(entry: Omit<StructuredLogEntry, 'id' | 'timestamp' | 'sanitized'>): StructuredLogEntry {
    const fullEntry: StructuredLogEntry = {
      level: entry.level,
      service: entry.service,
      module: entry.module,
      operation: entry.operation,
      requestId: entry.requestId,
      correlationId: entry.correlationId,
      status: entry.status,
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      message: this.sanitizeString(entry.message),
      metadata: entry.metadata ? this.sanitize(entry.metadata) : undefined,
      sanitized: true,
    };

    // Store in ring buffer
    this.buffer.unshift(fullEntry);
    if (this.buffer.length > MAX_LOG_BUFFER_SIZE) {
      this.buffer.pop();
    }

    // Terminal formatted preview for developers
    const timeShort = new Date(fullEntry.timestamp).toLocaleTimeString();
    const tag = `[${fullEntry.level.toUpperCase()}][${fullEntry.service}:${fullEntry.module}]`;
    const dur = fullEntry.duration ? ` (${fullEntry.duration}ms)` : '';

    if (fullEntry.level === 'error' || fullEntry.level === 'fatal') {
      console.error(`${timeShort} ${tag} ${fullEntry.message}${dur}`, fullEntry.metadata || '');
    } else if (fullEntry.level === 'warn') {
      console.warn(`${timeShort} ${tag} ${fullEntry.message}${dur}`);
    } else if (process.env.NODE_ENV !== 'production' && fullEntry.level === 'debug') {
      // debug logs in development
      console.debug(`${timeShort} ${tag} ${fullEntry.message}${dur}`);
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(fullEntry);
      } catch (err) {
        console.error('[Logger] Listener notification error:', err);
      }
    });

    return fullEntry;
  }

  public info(
    service: LogService,
    module: string,
    operation: string,
    message: string,
    opts: Partial<StructuredLogEntry> = {}
  ): StructuredLogEntry {
    return this.log({
      level: 'info',
      service,
      module,
      operation,
      message,
      requestId: opts.requestId || `req_${Date.now()}`,
      correlationId: opts.correlationId || `corr_${Date.now()}`,
      status: opts.status || 'success',
      ...opts,
    });
  }

  public warn(
    service: LogService,
    module: string,
    operation: string,
    message: string,
    opts: Partial<StructuredLogEntry> = {}
  ): StructuredLogEntry {
    return this.log({
      level: 'warn',
      service,
      module,
      operation,
      message,
      requestId: opts.requestId || `req_${Date.now()}`,
      correlationId: opts.correlationId || `corr_${Date.now()}`,
      status: opts.status || 'failed',
      ...opts,
    });
  }

  public error(
    service: LogService,
    module: string,
    operation: string,
    message: string,
    opts: Partial<StructuredLogEntry> = {}
  ): StructuredLogEntry {
    return this.log({
      level: 'error',
      service,
      module,
      operation,
      message,
      requestId: opts.requestId || `req_${Date.now()}`,
      correlationId: opts.correlationId || `corr_${Date.now()}`,
      status: opts.status || 'failed',
      ...opts,
    });
  }

  public debug(
    service: LogService,
    module: string,
    operation: string,
    message: string,
    opts: Partial<StructuredLogEntry> = {}
  ): StructuredLogEntry {
    return this.log({
      level: 'debug',
      service,
      module,
      operation,
      message,
      requestId: opts.requestId || `req_${Date.now()}`,
      correlationId: opts.correlationId || `corr_${Date.now()}`,
      status: opts.status || 'success',
      ...opts,
    });
  }

  /**
   * Query filtered logs for the Log Explorer
   */
  public query(params: LogFilterParams = {}): {
    total: number;
    results: StructuredLogEntry[];
    levelsCount: Record<LogLevel, number>;
  } {
    let filtered = [...this.buffer];

    // Compute levels count for the full buffer
    const levelsCount: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };
    this.buffer.forEach((e) => {
      levelsCount[e.level] = (levelsCount[e.level] || 0) + 1;
    });

    if (params.level) {
      filtered = filtered.filter((e) => e.level === params.level);
    }

    if (params.service) {
      filtered = filtered.filter((e) => e.service === params.service);
    }

    if (params.provider) {
      filtered = filtered.filter((e) => e.provider === params.provider);
    }

    if (params.status) {
      filtered = filtered.filter((e) => e.status === params.status);
    }

    if (params.correlationId) {
      filtered = filtered.filter((e) =>
        e.correlationId.toLowerCase().includes(params.correlationId!.toLowerCase())
      );
    }

    if (params.caseId) {
      filtered = filtered.filter((e) =>
        e.caseId?.toLowerCase().includes(params.caseId!.toLowerCase())
      );
    }

    if (params.requestId) {
      filtered = filtered.filter((e) =>
        e.requestId.toLowerCase().includes(params.requestId!.toLowerCase())
      );
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.message.toLowerCase().includes(q) ||
          e.module.toLowerCase().includes(q) ||
          e.operation.toLowerCase().includes(q) ||
          (e.errorCode && e.errorCode.toLowerCase().includes(q))
      );
    }

    if (params.startDate) {
      filtered = filtered.filter((e) => new Date(e.timestamp) >= new Date(params.startDate!));
    }

    if (params.endDate) {
      filtered = filtered.filter((e) => new Date(e.timestamp) <= new Date(params.endDate!));
    }

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const results = filtered.slice(offset, offset + limit);

    return { total, results, levelsCount };
  }

  /**
   * Fetch all logs related to a correlationId (tracing)
   */
  public getTrace(correlationId: string): StructuredLogEntry[] {
    return this.buffer
      .filter((e) => e.correlationId === correlationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public subscribe(fn: (entry: StructuredLogEntry) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public clear(): void {
    this.buffer = [];
  }
}

export const logger = new StructuredLogger();
