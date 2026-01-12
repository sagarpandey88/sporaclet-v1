import predictionRepository from '../database/repositories/predictionRepository';
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

      const archivedCount = await predictionRepository.archiveOldPredictions(retentionDays);

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
   * Get count of archived predictions
   */
  async getArchivedCount(): Promise<number> {
    try {
      const { total } = await predictionRepository.findAll(
        { includeArchived: true },
        { page: 1, limit: 1, offset: 0 }
      );
      return total;
    } catch (error: any) {
      logger.error('Error getting archived count', { error: error.message });
      throw error;
    }
  }
}

export default new ArchiveService();
