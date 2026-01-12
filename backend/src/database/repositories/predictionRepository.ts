import db from '../connection';
import { Prediction, PredictionWithEvent, PaginationParams } from '../../types';
import logger from '../../services/logger';

export class PredictionRepository {
  async create(
    prediction: Omit<Prediction, 'id' | 'created_at' | 'updated_at' | 'is_archived'>
  ): Promise<Prediction> {
    const query = `
      INSERT INTO predictions (event_id, prediction_type, predicted_value, confidence_score, reasoning, model_version)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      prediction.event_id,
      prediction.prediction_type,
      prediction.predicted_value,
      prediction.confidence_score,
      prediction.reasoning,
      prediction.model_version,
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      logger.error('Error creating prediction', { error: error.message, prediction });
      throw error;
    }
  }

  async findById(id: number): Promise<PredictionWithEvent | null> {
    const query = `
      SELECT 
        p.*,
        json_build_object(
          'id', e.id,
          'sport', e.sport,
          'league', e.league,
          'home_team', e.home_team,
          'away_team', e.away_team,
          'event_date', e.event_date,
          'venue', e.venue,
          'status', e.status,
          'created_at', e.created_at,
          'updated_at', e.updated_at
        ) as event
      FROM predictions p
      INNER JOIN events e ON p.event_id = e.id
      WHERE p.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Error finding prediction by ID', { error: error.message, id });
      throw error;
    }
  }

  async findAll(
    filters: {
      sport?: string;
      league?: string;
      team?: string;
      startDate?: Date;
      endDate?: Date;
      predictionType?: string;
      minConfidence?: number;
      includeArchived?: boolean;
    },
    pagination: PaginationParams
  ): Promise<{ predictions: PredictionWithEvent[]; total: number }> {
    let query = `
      SELECT 
        p.*,
        json_build_object(
          'id', e.id,
          'sport', e.sport,
          'league', e.league,
          'home_team', e.home_team,
          'away_team', e.away_team,
          'event_date', e.event_date,
          'venue', e.venue,
          'status', e.status,
          'created_at', e.created_at,
          'updated_at', e.updated_at
        ) as event
      FROM predictions p
      INNER JOIN events e ON p.event_id = e.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (!filters.includeArchived) {
      query += ` AND p.is_archived = false`;
    }

    if (filters.sport) {
      query += ` AND e.sport = $${paramCount++}`;
      values.push(filters.sport);
    }

    if (filters.league) {
      query += ` AND e.league = $${paramCount++}`;
      values.push(filters.league);
    }

    if (filters.team) {
      query += ` AND (e.home_team = $${paramCount} OR e.away_team = $${paramCount})`;
      values.push(filters.team);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND e.event_date >= $${paramCount++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND e.event_date <= $${paramCount++}`;
      values.push(filters.endDate);
    }

    if (filters.predictionType) {
      query += ` AND p.prediction_type = $${paramCount++}`;
      values.push(filters.predictionType);
    }

    if (filters.minConfidence !== undefined) {
      query += ` AND p.confidence_score >= $${paramCount++}`;
      values.push(filters.minConfidence);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM (${query}) as filtered`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination
    query += ` ORDER BY e.event_date DESC, p.created_at DESC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(pagination.limit, pagination.offset);

    try {
      const result = await db.query(query, values);
      return { predictions: result.rows, total };
    } catch (error: any) {
      logger.error('Error finding predictions', { error: error.message, filters });
      throw error;
    }
  }

  async update(id: number, prediction: Partial<Prediction>): Promise<Prediction | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(prediction).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE predictions
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Error updating prediction', { error: error.message, id, prediction });
      throw error;
    }
  }

  async archiveOldPredictions(retentionDays: number): Promise<number> {
    const query = `
      UPDATE predictions
      SET is_archived = true
      WHERE is_archived = false
        AND created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    try {
      const result = await db.query(query);
      return result.rowCount || 0;
    } catch (error: any) {
      logger.error('Error archiving predictions', { error: error.message, retentionDays });
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM predictions WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error: any) {
      logger.error('Error deleting prediction', { error: error.message, id });
      throw error;
    }
  }
}

export default new PredictionRepository();
