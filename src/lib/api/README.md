# API Client

This module provides a centralized API client with authentication, error handling, retries, and timeouts.

## Usage

```typescript
import { api } from './client';

// GET request
const data = await api.get('/endpoint');

// POST request
const result = await api.post('/endpoint', { key: 'value' });
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