import { Builder, Capabilities, WebDriver, WebElement, Key } from 'selenium-webdriver';
import { logger } from '../logger';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface SeleniumSessionOptions {
  headless?: boolean;
  args?: string[];
}

export class SeleniumSession {
  private driver: WebDriver | null = null;
  private options: SeleniumSessionOptions;

  constructor(options: SeleniumSessionOptions = {}) {
    this.options = {
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1366,900',
      ],
      ...options,
    };
  }

  async start(): Promise<WebDriver> {
    if (this.driver) return this.driver;

    try {
      const caps = Capabilities.chrome();
      this.driver = await new Builder()
        .forBrowser('chrome')
        .withCapabilities(caps)
        .build();

      await this.driver.manage().setTimeouts({ implicit: 0, pageLoad: 45000, script: 30000 });
      await this.driver.executeScript(
        `Object.defineProperty(navigator, 'webdriver', { get: () => false });`
      ).catch(() => undefined);

      logger.info('Selenium session iniciada');
      return this.driver;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao iniciar Chrome/Selenium';
      logger.error('Erro ao iniciar sessão Selenium', { error: message });
      throw new Error(message);
    }
  }

  async getDriver(): Promise<WebDriver> {
    if (!this.driver) {
      return this.start();
    }
    return this.driver;
  }

  async navigate(url: string): Promise<void> {
    const driver = await this.getDriver();
    await driver.get(url);
  }

  async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitForSelector(selector: string, timeoutMs = 10000): Promise<boolean> {
    try {
      const driver = await this.getDriver();
      await driver.wait(
        async (d) => {
          try {
            const els = await d.findElements({ css: selector });
            return els.length > 0;
          } catch {
            return false;
          }
        },
        timeoutMs,
        `Timeout aguardando seletor: ${selector}`,
      );
      return true;
    } catch {
      return false;
    }
  }

  async findElement(selector: string): Promise<WebElement | null> {
    const driver = await this.getDriver();
    try {
      return await driver.findElement({ css: selector });
    } catch {
      return null;
    }
  }

  async findElements(selector: string): Promise<WebElement[]> {
    const driver = await this.getDriver();
    try {
      return await driver.findElements({ css: selector });
    } catch {
      return [];
    }
  }

  async scrollContainer(containerSelector: string): Promise<void> {
    const driver = await this.getDriver();
    await driver.executeScript(
      `const el = document.querySelector(arguments[0]); if (el) { const max = el.scrollHeight - el.clientHeight; if (max > 0) el.scrollTop = max; }`,
      containerSelector,
    );
  }

  async scrollWindow(pixelY = 800): Promise<void> {
    const driver = await this.getDriver();
    await driver.executeScript(`window.scrollBy(0, arguments[0]);`, pixelY);
  }

  async getCurrentUrl(): Promise<string> {
    const driver = await this.getDriver();
    return driver.getCurrentUrl();
  }

  async getTitle(): Promise<string> {
    const driver = await this.getDriver();
    return driver.getTitle();
  }

  async evaluate(fn: () => unknown): Promise<unknown> {
    const driver = await this.getDriver();
    return driver.executeScript(`return (function() { ${fn.toString()} })();`);
  }

  async getUrl(): Promise<string> {
    const driver = await this.getDriver();
    return driver.getCurrentUrl();
  }

  async back(): Promise<void> {
    const driver = await this.getDriver();
    await driver.navigate().back();
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.quit().catch(() => undefined);
      this.driver = null;
      logger.info('Selenium session encerrada');
    }
  }
}