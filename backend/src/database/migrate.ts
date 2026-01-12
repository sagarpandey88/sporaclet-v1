import fs from 'fs';
import path from 'path';
import db from './connection';
import logger from '../services/logger';

export async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    const migrationsPath = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath).filter((file) => file.endsWith('.sql'));

    for (const file of migrationFiles.sort()) {
      logger.info(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
      await db.query(sql);
      logger.info(`Migration completed: ${file}`);
    }

    logger.info('All migrations completed successfully');
  } catch (error: any) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed', { error });
      process.exit(1);
    });
}
