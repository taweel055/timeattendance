interface Migration {
    id: number;
    filename: string;
    executed_at: string;
}
declare class MigrationRunner {
    private migrationsDir;
    constructor();
    private initializeMigrationsTable;
    private getExecutedMigrations;
    private getMigrationFiles;
    private executeMigration;
    runMigrations(): Promise<void>;
    rollbackLastMigration(): Promise<void>;
    getMigrationStatus(): {
        executed: Migration[];
        pending: string[];
    };
}
export default MigrationRunner;
//# sourceMappingURL=migrationRunner.d.ts.map