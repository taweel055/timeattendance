import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/auth';
import { performanceMonitor } from '../utils/performanceMonitor';
import logger from '../utils/logger';
import { AuthRequest } from '../types';

const router = express.Router();

router.get('/metrics', authenticateToken, authorizeAdmin, (req: AuthRequest, res: express.Response) => {
  try {
    const timeRange = parseInt(req.query.timeRange as string) || 300000;
    const metrics = performanceMonitor.getMetrics(timeRange);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching performance metrics', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to fetch performance metrics'
    });
  }
});

router.get('/report', authenticateToken, authorizeAdmin, (req: AuthRequest, res: express.Response) => {
  try {
    const report = performanceMonitor.generateReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating performance report', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to generate performance report'
    });
  }
});

router.get('/health', (req: express.Request, res: express.Response) => {
  try {
    const metrics = performanceMonitor.getMetrics(60000);
    const isHealthy = 
      metrics.api.errorRate < 10 &&
      metrics.api.averageResponseTime < 2000 &&
      metrics.system.memory.heapUsed < 500;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      metrics: {
        errorRate: metrics.api.errorRate,
        averageResponseTime: metrics.api.averageResponseTime,
        memoryUsage: metrics.system.memory.heapUsed,
        uptime: metrics.system.system.uptime
      }
    });
  } catch (error) {
    logger.error('Error checking system health', { error: (error as Error).message });
    res.status(500).json({
      status: 'error',
      error: 'Failed to check system health'
    });
  }
});

export default router;
