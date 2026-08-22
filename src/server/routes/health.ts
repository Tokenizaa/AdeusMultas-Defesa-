import { Router } from 'express';
import { databaseRows } from '../app';
import { healthService } from '../observability/health-service';

const router = Router();

// Healthcheck endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DefesAi API',
    version: '2.0.0',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    activeCases: databaseRows.size,
    timestamp: new Date().toISOString(),
  });
});

// Health test endpoint for specific services
router.post('/health/test', async (req, res) => {
  try {
    const { service } = req.body;
    
    if (!service) {
      return res.status(400).json({ 
        error: 'service parameter is required' 
      });
    }

    const result = await healthService.testIntegration(service);
    
    // Return in the format expected by the frontend
    res.json({
      success: result.status === 'passed',
      latencyMs: result.latencyMs,
      error: result.status !== 'passed' ? result.message : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

export default router;
