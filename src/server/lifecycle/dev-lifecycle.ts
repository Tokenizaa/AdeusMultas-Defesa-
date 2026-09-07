/**
 * Explicit local-development lifecycle hooks.
 *
 * Side effects that used to be started implicitly by server.ts belong here so
 * the canonical createApp() remains an HTTP composition root.
 */
import { contranCollector } from '../services/legislation-collector';

export function startDevLifecycle(): void {
  if (process.env.NODE_ENV === 'production') return;
  contranCollector.start();
}
