import { vi, beforeAll, beforeEach, describe, test, expect } from 'vitest';

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

// Mock configService
const mockConfigService = {
  settings: new Map([
    [
      'test_string', 
      {
        key: 'test_string',
        name: 'Test String',
        category: 'system' as const,
        type: 'string' as const,
        description: 'A test string setting',
        defaultValue: 'default-value',
        isSecret: false,
        isRequired: false,
        isEditable: true,
      }
    ],
    [
      'test_secret',
      {
        key: 'test_secret',
        name: 'Test Secret',
        category: 'supabase' as const,
        type: 'secret' as const,
        description: 'A test secret setting',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
      }
    ],
    [
      'test_number',
      {
        key: 'test_number',
        name: 'Test Number',
        category: 'ai' as const,
        type: 'number' as const,
        description: 'A test number setting',
        defaultValue: 42,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      }
    ],
    [
      'test_boolean',
      {
        key: 'test_boolean',
        name: 'Test Boolean',
        category: 'marketing' as const,
        type: 'boolean' as const,
        description: 'A test boolean setting',
        defaultValue: true,
        isSecret: false,
        isRequired: false,
        isEditable: true,
      }
    ],
    [
      'test_select',
      {
        key: 'test_select',
        name: 'Test Select',
        category: 'ocr' as const,
        type: 'select' as const,
        description: 'A test select setting',
        defaultValue: 'option1',
        isSecret: false,
        isRequired: false,
        isEditable: true,
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
          { label: 'Option 3', value: 'option3' }
        ]
      }
    ]
  ])
};

// Set up mocks before importing the module
vi.mock('../db/supabase-server', () => ({
  getSupabaseServerClient: () => mockSupabase
}));

vi.mock('../config/config-service', () => ({
  configService: mockConfigService
}));

vi.mock('../observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  LogService: {}
}));

// We'll import the service in a beforeEach to ensure mocks are applied
let settingsService: any;

