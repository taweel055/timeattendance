"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseProfiler = void 0;
const perf_hooks_1 = require("perf_hooks");
const performanceMonitor_1 = require("./performanceMonitor");
const logger_1 = __importDefault(require("./logger"));
class DatabaseProfiler {
    constructor(database) {
        this.db = database;
        this.setupProfiling();
    }
    setupProfiling() {
        const originalPrepare = this.db.prepare.bind(this.db);
        this.db.prepare = (sql) => {
            const statement = originalPrepare(sql);
            const originalRun = statement.run.bind(statement);
            const originalGet = statement.get.bind(statement);
            const originalAll = statement.all.bind(statement);
            statement.run = (...params) => {
                const startTime = perf_hooks_1.performance.now();
                try {
                    const result = originalRun(...params);
                    const duration = perf_hooks_1.performance.now() - startTime;
                    performanceMonitor_1.performanceMonitor.trackDatabaseQuery(sql, duration, true);
                    return result;
                }
                catch (error) {
                    const duration = perf_hooks_1.performance.now() - startTime;
                    performanceMonitor_1.performanceMonitor.trackDatabaseQuery(sql, duration, false);
                    logger_1.default.error('Database query failed', { sql, error: error.message });
                    throw error;
                }
            };
            statement.get = (...params) => {
                const startTime = perf_hooks_1.performance.now();
                try {
                    const result = originalGet(...params);
                    const duration = perf_hooks_1.performance.now() - startTime;
                    performanceMonitor_1.performanceMonitor.trackDatabaseQuery(sql, duration, true);
                    return result;
                }
                catch (error) {
                    const duration = perf_hooks_1.performance.now() - startTime;
                    performanceMonitor_1.performanceMonitor.trackDatabaseQuery(sql, duration, false);
                    logger_1.default.error('Database query failed', { sql, error: error.message });
                    throw error;
                }
            };
            statement.all = (...params) => {
                const startTime = perf_hooks_1.performance.now();
                try {
                    const result = originalAll(...params);
                    const duration = perf_hooks_1.performance.now() - startTime;
                    performanceMonitor_1.performanceMonitor.trackDatabaseQuery(sql, duration, true);
                    return result;
                }
                catch (error) {
                    const duration = perf_hooks_1.performance.now() - startTime;
                    performanceMonitor_1.performanceMonitor.trackDatabaseQuery(sql, duration, false);
                    logger_1.default.error('Database query failed', { sql, error: error.message });
                    throw error;
                }
            };
            return statement;
        };
    }
    analyzeSlowQueries(threshold = 100) {
        const metrics = performanceMonitor_1.performanceMonitor.getMetrics();
        const slowQueries = metrics.database;
        logger_1.default.info('Database performance analysis', {
            threshold,
            ...slowQueries
        });
        return slowQueries;
    }
}
exports.DatabaseProfiler = DatabaseProfiler;
//# sourceMappingURL=databaseProfiler.js.map