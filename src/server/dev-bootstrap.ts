/**
 * Development bootstrap.
 *
 * Load .env before importing the backend application graph. The backend uses
 * process.env directly for server-side Supabase configuration, while Vite's
 * own env loader does not populate process.env for arbitrary server modules.
 */
import 'dotenv/config';

await import('./dev-entry');
