import { Database } from 'better-sqlite3';
export declare class DatabaseProfiler {
    private db;
    constructor(database: Database);
    private setupProfiling;
    analyzeSlowQueries(threshold?: number): {
        totalQueries: number;
        averageQueryTime: number;
        slowQueries: number;
        failedQueries: number;
    };
}
//# sourceMappingURL=databaseProfiler.d.ts.map