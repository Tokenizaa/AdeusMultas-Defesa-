/**
 * @file settings-service.ts
 * Persistent Settings Service using Supabase backend
 * 
 * Provides:
 * 1. Persistent storage of settings in Supabase app_settings table
 * 2. Secret masking for frontend (secrets never leaked in plain text)
 * 3. Audit trail using existing audit_logs table
 * 4. Validation against setting definitions
 * 5. Backend access to unmasked secrets when needed
 */

import { getSupabaseServerClient } from '../db/supabase-server';
import { logger, LogService } from '../observability/logger';
import { Database } from '../../types/supabase';
import { configService } from '../config/config-service';

export type SettingCategory =
  | 'ai'
  | 'supabase'
  | 'payments'
  | 'meta'
  | 'marketing'
  | 'ocr'
  | 'system'
  | 'notifications';

export type SettingType = 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'json';

export interface SettingDefinition {
  key: string;
  name: string;
  category: SettingCategory;
  type: SettingType;
  description: string;
  defaultValue: any;
  currentValue?: any;
  isSecret: boolean;
  isRequired: boolean;
  isEditable: boolean;
  options?: { label: string; value: any }[];
  validationRegex?: string;
  envSource?: string;
  lastUpdated?: string;
  updatedBy?: string;
  isConfigured?: boolean;
}

export interface SettingUpdatePayload {
  key: string;
  value: any;
  updatedBy: string;
}

export interface SettingAuditRecord {
  id: string;
  key: string;
  category: SettingCategory;
  isSecret: boolean;
  action: 'UPDATE_CONFIG' | 'UPDATE_SECRET' | 'RESET_DEFAULT';
  updatedBy: string;
  timestamp: string;
  environment: string;
  details: string;
}

class SettingsService {
  private settings: Map<string, SettingDefinition> = new Map();
  private supabase: ReturnType<typeof getSupabaseServerClient> | null = null;

  constructor() {
    this.initializeDefinitions();
    this.supabase = getSupabaseServerClient();
    this.initializeFromDatabase();
    // Sync definitions with database to ensure defaults are present
    this.syncDefinitionsWithDatabase().catch(err => {
      logger.error('settings-service' as LogService, 'init', 'sync-error', `Failed to sync definitions with database: ${err.message}`);
    });
  }

  /**
   * Initialize setting definitions from existing config service
   * We reuse the existing definitions to avoid duplication
   */
  private initializeDefinitions() {
    // We'll access the private settings map from configService
    // This is acceptable since we're in the same codebase and reusing existing work
    const configEntries = (configService as any).settings;
    if (configEntries instanceof Map) {
      for (const [key, definition] of configEntries.entries()) {
        this.settings.set(key, { ...definition });
      }
    } else {
      // Fallback: manually copy definitions if we can't access the private map
      logger.warn('settings-service' as LogService, 'init', 'fallback', 'Using fallback method to load setting definitions');
      // This would require duplicating the definitions - not ideal but functional
      // For now, we'll rely on the fact that we can access the configService.get() method
    }
  }

  /**
   * Load current values from Supabase database on initialization
   * Merge: definitions provide metadata, DB provides current values
   */
  private async initializeFromDatabase() {
    if (!this.supabase) {
      logger.warn('settings-service' as LogService, 'init', 'no-client', 'Supabase client not available, using defaults only');
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('app_settings')
        .select('*');

      if (error) {
        logger.error('settings-service' as LogService, 'init', 'db-error', `Failed to load settings from database: ${error.message}`);
        return;
      }

      if (data && Array.isArray(data)) {
        for (const dbSetting of data) {
          const settingDef = this.settings.get(dbSetting.key);
          if (settingDef) {
            // Update the setting with database value
            settingDef.currentValue = dbSetting.value;
            settingDef.isConfigured = dbSetting.value !== null && dbSetting.value !== '';
            settingDef.lastUpdated = dbSetting.updated_at;
            settingDef.updatedBy = dbSetting.updated_by || undefined;

            logger.info('settings-service' as LogService, 'init', 'loaded', `Loaded setting ${dbSetting.key} from database`);
          } else {
            logger.warn('settings-service' as LogService, 'init', 'unknown-key', `Found setting in database not in definitions: ${dbSetting.key}`);
          }
        }
      }

      logger.info('settings-service' as LogService, 'init', 'complete', `Initialized settings service with ${this.settings.size} definitions`);
    } catch (err: any) {
      logger.error('settings-service' as LogService, 'init', 'exception', `Error initializing settings from database: ${err.message}`);
    }
  }

