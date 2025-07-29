import { Request, Response, NextFunction } from 'express';
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
declare class PerformanceMonitor {
    private metrics;
    private dbMetrics;
    private maxMetricsHistory;
    private startCpuUsage;
    constructor();
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    trackDatabaseQuery(query: string, duration: number, success?: boolean): void;
    private addMetric;
    private addDatabaseMetric;
    getMetrics(timeRange?: number): {
        api: {
            totalRequests: number;
            averageResponseTime: number;
            slowRequests: number;
            errorRate: number;
            requestsPerSecond: number;
        };
        database: {
            totalQueries: number;
            averageQueryTime: number;
            slowQueries: number;
            failedQueries: number;
        };
        system: {
            memory: {
                rss: number;
                heapUsed: number;
                heapTotal: number;
                external: number;
            };
            cpu: {
                user: number;
                system: number;
            };
            system: {
                loadAverage: number[];
                uptime: number;
                platform: NodeJS.Platform;
                nodeVersion: string;
            };
        };
        timeRange: number;
    };
    private calculateApiStats;
    private calculateDatabaseStats;
    private getSystemStats;
    private startPeriodicReporting;
    generateReport(): {
        summary: {
            api: {
                totalRequests: number;
                averageResponseTime: number;
                slowRequests: number;
                errorRate: number;
                requestsPerSecond: number;
            };
            database: {
                totalQueries: number;
                averageQueryTime: number;
                slowQueries: number;
                failedQueries: number;
            };
            system: {
                memory: {
                    rss: number;
                    heapUsed: number;
                    heapTotal: number;
                    external: number;
                };
                cpu: {
                    user: number;
                    system: number;
                };
                system: {
                    loadAverage: number[];
                    uptime: number;
                    platform: NodeJS.Platform;
                    nodeVersion: string;
                };
            };
            timeRange: number;
            reportTime: string;
        };
        recommendations: string[];
    };
    private generateRecommendations;
}
export declare const performanceMonitor: PerformanceMonitor;
export { PerformanceMetrics, DatabaseMetrics };
//# sourceMappingURL=performanceMonitor.d.ts.map