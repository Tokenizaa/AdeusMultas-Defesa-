# Settings Service

This service provides persistent storage of settings using Supabase backend with secret masking, audit trail, and validation.

## Features

1. Persistent storage of settings in Supabase `app_settings` table
2. Secret masking for frontend (secrets never leaked in plain text)
3. Audit trail using existing `audit_logs` table
4. Validation against setting definitions
5. Backend access to unmasked secrets when needed

## Usage

```typescript
import { settingsService } from './settings-service';

// Get settings (with secrets masked for frontend)
const settings = await settingsService.getSettings();

// Get a single setting
const setting = await settingsService.getSetting('api_key');

// Get actual (unmasked) value for backend use only
const apiKey = await settingsService.getSettingValue<string>('api_key');

// Update a setting
const result = await settingsService.updateSetting({
  key: 'api_key',
  value: 'new-key-value',
  updatedBy: 'user@example.com'
});

// Reset a setting to default
const result = await settingsService.resetToDefault('api_key', 'user@example.com');
```

## Testing

Run tests with:

```bash
npm test
```

Or with coverage:

```bash
npm run test:cov
```