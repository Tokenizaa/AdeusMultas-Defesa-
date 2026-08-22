// src/types/api.ts
// TypeScript interfaces for all API endpoints

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  data: T;
  error?: string;
  status: number;
}

/**
 * Settings API response
 */
export interface SettingsResponse {
  settings: SettingDefinitionFrontend[];
  auditHistory: SettingAuditRecord[];
  total: number;
  environment: string;
}

/**
 * Setting item as returned by the API
 * Matches the frontend's SettingDefinitionFrontend
 */
export interface SettingDefinitionFrontend {
  key: string;
  name: string;
  category: 'ai' | 'supabase' | 'payments' | 'meta' | 'marketing' | 'ocr' | 'system' | 'notifications';
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'json';
  description: string;
  defaultValue: any;
  currentValue?: any;
  isSecret: boolean;
  isRequired: boolean;
  isEditable: boolean;
  options?: { label: string; value: any }[];
  lastUpdated?: string;
  updatedBy?: string;
  isConfigured?: boolean;
}

/**
 * Audit record as returned by the API
 */
export interface SettingAuditRecord {
  id: string;
  key: string;
  category: string;
  isSecret: boolean;
  action: string;
  updatedBy: string;
  timestamp: string;
  details: string;
}

/**
 * Payload for updating a setting
 */
export interface UpdateSettingPayload {
  key: string;
  value: any;
  updatedBy: string;
}

/**
 * Payload for resetting a setting to default
 */
export interface ResetDefaultPayload {
  key: string;
  updatedBy: string;
}

/**
 * Payload for testing an integration
 */
export interface TestIntegrationPayload {
  serviceId: string;
}

/**
 * Result of testing an integration
 * Based on the existing healthService.testIntegration function
 * We don't have the exact shape, so we use any for now.
 * In a real scenario, this should be replaced with the actual type.
 */
export interface TestIntegrationResult {
  status: 'passed' | 'failed' | 'error';
  serviceName: string;
  latencyMs: number;
  message: string;
  checks?: Array<{
    label: string;
    passed: boolean;
    detail?: string;
  }>;
}

// Re-export existing types from other modules if needed for API consumption
// For example, if there are auth types, etc.
// But for now, we keep it focused on settings API.