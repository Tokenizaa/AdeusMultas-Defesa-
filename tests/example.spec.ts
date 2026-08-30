import { test, expect } from '@playwright/test';

test.describe('Example test', () => {
  test('dummy test', async ({ page }) => {
    await page.goto('https://example.com');
    expect(await page.title()).toBe('Example Domain');
  });
});
