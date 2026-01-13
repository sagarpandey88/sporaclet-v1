import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import logger from './services/logger';
import db from './database/connection';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { rateLimiter } from './api/middleware/rateLimiter';
import predictionsRouter from './api/routes/predictions';
import eventsRouter from './api/routes/events';
import { startArchiveJob } from './jobs/archiveJob';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', async (_req, res) => {
  const dbHealthy = await db.healthCheck();
  const status = dbHealthy ? 'healthy' : 'unhealthy';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'up' : 'down',
    },
  });
});

// API routes
app.use('/api/predictions', predictionsRouter);
app.use('/api/events', eventsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  try {
    await db.close();
    logger.info('Database connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    // Start archive job
    startArchiveJob();

    app.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        port: PORT,
        host: HOST,
        nodeEnv: process.env.NODE_ENV || 'development',
      });
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

export default app;
