export abstract class BaseAgent {
  protected name: string = '';
  protected version: string = '';

  protected addWarning(context: any, message: string): void {
    // Implementation: we can store warnings in the context or just log.
    // Since we don't see warnings being used elsewhere, we'll just log for now.
    console.warn(`[${this.name}] Warning: ${message}`);
  }

  protected recordUsage(features: string[]): void {
    // Implementation: we can record usage metrics.
    // Since we don't see usage being used elsewhere, we'll just log for now.
    console.log(`[${this.name}] Usage: ${features.join(', ')}`);
  }

  protected abstract process(context: any): Promise<any>;
}
