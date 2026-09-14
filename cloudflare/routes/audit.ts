import { Hono } from 'hono';
import type { Env } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';

// Auditoria em memória (espelho do stores.auditLogs do Express). Eventos são
// registrados pelas rotas que mutam dados (cases, pagamentos).
const auditEntries: any[] = [];

export const auditRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

auditRoutes.use('/audit-logs', authenticateToken, requireAdmin);
auditRoutes.use('/audit/logs', authenticateToken, requireAdmin);

// GET /api/audit-logs
auditRoutes.get('/audit-logs', (c) => c.json(auditEntries.slice(0, 200)));

// GET /api/audit/logs (alias)
auditRoutes.get('/audit/logs', (c) => c.json({ logs: auditEntries.slice(0, 50) }));

export { auditEntries };
export default auditRoutes;