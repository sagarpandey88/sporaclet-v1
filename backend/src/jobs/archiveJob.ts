import cron from 'node-cron';
import archiveService from '../services/archiveService';
import logger from '../services/logger';
import dotenv from 'dotenv';

dotenv.config();

const CRON_SCHEDULE = process.env.ARCHIVE_CRON_SCHEDULE || '0 0 * * *'; // Daily at midnight
const RETENTION_DAYS = parseInt(process.env.ARCHIVE_RETENTION_DAYS || '30', 10);

export function startArchiveJob() {
  logger.info('Scheduling archive job', {
    schedule: CRON_SCHEDULE,
    retentionDays: RETENTION_DAYS,
  });

  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      logger.info('Archive job triggered');
      const result = await archiveService.archiveOldPredictions(RETENTION_DAYS);
      logger.info('Archive job completed successfully', result);
    } catch (error: any) {
      logger.error('Archive job failed', { error: error.message, stack: error.stack });
    }
  });

  logger.info('Archive job scheduled successfully');
}

// Manual trigger function for testing
export async function runArchiveJobNow() {
  try {
    logger.info('Running archive job manually');
    const result = await archiveService.archiveOldPredictions(RETENTION_DAYS);
    logger.info('Manual archive job completed', result);
    return result;
  } catch (error: any) {
    logger.error('Manual archive job failed', { error: error.message });
    throw error;
  }
}
