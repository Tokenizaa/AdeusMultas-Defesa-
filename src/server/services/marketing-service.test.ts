import { describe, it, expect } from 'vitest';
import { marketingService } from './marketing-service';

describe('marketingService audience column', () => {
  it('generateContent includes audience=B2C in insert', async () => {
    const result = await marketingService.generateContent('Test Theme', 'instagram', 'carrossel');
    expect(result.success).toBe(true);
    expect(result.content.audience).toBe('B2C');
  });

  it('createManualContent includes audience=B2C in insert', async () => {
    const result = await marketingService.createManualContent({
      title: 'Test',
      channel: 'instagram',
      format: 'carrossel',
      copyText: 'Test copy',
      scheduledDate: new Date().toISOString(),
    });
    expect(result.audience).toBe('B2C');
  });
});