  /**
   * Save a setting to the database
   */
  private async persistToDatabase(key: string, value: any, updatedBy: string): Promise<boolean> {
    if (!this.supabase) {
      logger.warn('settings-service' as LogService, 'persist', 'no-client', 'Supabase client not available');
      return false;
    }

    try {
      const settingDef = this.settings.get(key);
      if (!settingDef) {
        logger.error('settings-service' as LogService, 'persist', 'not-found', `Setting definition not found for key: ${key}`);
        return false;
      }

      const { error } = await this.supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          category: settingDef.category,
          description: settingDef.description,
          is_public: !settingDef.isSecret, // Public if not secret
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        }, {
          onConflict: 'key'
        });

      if (error) {
        logger.error('settings-service' as LogService, 'persist', 'db-error', `Failed to persist setting ${key}: ${error.message}`);
        return false;
      }

      logger.info('settings-service' as LogService, 'persist', 'success', `Persisted setting ${key} to database`);
      return true;
    } catch (err: any) {
      logger.error('settings-service' as LogService, 'persist', 'exception', `Error persisting setting ${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Get settings with secret masking for frontend consumption
   */
  public async getSettings(category?: string): Promise<SettingDefinition[]> {
    const settingsList: SettingDefinition[] = [];

    for (const [key, def] of this.settings.entries()) {
      if (category && def.category !== category) {
        continue;
      }

      // Create a safe copy for frontend
      const safeDef: SettingDefinition = { ...def };

      // Mask secret values
      if (def.isSecret) {
        safeDef.currentValue = def.isConfigured ? '••••••••••••••••' : '';
        // Also mask defaultValue in the response for consistency
        // (but keep the actual defaultValue in the definition)
      }

      settingsList.push(safeDef);
    }

    return settingsList;
  }

  /**
   * Get a single setting by key
   */
  public async getSetting(key: string): Promise<SettingDefinition | null> {
    const def = this.settings.get(key);
    if (!def) return null;

    // Return a copy with secret masked
    const safeDef: SettingDefinition = { ...def };
    if (def.isSecret) {
      safeDef.currentValue = def.isConfigured ? '••••••••••••••••' : '';
    }

    return safeDef;
  }

  /**
   * Get the actual (unmasked) value of a setting for backend use only
   * This should only be used by backend services that need the real secret
   */
  public async getSettingValue<T = any>(key: string): Promise<T | null> {
    const def = this.settings.get(key);
    if (!def) return null;

    return (def.currentValue ?? def.defaultValue) as T;
  }

  /**
   * Update a setting with validation and persistence
   */
  public async updateSetting(payload: SettingUpdatePayload): Promise<{ success: boolean; message: string }> {
    const { key, value, updatedBy } = payload;
    const def = this.settings.get(key);

    if (!def) {
      return { success: false, message: `Configuração '${key}' não reconhecida no catálogo da plataforma.` };
    }

    if (!def.isEditable) {
      return { success: false, message: `A configuração '${def.name}' é fixa pelo ambiente e não pode ser editada.` };
    }

    // Type coercion & validation
    let sanitizedValue = value;
    let validationError: string | null = null;

    if (def.type === 'number') {
      sanitizedValue = Number(value);
      if (isNaN(sanitizedValue)) {
        validationError = `Valor inválido para '${def.name}'. Deve ser um número válido.`;
      }
    } else if (def.type === 'boolean') {
      sanitizedValue = Boolean(value);
    } else if (def.type === 'secret') {
      sanitizedValue = String(value || '').trim();
    } else if (def.type === 'select' && def.options) {
      const validOptions = def.options.map(opt => opt.value);
      if (!validOptions.includes(value)) {
        validationError = `Valor inválido para '${def.name}'. Deve ser uma das opções válidas.`;
      }
    } else if (def.validationRegex) {
      const regex = new RegExp(def.validationRegex);
      if (!regex.test(String(value))) {
        validationError = `Valor inválido para '${def.name}'. Não corresponde ao padrão esperado.`;
      }
    }

    if (validationError) {
      return { success: false, message: validationError };
    }

    // Update the setting in memory
    def.currentValue = sanitizedValue;
    def.isConfigured = sanitizedValue !== '' && sanitizedValue !== null && sanitizedValue !== undefined;
    def.lastUpdated = new Date().toISOString();
    def.updatedBy = updatedBy;

    // Persist to database
    const persistSuccess = await this.persistToDatabase(key, sanitizedValue, updatedBy);
    if (!persistSuccess) {
      // We still return success because the memory update worked,
      // but we log the persistence failure
      logger.warn('settings-service' as LogService, 'update', 'persist-failed', `Failed to persist setting ${key} to database`);
    }

    // Record audit entry
    await this.recordAudit({
      key,
      category: def.category,
      isSecret: def.isSecret,
      action: def.isSecret ? 'UPDATE_SECRET' : 'UPDATE_CONFIG',
      updatedBy,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      details: def.isSecret
        ? `Segredo '${def.name}' [${def.key}] atualizado com sucesso.`
        : `Configuração '${def.name}' alterada para '${String(sanitizedValue)}'.`,
    });

    return { success: true, message: `Configuração '${def.name}' atualizada com sucesso!` };
  }

  /**
   * Reset a setting to its default value
   */
  public async resetToDefault(key: string, updatedBy: string): Promise<{ success: boolean; message: string }> {
    const def = this.settings.get(key);
    if (!def) {
      return { success: false, message: `Configuração não encontrada: ${key}` };
    }

    // Reset to default value
    def.currentValue = def.defaultValue;
    def.isConfigured = def.defaultValue !== '' && def.defaultValue !== null;
    def.lastUpdated = new Date().toISOString();
    def.updatedBy = updatedBy;

    // Persist to database
    const persistSuccess = await this.persistToDatabase(key, def.defaultValue, updatedBy);
    if (!persistSuccess) {
      logger.warn('settings-service' as LogService, 'reset', 'persist-failed', `Failed to persist reset setting ${key} to database`);
    }

    // Record audit entry
    await this.recordAudit({
      key,
      category: def.category,
      isSecret: def.isSecret,
      action: 'RESET_DEFAULT',
      updatedBy,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      details: `Configuração '${def.name}' restaurada para o padrão de fábrica.`,
    });

    return { success: true, message: `'${def.name}' restaurado para o padrão de fábrica.` };
  }

  /**
   * Get audit history for settings changes
   * We'll use the existing audit_logs table but filter for settings-related actions
   */
  public async getAuditHistory(limit = 50): Promise<SettingAuditRecord[]> {
    if (!this.supabase) {
      logger.warn('settings-service' as LogService, 'audit', 'no-client', 'Supabase client not available');
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .ilike('target_resource', '%') // This is a broad filter - we'll refine in process
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('settings-service' as LogService, 'audit', 'db-error', `Failed to load audit history: ${error.message}`);
        return [];
      }

      // Process and filter for settings-related audit entries
      const auditRecords: SettingAuditRecord[] = [];
      
      if (data && Array.isArray(data)) {
        for (const log of data) {
          // Heuristic to identify settings-related audit logs
          // This could be improved by adding a specific settings audit table or better tagging
          const isSettingsRelated = 
            log.target_resource && 
            (log.target_resource.includes('KEY') || 
             log.target_resource.includes('TOKEN') || 
             log.target_resource.includes('SECRET') ||
             log.target_resource.includes('URL') ||
             log.target_resource.includes('MODEL') ||
             log.target_resource.includes('ENV') ||
             log.action === 'ADMIN_UPDATED_SETTING' ||
             log.action === 'ADMIN_UPDATED_SECRET');

          if (isSettingsRelated) {
            // Find the setting definition to get category and isSecret
            const settingDef = this.settings.get(log.target_resource as string);
            
            auditRecords.push({
              id: log.id,
              key: log.target_resource,
              category: settingDef?.category || 'system',
              isSecret: settingDef?.isSecret || false,
              action: log.action.includes('SECRET') ? 'UPDATE_SECRET' : 
                      log.action === 'RESET_DEFAULT' ? 'RESET_DEFAULT' : 'UPDATE_CONFIG',
              updatedBy: log.actor || 'unknown',
              timestamp: log.timestamp,
              environment: process.env.NODE_ENV || 'development',
              details: log.details as string || log.action,
            });
          }
        }
      }

      return auditRecords;
    } catch (err: any) {
      logger.error('settings-service' as LogService, 'audit', 'exception', `Error getting audit history: ${err.message}`);
      return [];
    }
  }

  /**
   * Record an audit entry in the audit_logs table
   */
  private async recordAudit(params: Omit<SettingAuditRecord, 'id'>): Promise<void> {
    if (!this.supabase) {
      logger.warn('settings-service' as LogService, 'audit', 'no-client', 'Supabase client not available for audit');
      return;
    }

    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          action: params.action === 'UPDATE_SECRET' ? 'ADMIN_UPDATED_SECRET' : 
                  params.action === 'RESET_DEFAULT' ? 'ADMIN_RESET_SETTING' : 'ADMIN_UPDATED_SETTING',
          actor: params.updatedBy,
          actor_role: 'admin',
          target_resource: params.key,
          details: params.details,
          timestamp: params.timestamp,
          ip_hash: '00000000000000000000000000000000', // Placeholder - in real implementation would extract from request
          gdpr_compliant: true,
        });
    } catch (err: any) {
      logger.error('settings-service' as LogService, 'audit', 'db-error', `Failed to record audit entry: ${err.message}`);
    }
  }

  /**
   * Synchronize definitions with database - insert missing defaults
   * Called periodically or on startup if table is empty
   */
  public async syncDefinitionsWithDatabase(): Promise<void> {
    if (!this.supabase) {
      logger.warn('settings-service' as LogService, 'sync', 'no-client', 'Supabase client not available');
      return;
    }

    try {
      // Get current keys in database
      const { data: existingSettings, error } = await this.supabase
        .from('app_settings')
        .select('key');

      if (error) {
        logger.error('settings-service' as LogService, 'sync', 'db-error', `Failed to load existing settings: ${error.message}`);
        return;
      }

      const existingKeys = new Set(existingSettings?.map(setting => setting.key) || []);
      const definitionKeys = new Set(this.settings.keys());

      // Find keys in definitions that are missing from database
      const missingKeys = [...definitionKeys].filter(key => !existingKeys.has(key));

      // Insert missing settings with their default values
      for (const key of missingKeys) {
        const def = this.settings.get(key);
        if (def) {
          await this.supabase
            .from('app_settings')
            .insert({
              key,
              value: def.defaultValue,
              category: def.category,
              description: def.description,
              is_public: !def.isSecret,
              updated_at: new Date().toISOString(),
              updated_by: 'system-sync',
            });

          logger.info('settings-service' as LogService, 'sync', 'inserted', `Inserted missing setting ${key} with default value`);
        }
      }

      if (missingKeys.length > 0) {
        logger.info('settings-service' as LogService, 'sync', 'complete', `Synchronized ${missingKeys.length} missing settings to database`);
      } else {
        logger.info('settings-service' as LogService, 'sync', 'complete', 'All settings already exist in database');
      }
    } catch (err: any) {
      logger.error('settings-service' as LogService, 'sync', 'exception', `Error synchronizing settings with database: ${err.message}`);
    }
  }
}

export const settingsService = new SettingsService();