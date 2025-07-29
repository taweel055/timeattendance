"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = void 0;
const perf_hooks_1 = require("perf_hooks");
const os_1 = __importDefault(require("os"));
const logger_1 = __importDefault(require("./logger"));
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.dbMetrics = [];
        this.maxMetricsHistory = 1000;
        this.startCpuUsage = process.cpuUsage();
        this.startPeriodicReporting();
    }
    middleware() {
        return (req, res, next) => {
            const startTime = perf_hooks_1.performance.now();
            const startCpu = process.cpuUsage();
            res.on('finish', () => {
                const endTime = perf_hooks_1.performance.now();
                const responseTime = endTime - startTime;
                const cpuUsage = process.cpuUsage(startCpu);
                const metric = {
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
                    logger_1.default.warn('Slow API response detected', {
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
    trackDatabaseQuery(query, duration, success = true) {
        const metric = {
            query: query.substring(0, 100),
            duration,
            timestamp: Date.now(),
            success
        };
        this.addDatabaseMetric(metric);
        if (duration > 500) {
            logger_1.default.warn('Slow database query detected', {
                query: metric.query,
                duration: Math.round(duration),
                success
            });
        }
    }
    addMetric(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetricsHistory) {
            this.metrics.shift();
        }
    }
    addDatabaseMetric(metric) {
        this.dbMetrics.push(metric);
        if (this.dbMetrics.length > this.maxMetricsHistory) {
            this.dbMetrics.shift();
        }
    }
    getMetrics(timeRange = 300000) {
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
    calculateApiStats(metrics) {
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
    calculateDatabaseStats(metrics) {
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
    getSystemStats() {
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
                loadAverage: os_1.default.loadavg(),
                uptime: Math.round(process.uptime()),
                platform: os_1.default.platform(),
                nodeVersion: process.version
            }
        };
    }
    startPeriodicReporting() {
        setInterval(() => {
            const stats = this.getMetrics(60000);
            if (stats.api.totalRequests > 0) {
                logger_1.default.info('Performance metrics (last 1 minute)', stats);
            }
            if (stats.system.memory.heapUsed > 100) {
                logger_1.default.warn('High memory usage detected', {
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
    generateRecommendations(stats) {
        const recommendations = [];
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
exports.performanceMonitor = new PerformanceMonitor();
//# sourceMappingURL=performanceMonitor.js.map