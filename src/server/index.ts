/**
 * Legacy entry point — kept for backward compatibility.
 * Actual bootstrap lives in server.ts → createApp() from app.ts.
 */
export { createApp, databaseRows, auditLogs } from './app';
