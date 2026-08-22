/**
 * @file manager.ts
 * SecretsManager - Secure credential management for backend services
 * 
 * NEVER exposes secrets to frontend. All access is audited.
 * Supports multiple backends: ENV, Supabase Vault, local encrypted fallback.
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import { logger } from '../../observability/logger';
import { eventBus, EventTopics } from '../../../core/events/topics';

const scryptAsync = promisify(scrypt);

export interface SecretBackend {
  name: 'env' | 'supabase_vault' | 'local_encrypted';
  priority: number;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface SecretAccessLog {
  id: string;
  key: string;
  caller: string;
  action: 'read' | 'write' | 'rotate' | 'delete';
  success: boolean;
  timestamp: string;
  ipHash?: string;
  details?: string;
}

export interface SecretMetadata {
  key: string;
  description: string;
  category: 'ai' | 'payments' | 'meta' | 'notifications' | 'supabase' | 'auth' | 'database' | 'other';
  required: boolean;
  rotatable: boolean;
  lastRotated?: string;
  rotationIntervalDays?: number;
}

const SECRET_REGISTRY: Record<string, SecretMetadata> = {
  NVIDIA_API_KEY: { key: 'NVIDIA_API_KEY', description: 'NVIDIA NIM/Build API Key for LLM inference', category: 'ai', required: false, rotatable: true, rotationIntervalDays: 90 },
  NINEROUTER_API_KEY: { key: 'NINEROUTER_API_KEY', description: '9Router fallback gateway API key', category: 'ai', required: false, rotatable: true, rotationIntervalDays: 90 },
  GEMINI_API_KEY: { key: 'GEMINI_API_KEY', description: 'Google Gemini API key for contextual assistance', category: 'ai', required: false, rotatable: true, rotationIntervalDays: 90 },
  META_APP_SECRET: { key: 'META_APP_SECRET', description: 'Meta App Secret for OAuth token exchange', category: 'meta', required: false, rotatable: true, rotationIntervalDays: 180 },
  META_PAGE_TOKENS: { key: 'META_PAGE_TOKENS', description: 'Facebook Page Access Tokens (long-lived)', category: 'meta', required: false, rotatable: true, rotationIntervalDays: 60 },
  PAGBANK_SECRET: { key: 'PAGBANK_SECRET', description: 'PagBank authentication token', category: 'payments', required: false, rotatable: true, rotationIntervalDays: 90 },
  PAGBANK_WEBHOOK_SECRET: { key: 'PAGBANK_WEBHOOK_SECRET', description: 'PagBank webhook signature verification secret', category: 'payments', required: false, rotatable: true, rotationIntervalDays: 180 },
  SUPABASE_SERVICE_ROLE: { key: 'SUPABASE_SERVICE_ROLE', description: 'Supabase service role key (bypass RLS)', category: 'supabase', required: false, rotatable: true, rotationIntervalDays: 180 },
  EVOLUTION_API_KEY: { key: 'EVOLUTION_API_KEY', description: 'Evolution API WhatsApp gateway key', category: 'notifications', required: false, rotatable: true, rotationIntervalDays: 90 },
  JWT_SECRET: { key: 'JWT_SECRET', description: 'JWT signing secret for auth tokens', category: 'auth', required: true, rotatable: true, rotationIntervalDays: 90 },
  ENCRYPTION_KEY: { key: 'ENCRYPTION_KEY', description: 'Master encryption key for local secret storage', category: 'auth', required: true, rotatable: false },
  DATABASE_URL: { key: 'DATABASE_URL', description: 'PostgreSQL connection string', category: 'database', required: true, rotatable: true, rotationIntervalDays: 180 },
};

class EnvBackend implements SecretBackend {
  name = 'env' as const;
  priority = 1;

  async get(key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  async set(key: string, value: string): Promise<void> {
    process.env[key] = value;
  }

  async delete(key: string): Promise<void> {
    delete process.env[key];
  }

  async list(): Promise<string[]> {
    return Object.keys(SECRET_REGISTRY).filter(k => process.env[k]);
  }
}

class LocalEncryptedBackend implements SecretBackend {
  name = 'local_encrypted' as const;
  priority = 3;
  private store: Map<string, string> = new Map();
  private masterKey: Buffer;

  constructor() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
      this.masterKey = createHash('sha256').update(envKey).digest();
    } else {
      this.masterKey = randomBytes(32);
      logger.warn('system', 'local_encrypted', 'init', 'No ENCRYPTION_KEY in env, generated ephemeral key (secrets lost on restart)');
    }
  }

  private encrypt(data: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted.toString('base64');
  }

  private decrypt(encoded: string): string {
    const [ivB64, authTagB64, encryptedB64] = encoded.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  async get(key: string): Promise<string | null> {
    const encrypted = this.store.get(key);
    if (!encrypted) return null;
    try {
      return this.decrypt(encrypted);
    } catch {
      logger.error('system', 'local_encrypted', 'decrypt_failed', `Failed to decrypt secret: ${key}`);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, this.encrypt(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

class SupabaseVaultBackend implements SecretBackend {
  name = 'supabase_vault' as const;
  priority = 2;
  private supabaseUrl: string;
  private serviceRoleKey: string;
  private available = false;

  constructor() {
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
    this.available = !!(this.supabaseUrl && this.serviceRoleKey);
    if (!this.available) {
      logger.info('system', 'supabase_vault', 'init', 'Supabase Vault backend not configured (missing URL or service role key)');
    }
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    if (!this.available) throw new Error('Supabase Vault not configured');
    const url = `${this.supabaseUrl}/rest/v1${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceRoleKey}`,
        'apikey': this.serviceRoleKey,
        'Prefer': 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase Vault error: ${res.status} ${err}`);
    }
    return res.json();
  }

  async get(key: string): Promise<string | null> {
    if (!this.available) return null;
    try {
      const data = await this.request('GET', `/vault/secrets?name=eq.${key}&select=secret`);
      return data?.[0]?.secret || null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.available) return;
    await this.request('POST', '/vault/secrets', { name: key, secret: value });
  }

  async delete(key: string): Promise<void> {
    if (!this.available) return;
    await this.request('DELETE', `/vault/secrets?name=eq.${key}`);
  }

  async list(): Promise<string[]> {
    if (!this.available) return [];
    try {
      const data = await this.request('GET', '/vault/secrets?select=name');
      return data.map((d: any) => d.name);
    } catch {
      return [];
    }
  }
}

export class SecretsManager {
  private backends: SecretBackend[] = [];
  private accessLogs: SecretAccessLog[] = [];
  private initialized = false;

  constructor() {
    this.backends = [
      new EnvBackend(),
      new SupabaseVaultBackend(),
      new LocalEncryptedBackend(),
    ].sort((a, b) => a.priority - b.priority);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('system', 'manager', 'initialized', 'SecretsManager initialized with backends', {
      backends: this.backends.map(b => b.name),
    });
  }

  private async auditLog(log: Omit<SecretAccessLog, 'id' | 'timestamp'>): Promise<void> {
    const entry: SecretAccessLog = {
      ...log,
      id: `sec_audit_${Date.now()}_${randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.accessLogs.unshift(entry);
    if (this.accessLogs.length > 1000) this.accessLogs.pop();

    eventBus.publish(EventTopics.AUDIT_LOG_RECORDED, {
      type: 'secret_access',
      ...entry,
    }, 'secrets_manager');

    logger.info('system', 'audit', log.action, `Secret ${log.action} for ${log.key} by ${log.caller}`, {
      key: log.key,
      caller: log.caller,
      success: log.success,
    });
  }

  private validateAccess(caller: string, key: string, action: 'read' | 'write' | 'rotate' | 'delete'): boolean {
    const metadata = SECRET_REGISTRY[key];
    if (!metadata) {
      logger.warn('system', 'access_control', 'unknown_key', `Attempt to access unregistered secret: ${key} by ${caller}`);
      return false;
    }
    return true;
  }

  async getSecret(key: string, caller: string = 'unknown', ipHash?: string): Promise<string | null> {
    if (!this.validateAccess(caller, key, 'read')) {
      await this.auditLog({ key, caller, action: 'read', success: false, ipHash, details: 'Access denied: unknown key' });
      return null;
    }

    for (const backend of this.backends) {
      try {
        const value = await backend.get(key);
        if (value !== null) {
          await this.auditLog({ key, caller, action: 'read', success: true, ipHash });
          return value;
        }
      } catch (err) {
        logger.warn('system', 'backend', 'get_failed', `Backend ${backend.name} failed for ${key}`, { error: String(err) });
      }
    }

    await this.auditLog({ key, caller, action: 'read', success: false, ipHash, details: 'Not found in any backend' });
    return null;
  }

  async setSecret(key: string, value: string, caller: string = 'unknown', ipHash?: string): Promise<boolean> {
    if (!this.validateAccess(caller, key, 'write')) {
      await this.auditLog({ key, caller, action: 'write', success: false, ipHash, details: 'Access denied: unknown key' });
      return false;
    }

    let success = false;
    for (const backend of this.backends) {
      try {
        await backend.set(key, value);
        success = true;
      } catch (err) {
        logger.warn('system', 'backend', 'set_failed', `Backend ${backend.name} failed for ${key}`, { error: String(err) });
      }
    }

    await this.auditLog({ key, caller, action: 'write', success, ipHash, details: success ? 'Secret updated' : 'All backends failed' });
    return success;
  }

  async rotateSecret(key: string, caller: string = 'unknown', ipHash?: string): Promise<string | null> {
    if (!this.validateAccess(caller, key, 'rotate')) {
      await this.auditLog({ key, caller, action: 'rotate', success: false, ipHash, details: 'Access denied: unknown key' });
      return null;
    }

    const metadata = SECRET_REGISTRY[key];
    if (!metadata.rotatable) {
      await this.auditLog({ key, caller, action: 'rotate', success: false, ipHash, details: 'Secret not rotatable' });
      return null;
    }

    const newValue = randomBytes(32).toString('base64url');
    const success = await this.setSecret(key, newValue, caller, ipHash);

    if (success) {
      await this.auditLog({ key, caller, action: 'rotate', success: true, ipHash, details: 'Secret rotated successfully' });
      return newValue;
    }
    return null;
  }

  async deleteSecret(key: string, caller: string = 'unknown', ipHash?: string): Promise<boolean> {
    if (!this.validateAccess(caller, key, 'delete')) {
      await this.auditLog({ key, caller, action: 'delete', success: false, ipHash, details: 'Access denied: unknown key' });
      return false;
    }

    let success = false;
    for (const backend of this.backends) {
      try {
        await backend.delete(key);
        success = true;
      } catch (err) {
        logger.warn('system', 'backend', 'delete_failed', `Backend ${backend.name} failed for ${key}`, { error: String(err) });
      }
    }

    await this.auditLog({ key, caller, action: 'delete', success, ipHash, details: success ? 'Secret deleted' : 'All backends failed' });
    return success;
  }

  validateSecretAccess(caller: string, key: string): boolean {
    return this.validateAccess(caller, key, 'read');
  }

  getSecretMetadata(key: string): SecretMetadata | null {
    return SECRET_REGISTRY[key] || null;
  }

  listRegisteredSecrets(): SecretMetadata[] {
    return Object.values(SECRET_REGISTRY);
  }

  getAccessLogs(limit = 100): SecretAccessLog[] {
    return this.accessLogs.slice(0, limit);
  }

  async testSecret(key: string): Promise<{ configured: boolean; backend: string | null }> {
    for (const backend of this.backends) {
      try {
        const value = await backend.get(key);
        if (value !== null) {
          return { configured: true, backend: backend.name };
        }
      } catch {
        continue;
      }
    }
    return { configured: false, backend: null };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; backends: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    for (const backend of this.backends) {
      try {
        await backend.list();
        results[backend.name] = true;
      } catch {
        results[backend.name] = false;
      }
    }
    const healthyCount = Object.values(results).filter(Boolean).length;
    return {
      status: healthyCount === this.backends.length ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy',
      backends: results,
    };
  }
}

export const secretsManager = new SecretsManager();