import eventRepository from '../database/repositories/eventRepository';
import logger from './logger';
import { ArchiveJobResult } from '../types';

export class ArchiveService {
  /**
   * Archive predictions older than the specified retention period
   * @param retentionDays Number of days to retain predictions before archiving
   * @returns Number of predictions archived
   */
  async archiveOldPredictions(retentionDays: number): Promise<ArchiveJobResult> {
    try {
      logger.info('Starting archival job', { retentionDays });

      const archivedCount = await eventRepository.archiveOldEvents(retentionDays);

      const result: ArchiveJobResult = {
        archivedCount,
        retentionDays,
        archivedBefore: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000),
      };

      logger.info('Archival job completed', result);

      return result;
    } catch (error: any) {
      logger.error('Archival job failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Get count of archived events
   */
  async getArchivedCount(): Promise<number> {
    try {
      const count = await eventRepository.getArchivedCount();
      return count;
    } catch (error: any) {
      logger.error('Error getting archived count', { error: error.message });
      throw error;
    }
  }
}

export default new ArchiveService();
