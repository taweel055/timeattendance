"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../database"));
const logger_1 = __importDefault(require("./logger"));
class MigrationRunner {
    constructor() {
        this.migrationsDir = path_1.default.join(__dirname, '../migrations');
        this.initializeMigrationsTable();
    }
    initializeMigrationsTable() {
        try {
            database_1.default.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT UNIQUE NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            logger_1.default.info('Migrations table initialized');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize migrations table:', { error: error.message });
            throw error;
        }
    }
    getExecutedMigrations() {
        try {
            return database_1.default.prepare('SELECT * FROM migrations ORDER BY id').all();
        }
        catch (error) {
            logger_1.default.error('Failed to get executed migrations:', { error: error.message });
            return [];
        }
    }
    getMigrationFiles() {
        try {
            if (!fs_1.default.existsSync(this.migrationsDir)) {
                logger_1.default.warn('Migrations directory does not exist:', { dir: this.migrationsDir });
                return [];
            }
            return fs_1.default.readdirSync(this.migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
        }
        catch (error) {
            logger_1.default.error('Failed to read migration files:', { error: error.message });
            return [];
        }
    }
    executeMigration(filename) {
        try {
            const filePath = path_1.default.join(this.migrationsDir, filename);
            const sql = fs_1.default.readFileSync(filePath, 'utf8');
            logger_1.default.info('Executing migration:', { filename });
            database_1.default.transaction(() => {
                database_1.default.exec(sql);
                database_1.default.prepare('INSERT INTO migrations (filename) VALUES (?)').run(filename);
            })();
            logger_1.default.info('Migration executed successfully:', { filename });
        }
        catch (error) {
            logger_1.default.error('Failed to execute migration:', { filename, error: error.message });
            throw error;
        }
    }
    async runMigrations() {
        try {
            logger_1.default.info('Starting database migrations...');
            const executedMigrations = this.getExecutedMigrations();
            const migrationFiles = this.getMigrationFiles();
            const executedFilenames = new Set(executedMigrations.map(m => m.filename));
            const pendingMigrations = migrationFiles.filter(file => !executedFilenames.has(file));
            if (pendingMigrations.length === 0) {
                logger_1.default.info('No pending migrations found');
                return;
            }
            logger_1.default.info('Found pending migrations:', { count: pendingMigrations.length, files: pendingMigrations });
            for (const filename of pendingMigrations) {
                this.executeMigration(filename);
            }
            logger_1.default.info('All migrations completed successfully');
        }
        catch (error) {
            logger_1.default.error('Migration process failed:', { error: error.message });
            throw error;
        }
    }
    async rollbackLastMigration() {
        try {
            const lastMigration = database_1.default.prepare('SELECT * FROM migrations ORDER BY id DESC LIMIT 1').get();
            if (!lastMigration) {
                logger_1.default.warn('No migrations to rollback');
                return;
            }
            logger_1.default.warn('Rolling back migration:', { filename: lastMigration.filename });
            database_1.default.prepare('DELETE FROM migrations WHERE id = ?').run(lastMigration.id);
            logger_1.default.info('Migration rollback completed:', { filename: lastMigration.filename });
        }
        catch (error) {
            logger_1.default.error('Failed to rollback migration:', { error: error.message });
            throw error;
        }
    }
    getMigrationStatus() {
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
exports.default = MigrationRunner;
//# sourceMappingURL=migrationRunner.js.map