import { Router } from 'express';
import { settingsService } from '../services/settings-service';
import { logger } from '../observability/logger';
import { auditLogs } from '../app';
import { healthService } from '../observability/health-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// Public health check - no auth required
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'settings', timestamp: new Date().toISOString() });
});

// Protected admin routes
router.use(authenticateToken, requireAdmin);

// Centralized Settings & Secret Management Endpoints
router.get(['/', '/settings'], async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const safeSettings = await settingsService.getSettings(category);
    const auditHistory = await settingsService.getAuditHistory();
    res.json({
      settings: safeSettings,
      auditHistory,
      total: safeSettings.length,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error: any) {
    logger.error('system', 'settings-service', 'get_settings', `Erro ao buscar configurações: ${error.message}`, {
      error: error.message,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put(['/', '/settings'], async (req, res) => {
  try {
    const { key, value, updatedBy } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Parâmetro "key" é obrigatório.' });
    }

    const result = await settingsService.updateSetting({
      key,
      value,
      updatedBy: updatedBy || 'admin@www.defesai.shop',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Also register in platform-wide audit logs
    auditLogs.unshift({
      id: `audit_cfg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: updatedBy || 'Administrador',
      role: 'admin',
      action: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') ? 'ADMIN_UPDATED_SECRET' : 'ADMIN_UPDATED_SETTING',
      targetResource: key,
      ipHash: '9f83a21b450c',
      details: result.message,
      gdprCompliant: true,
    });

    logger.info('system', 'settings-service', 'update_setting', `Configuração ${key} atualizada por ${updatedBy || 'admin'}`, {
      key,
      user: updatedBy,
    });

    res.json({
      success: true,
      message: result.message,
      settings: await settingsService.getSettings(),
    });
  } catch (error: any) {
    logger.error('system', 'settings-service', 'update_setting', `Erro ao atualizar ${req.body?.key}: ${error.message}`, {
      error: error.message,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(['/reset-default', '/settings/reset-default'], async (req, res) => {
  const { key, updatedBy } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, message: 'Chave obrigatória.' });
  }

  const result = await settingsService.resetToDefault(key, updatedBy || 'admin@www.defesai.shop');
  res.json({
    ...result,
    settings: await settingsService.getSettings(),
  });
});

router.post(['/test-integration', '/settings/test-integration'], async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId é obrigatório' });
    }

    const testResult = await healthService.testIntegration(serviceId);
    res.json(testResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao testar integração' });
  }
});

export default router;