beforeAll(async () => {
    // Import after mocks are set up
    const module = await import('../settings-service');
    settingsService = module.settingsService;
});

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear the settings map and reinitialize with our mock data
    settingsService.settings.clear();
    mockConfigService.settings.forEach((value, key) => {
      settingsService.settings.set(key, { ...value });
    });
  });

  describe('Settings Retrieval', () => {
    test('getSettings() returns settings with secrets masked', async () => {
      const settings = await settingsService.getSettings();
      
      // Find our test settings
      const testStringSetting = settings.find(s => s.key === 'test_string');
      const testSecretSetting = settings.find(s => s.key === 'test_secret');
      
      expect(testStringSetting).toBeDefined();
      expect(testStringSetting?.currentValue).toBe('default-value'); // Not secret, so not masked
      
      expect(testSecretSetting).toBeDefined();
      expect(testSecretSetting?.currentValue).toBe('••••••••••••••••'); // Secret, so masked
    });

    test('getSettings(category) filters by category', async () => {
      const systemSettings = await settingsService.getSettings('system');
      const supabaseSettings = await settingsService.getSettings('supabase');
      
      // Should only return settings from the specified category
      expect(systemSettings.every(s => s.category === 'system')).toBe(true);
      expect(supabaseSettings.every(s => s.category === 'supabase')).toBe(true);
      
      // Should have the expected settings
      expect(systemSettings.find(s => s.key === 'test_string')).toBeDefined();
      expect(supabaseSettings.find(s => s.key === 'test_secret')).toBeDefined();
    });

    test('getSetting(key) returns single setting', async () => {
      const setting = await settingsService.getSetting('test_string');
      
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('test_string');
      expect(setting?.name).toBe('Test String');
    });

    test('getSettingValue(key) returns unmasked value (backend only)', async () => {
      const secretValue = await settingsService.getSettingValue<string>('test_secret');
      
      // Should return the actual value, not masked
      expect(secretValue).toBe(''); // Default value
    });
  });

  describe('Settings Updates', () => {
    test('updateSetting() validates input against definition', async () => {
      // Test number validation
      const result = await settingsService.updateSetting({
        key: 'test_number',
        value: 'not-a-number',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Valor inválido');
    });

    test('updateSetting() persists to database', async () => {
      // Mock successful database operation
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      
      const result = await settingsService.updateSetting({
        key: 'test_string',
        value: 'updated-value',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_string',
          value: 'updated-value'
        }),
        expect.objectContaining({
          onConflict: 'key'
        })
      );
    });

    test('updateSetting() handles secrets correctly', async () => {
      // Mock successful database operation
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      
      const result = await settingsService.updateSetting({
        key: 'test_secret',
        value: 'new-secret-value',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      // Secret value should be persisted as-is (not masked in backend)
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_secret',
          value: 'new-secret-value'
        }),
        expect.any(Object)
      );
    });

    test('updateSetting() returns appropriate success/error messages', async () => {
      // Test successful update
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      let result = await settingsService.updateSetting({
        key: 'test_string',
        value: 'updated-value',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('atualizada com sucesso');
      
      // Test failed validation
      result = await settingsService.updateSetting({
        key: 'test_number',
        value: 'invalid',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Valor inválido');
    });
  });

  describe('Settings Reset', () => {
    test('resetToDefault() resets to definition defaultValue', async () => {
      // Mock successful database operation
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      
      const result = await settingsService.resetToDefault('test_string', 'test-user');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('restaurado para o padrão de fábrica');
      
      // Should have called upsert with the default value
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_string',
          value: 'default-value' // This is the defaultValue from our mock
        }),
        expect.any(Object)
      );
    });

    test('resetToDefault() persists change', async () => {
      // Mock successful database operation
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      
      await settingsService.resetToDefault('test_number', 'test-user');
      
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_number',
          value: 42 // Default value for test_number
        }),
        expect.any(Object)
      );
    });

    test('resetToDefault() triggers audit log', async () => {
      // Mock successful database operations
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      mockSupabase.from().insert.mockResolvedValueOnce({ error: null });
      
      await settingsService.resetToDefault('test_boolean', 'test-user');
      
      // Should have called insert for audit log
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });
  });

  describe('Secret Security', () => {
    test('frontend methods never return unmasked secrets', async () => {
      // Set up a secret with a value
      const setting = settingsService.settings.get('test_secret');
      if (setting) {
        setting.currentValue = 'actual-secret-value';
        setting.isConfigured = true;
      }
      
      // Get setting via frontend method (getSetting)
      const frontendSetting = await settingsService.getSetting('test_secret');
      
      // Should be masked
      expect(frontendSetting?.currentValue).toBe('••••••••••••••••');
      expect(frontendSetting?.currentValue).not.toBe('actual-secret-value');
    });

    test('backend methods (getSettingValue) can access real secrets', async () => {
      // Set up a secret with a value
      const setting = settingsService.settings.get('test_secret');
      if (setting) {
        setting.currentValue = 'actual-secret-value';
        setting.isConfigured = true;
      }
      
      // Get setting via backend method (getSettingValue)
      const backendValue = await settingsService.getSettingValue<string>('test_secret');
      
      // Should be unmasked
      expect(backendValue).toBe('actual-secret-value');
    });

    test('is_public field controls visibility', async () => {
      // This is tested indirectly through the masking behavior above
      // In the persistToDatabase method, is_public is set to !isSecret
      
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      
      await settingsService.updateSetting({
        key: 'test_secret',
        value: 'secret-value',
        updatedBy: 'test-user'
      });
      
      // Check that is_public was set to false for secret
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_secret',
          is_public: false // Because it's a secret
        }),
        expect.any(Object)
      );
      
      // Reset mock
      mockSupabase.upsert.mockClear();
      
      await settingsService.updateSetting({
        key: 'test_string',
        value: 'public-value',
        updatedBy: 'test-user'
      });
      
      // Check that is_public was set to true for non-secret
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_string',
          is_public: true // Because it's not a secret
        }),
        expect.any(Object)
      );
    });
  });

  describe('Validation', () => {
    test('type validation works for string', async () => {
      // String type should accept any string
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      const result = await settingsService.updateSetting({
        key: 'test_string',
        value: 'any-string-value',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
    });

    test('type validation works for number', async () => {
      // Valid number
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      let result = await settingsService.updateSetting({
        key: 'test_number',
        value: '123',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      
      // Invalid number
      result = await settingsService.updateSetting({
        key: 'test_number',
        value: 'not-a-number',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Valor inválido');
    });

    test('type validation works for boolean', async () => {
      // Various values that should convert to boolean
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      let result = await settingsService.updateSetting({
        key: 'test_boolean',
        value: 'true',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      
      result = await settingsService.updateSetting({
        key: 'test_boolean',
        value: 'false',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      
      result = await settingsService.updateSetting({
        key: 'test_boolean',
        value: '0',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true); // "0" is truthy in JavaScript, so becomes true
    });

    test('options validation works for select types', async () => {
      // Valid option
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      let result = await settingsService.updateSetting({
        key: 'test_select',
        value: 'option2',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      
      // Invalid option
      result = await settingsService.updateSetting({
        key: 'test_select',
        value: 'invalid-option',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Valor inválido');
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined/null values', async () => {
      // Test with null value
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      let result = await settingsService.updateSetting({
        key: 'test_string',
        value: null,
        updatedBy: 'test-user'
      });
      
      // Should succeed (null is allowed, will be converted to string "null")
      expect(result.success).toBe(true);
      
      // Test with undefined value
      result = await settingsService.updateSetting({
        key: 'test_string',
        value: undefined,
        updatedBy: 'test-user'
      });
      
      // Should succeed (undefined becomes "undefined" string)
      expect(result.success).toBe(true);
    });

    test('handles empty string handling', async () => {
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      const result = await settingsService.updateSetting({
        key: 'test_string',
        value: '',
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      // Empty string should make isConfigured = false
      const setting = settingsService.settings.get('test_string');
      expect(setting?.isConfigured).toBe(false);
    });

    test('handles JSON value storage and retrieval', async () => {
      // Add a JSON setting to our mock config
      const jsonSetting = {
        key: 'test_json',
        name: 'Test JSON',
        category: 'system' as const,
        type: 'json' as const,
        description: 'A test JSON setting',
        defaultValue: { foo: 'bar' },
        isSecret: false,
        isRequired: false,
        isEditable: true,
      };
      
      // Manually add to settings map for this test
      settingsService.settings.set(jsonSetting.key, jsonSetting);
      
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      const result = await settingsService.updateSetting({
        key: 'test_json',
        value: { baz: 'qux' },
        updatedBy: 'test-user'
      });
      
      expect(result.success).toBe(true);
      // JSON should be stringified for storage
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_json',
          value: '{"baz":"qux"}'
        }),
        expect.any(Object)
      );
    });
  });
});