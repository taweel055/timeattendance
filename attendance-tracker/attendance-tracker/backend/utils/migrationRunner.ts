import fs from 'fs';
import path from 'path';
import db from '../database';
import logger from './logger';

interface Migration {
  id: number;
  filename: string;
  executed_at: string;
}

class MigrationRunner {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.initializeMigrationsTable();
  }

  private initializeMigrationsTable(): void {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT UNIQUE NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info('Migrations table initialized');
    } catch (error: any) {
      logger.error('Failed to initialize migrations table:', { error: error.message });
      throw error;
    }
  }

  private getExecutedMigrations(): Migration[] {
    try {
      return db.prepare('SELECT * FROM migrations ORDER BY id').all() as Migration[];
    } catch (error: any) {
      logger.error('Failed to get executed migrations:', { error: error.message });
      return [];
    }
  }

  private getMigrationFiles(): string[] {
    try {
      if (!fs.existsSync(this.migrationsDir)) {
        logger.warn('Migrations directory does not exist:', { dir: this.migrationsDir });
        return [];
      }

      return fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error: any) {
      logger.error('Failed to read migration files:', { error: error.message });
      return [];
    }
  }

  private executeMigration(filename: string): void {
    try {
      const filePath = path.join(this.migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      logger.info('Executing migration:', { filename });
      
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(filename);
      })();
      
      logger.info('Migration executed successfully:', { filename });
    } catch (error: any) {
      logger.error('Failed to execute migration:', { filename, error: error.message });
      throw error;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...');
      
      const executedMigrations = this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();
      
      const executedFilenames = new Set(executedMigrations.map(m => m.filename));
      const pendingMigrations = migrationFiles.filter(file => !executedFilenames.has(file));
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }
      
      logger.info('Found pending migrations:', { count: pendingMigrations.length, files: pendingMigrations });
      
      for (const filename of pendingMigrations) {
        this.executeMigration(filename);
      }
      
      logger.info('All migrations completed successfully');
    } catch (error: any) {
      logger.error('Migration process failed:', { error: error.message });
      throw error;
    }
  }

  public async rollbackLastMigration(): Promise<void> {
    try {
      const lastMigration = db.prepare('SELECT * FROM migrations ORDER BY id DESC LIMIT 1').get() as Migration | undefined;
      
      if (!lastMigration) {
        logger.warn('No migrations to rollback');
        return;
      }
      
      logger.warn('Rolling back migration:', { filename: lastMigration.filename });
      
      db.prepare('DELETE FROM migrations WHERE id = ?').run(lastMigration.id);
      
      logger.info('Migration rollback completed:', { filename: lastMigration.filename });
    } catch (error: any) {
      logger.error('Failed to rollback migration:', { error: error.message });
      throw error;
    }
  }

  public getMigrationStatus(): { executed: Migration[], pending: string[] } {
    const executedMigrations = this.getExecutedMigrations();
    const migrationFiles = this.getMigrationFiles();
    const executedFilenames = new Set(executedMigrations.map(m => m.filename));
    const pendingMigrations = migrationFiles.filter(file => !executedFilenames.has(file));
    
    return {
      executed: executedMigrations,
      pending: pendingMigrations
    };
  }
}

export default MigrationRunner;
