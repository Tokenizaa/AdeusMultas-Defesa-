import { expect, test } from '@playwright/test';

const PUBLIC_ROUTES = ['/', '/novo-caso', '/login', '/knowledge'];
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

function parseColor(value: string): [number, number, number] | null {
  const normalized = value.trim();
  const rgbMatch = normalized.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];

  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!hexMatch) return null;
  const hex = hexMatch[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channels = [r, g, b].map((channel) => channel / 255).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(
  foreground: [number, number, number],
  background: [number, number, number],
): number {
  const foregroundLum = relativeLuminance(foreground);
  const backgroundLum = relativeLuminance(background);
  const lighter = Math.max(foregroundLum, backgroundLum);
  const darker = Math.min(foregroundLum, backgroundLum);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('F9-10 UX/UI regression guards', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of PUBLIC_ROUTES) {
      test(`${viewport.name} ${route} stays inside the viewport`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route, { waitUntil: 'networkidle' });

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('#rodape')).toBeVisible();

        const layout = await page.evaluate(() => {
          const viewportWidth = window.innerWidth;
          const body = document.body;
          const elements = Array.from(
            document.querySelectorAll<HTMLElement>('button, a, input, textarea, select, [role="button"]'),
          );
          const overflowingInteractive = elements
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
            })
            .slice(0, 10)
            .map((element) => ({
              tag: element.tagName,
              text: element.textContent?.trim().slice(0, 80) ?? '',
            }));

          return {
            viewportWidth,
            bodyScrollWidth: body.scrollWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            overflowingInteractive,
          };
        });

        expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
        expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
        expect(layout.overflowingInteractive).toEqual([]);

        const screenshot = await page.screenshot({ fullPage: true });
        await test.info().attach(`visual-${viewport.name}-${route.replace(/\//g, '_') || 'home'}`, {
          body: screenshot,
          contentType: 'image/png',
        });
      });
    }
  }

  test('design tokens preserve readable base typography and primary contrast', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const metrics = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const foreground = parseColor(body.color);
      const background = parseColor(body.backgroundColor);
      const primary = parseColor(root.getPropertyValue('--blue-warm-vivid-60'));
      const white = parseColor(root.getPropertyValue('--pure-white'));

      return {
        bodyFontSize: Number.parseFloat(body.fontSize),
        bodyLineHeight: Number.parseFloat(body.lineHeight),
        foregroundBackgroundContrast:
          foreground && background ? contrastRatio(foreground, background) : null,
        primaryWhiteContrast: primary && white ? contrastRatio(primary, white) : null,
      };
    });

    expect(metrics.bodyFontSize).toBeGreaterThanOrEqual(16);
    expect(metrics.bodyLineHeight).toBeGreaterThanOrEqual(1.5);
    expect(metrics.foregroundBackgroundContrast).not.toBeNull();
    expect(metrics.foregroundBackgroundContrast!).toBeGreaterThanOrEqual(4.5);
    expect(metrics.primaryWhiteContrast).not.toBeNull();
    expect(metrics.primaryWhiteContrast!).toBeGreaterThanOrEqual(4.5);
  });
});
