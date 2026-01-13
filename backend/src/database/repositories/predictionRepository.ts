import db from '../connection';
import { Prediction, PaginationParams } from '../../types';
import logger from '../../services/logger';

export class PredictionRepository {
  async create(
    prediction: Omit<Prediction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Prediction> {
    const query = `
      INSERT INTO predictions (event_id, prediction_type, predicted_value, confidence_score, reasoning, model_version)
      VALUES ($1, $2, $3, $4, $5, $6)   
       ON CONFLICT (event_id) DO NOTHING   
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
     // If insert returned a row, return it.
      if (result.rows && result.rows[0]) return result.rows[0];

      // Otherwise a conflicting row exists. Return the existing prediction for the event.
      const existingQuery = `SELECT * FROM predictions WHERE event_id = $1 ORDER BY created_at DESC LIMIT 1`;
      const existingResult = await db.query(existingQuery, [prediction.event_id]);
      return existingResult.rows[0];
    } catch (error: any) {
      logger.error('Error creating prediction', { error: error.message, prediction });
      throw error;
    }
  }

  async findById(id: number): Promise<Prediction | null> {
    const query = `
      SELECT p.*
      FROM predictions p
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
  ): Promise<{ predictions: Prediction[]; total: number }> {
    let query = `
      SELECT
        p.id,
        p.event_id,
        p.prediction_type,
        p.predicted_value,
        CAST(p.confidence_score AS DOUBLE PRECISION) as confidence_score,
        p.reasoning,
        p.model_version,
        p.created_at,
        p.updated_at
      FROM predictions p
      INNER JOIN events e ON p.event_id = e.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (!filters.includeArchived) {
      query += ` AND e.is_archived = false`;
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
