import { Database } from 'better-sqlite3';
import { performance } from 'perf_hooks';
import { performanceMonitor } from './performanceMonitor';
import logger from './logger';

export class DatabaseProfiler {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
    this.setupProfiling();
  }

  private setupProfiling() {
    const originalPrepare = this.db.prepare.bind(this.db);
    
    (this.db as any).prepare = (sql: string) => {
      const statement = originalPrepare(sql);
      
      const originalRun = statement.run.bind(statement);
      const originalGet = statement.get.bind(statement);
      const originalAll = statement.all.bind(statement);

      statement.run = (...params: any[]) => {
        const startTime = performance.now();
        try {
          const result = originalRun(...params);
          const duration = performance.now() - startTime;
          performanceMonitor.trackDatabaseQuery(sql, duration, true);
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          performanceMonitor.trackDatabaseQuery(sql, duration, false);
          logger.error('Database query failed', { sql, error: (error as Error).message });
          throw error;
        }
      };

      statement.get = (...params: any[]) => {
        const startTime = performance.now();
        try {
          const result = originalGet(...params);
          const duration = performance.now() - startTime;
          performanceMonitor.trackDatabaseQuery(sql, duration, true);
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          performanceMonitor.trackDatabaseQuery(sql, duration, false);
          logger.error('Database query failed', { sql, error: (error as Error).message });
          throw error;
        }
      };

      statement.all = (...params: any[]) => {
        const startTime = performance.now();
        try {
          const result = originalAll(...params);
          const duration = performance.now() - startTime;
          performanceMonitor.trackDatabaseQuery(sql, duration, true);
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          performanceMonitor.trackDatabaseQuery(sql, duration, false);
          logger.error('Database query failed', { sql, error: (error as Error).message });
          throw error;
        }
      };

      return statement;
    };
  }

  analyzeSlowQueries(threshold: number = 100) {
    const metrics = performanceMonitor.getMetrics();
    const slowQueries = metrics.database;
    
    logger.info('Database performance analysis', {
      threshold,
      ...slowQueries
    });

    return slowQueries;
  }
}
