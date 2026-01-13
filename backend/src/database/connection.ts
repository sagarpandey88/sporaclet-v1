import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import logger from '../services/logger';

dotenv.config();

const poolConfig: PoolConfig = {};

// Prefer DATABASE_URL (connection string) if provided in .env
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
  poolConfig.database = process.env.DB_NAME || 'sports_predictions';
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || 'postgres';
}

// SSL handling: respect DB_SSL env var when provided; default to false
poolConfig.ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

poolConfig.min = parseInt(process.env.DB_POOL_MIN || '2', 10);
poolConfig.max = parseInt(process.env.DB_POOL_MAX || '10', 10);
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 2000;

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(poolConfig);

    this.pool.on('connect', () => {
      logger.info('Database connection established');
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message, stack: err.stack });
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Query executed', { text, duration, rows: result.rowCount });
      return result;
    } catch (error: any) {
      logger.error('Query error', { text, error: error.message, stack: error.stack });
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    logger.info('Closing database connection pool');
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }
}

const db = new Database();

export default db;
