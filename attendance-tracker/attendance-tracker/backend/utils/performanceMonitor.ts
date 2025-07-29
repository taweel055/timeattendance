import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import os from 'os';
import logger from './logger';

interface PerformanceMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface DatabaseMetrics {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private maxMetricsHistory = 1000;
  private startCpuUsage: NodeJS.CpuUsage;

  constructor() {
    this.startCpuUsage = process.cpuUsage();
    this.startPeriodicReporting();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const startCpu = process.cpuUsage();

      res.on('finish', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const cpuUsage = process.cpuUsage(startCpu);

        const metric: PerformanceMetrics = {
          timestamp: Date.now(),
          endpoint: req.route?.path || req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          memoryUsage: process.memoryUsage(),
          cpuUsage
        };

        this.addMetric(metric);

        if (responseTime > 1000) {
          logger.warn('Slow API response detected', {
            endpoint: metric.endpoint,
            method: metric.method,
            responseTime: Math.round(responseTime),
            statusCode: metric.statusCode
          });
        }
      });

      next();
    };
  }

  trackDatabaseQuery(query: string, duration: number, success: boolean = true) {
    const metric: DatabaseMetrics = {
      query: query.substring(0, 100),
      duration,
      timestamp: Date.now(),
      success
    };

    this.addDatabaseMetric(metric);

    if (duration > 500) {
      logger.warn('Slow database query detected', {
        query: metric.query,
        duration: Math.round(duration),
        success
      });
    }
  }

  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  private addDatabaseMetric(metric: DatabaseMetrics) {
    this.dbMetrics.push(metric);
    if (this.dbMetrics.length > this.maxMetricsHistory) {
      this.dbMetrics.shift();
    }
  }

  getMetrics(timeRange: number = 300000) {
    const cutoff = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    const recentDbMetrics = this.dbMetrics.filter(m => m.timestamp > cutoff);

    return {
      api: this.calculateApiStats(recentMetrics),
      database: this.calculateDatabaseStats(recentDbMetrics),
      system: this.getSystemStats(),
      timeRange: timeRange / 1000
    };
  }

  private calculateApiStats(metrics: PerformanceMetrics[]) {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        requestsPerSecond: 0
      };
    }

    const totalRequests = metrics.length;
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const slowRequests = metrics.filter(m => m.responseTime > 1000).length;
    const errorRequests = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;
    
    const timeSpan = (Math.max(...metrics.map(m => m.timestamp)) - Math.min(...metrics.map(m => m.timestamp))) / 1000;
    const requestsPerSecond = timeSpan > 0 ? totalRequests / timeSpan : 0;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
    };
  }

  private calculateDatabaseStats(metrics: DatabaseMetrics[]) {
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        failedQueries: 0
      };
    }

    const totalQueries = metrics.length;
    const averageQueryTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const slowQueries = metrics.filter(m => m.duration > 500).length;
    const failedQueries = metrics.filter(m => !m.success).length;

    return {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowQueries,
      failedQueries
    };
  }

  private getSystemStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.startCpuUsage);
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000),
        system: Math.round(cpuUsage.system / 1000)
      },
      system: {
        loadAverage: os.loadavg(),
        uptime: Math.round(process.uptime()),
        platform: os.platform(),
        nodeVersion: process.version
      }
    };
  }

  private startPeriodicReporting() {
    setInterval(() => {
      const stats = this.getMetrics(60000);
      
      if (stats.api.totalRequests > 0) {
        logger.info('Performance metrics (last 1 minute)', stats);
      }

      if (stats.system.memory.heapUsed > 100) {
        logger.warn('High memory usage detected', {
          heapUsed: stats.system.memory.heapUsed,
          heapTotal: stats.system.memory.heapTotal
        });
      }
    }, 60000);
  }

  generateReport() {
    const stats = this.getMetrics();
    
    return {
      summary: {
        reportTime: new Date().toISOString(),
        ...stats
      },
      recommendations: this.generateRecommendations(stats)
    };
  }

  private generateRecommendations(stats: any) {
    const recommendations: string[] = [];

    if (stats.api.averageResponseTime > 500) {
      recommendations.push('Consider optimizing API endpoints - average response time is high');
    }

    if (stats.api.errorRate > 5) {
      recommendations.push('High error rate detected - investigate failing requests');
    }

    if (stats.database.averageQueryTime > 200) {
      recommendations.push('Database queries are slow - consider adding indexes or optimizing queries');
    }

    if (stats.system.memory.heapUsed > 200) {
      recommendations.push('High memory usage - consider memory optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is within acceptable ranges');
    }

    return recommendations;
  }
}

export const performanceMonitor = new PerformanceMonitor();
export { PerformanceMetrics, DatabaseMetrics };
