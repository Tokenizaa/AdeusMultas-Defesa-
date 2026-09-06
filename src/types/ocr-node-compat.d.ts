import type { IncomingHttpHeaders } from 'node:http';

declare global {
  namespace NodeJS {
    interface ReadableStream {
      destroy(error?: Error): this;
    }
  }

  interface ObjectConstructor {
    /**
     * OCR's SSRF socket parser builds IncomingHttpHeaders with scalar string
     * values only. Keep the existing runtime behavior while narrowing this
     * specific Object.entries call for TypeScript 5.8 + Node 22 typings.
     */
    entries(o: IncomingHttpHeaders): [string, string][];
  }
}

export {};
