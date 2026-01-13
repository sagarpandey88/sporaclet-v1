import db from '../connection';
import { Event, PaginationParams } from '../../types';
import logger from '../../services/logger';

export class EventRepository {
  async create(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const query = `
      INSERT INTO events (event_ref, sport, league, home_team, away_team, event_date, venue, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (event_ref) DO NOTHING
      RETURNING *
    `;
    const values = [
      event.event_ref,
      event.sport,
      event.league,
      event.home_team,
      event.away_team,
      event.event_date,
      event.venue,
      event.status,
    ];

    try {
      const result = await db.query(query, values);
      // If conflict, return null or fetch existing
      if (result.rows.length === 0) {
        logger.warn('Event already exists (duplicate event_ref)', { event_ref: event.event_ref });
        // Optionally fetch and return the existing event
        const existingQuery = 'SELECT * FROM events WHERE event_ref = $1';
        const existingResult = await db.query(existingQuery, [event.event_ref]);
        return existingResult.rows[0];
      }
      return result.rows[0];
    } catch (error: any) {
      logger.error('Error creating event', { error: error.message, event });
      throw error;
    }
  }

  async findByEventRef(eventRef: string): Promise<Event | null> {
    const query = 'SELECT * FROM events WHERE event_ref = $1';
    try {
      const result = await db.query(query, [eventRef]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Error finding event by event_ref', { error: error.message, eventRef });
      throw error;
    }
  }

  async findById(id: number, options?: { includePredictions?: boolean }): Promise<Event | null> {
    const includePredictions = options?.includePredictions !== false;

    if (!includePredictions) {
      const query = 'SELECT * FROM events WHERE id = $1';
      try {
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
      } catch (error: any) {
        logger.error('Error finding event by ID', { error: error.message, id });
        throw error;
      }
    }

    const query = `
      SELECT
        e.*,
        lp.prediction as prediction
      FROM events e
      LEFT JOIN LATERAL (
        SELECT json_build_object(
          'id', p.id,
          'event_id', p.event_id,
          'prediction_type', p.prediction_type,
          'predicted_value', p.predicted_value,
          'confidence_score', p.confidence_score,
          'reasoning', p.reasoning,
          'model_version', p.model_version,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) as prediction
        FROM predictions p
        WHERE p.event_id = e.id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) lp ON true
      WHERE e.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      if (!result.rows || result.rows.length === 0) return null;
      const row: any = result.rows[0];
      const eventWith: Event = {
        ...row,
        prediction: row.prediction || null,
        winner: row.prediction ? row.prediction.predicted_value : null,
      };
      return eventWith;
    } catch (error: any) {
      logger.error('Error finding event by ID with prediction', { error: error.message, id });
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
      status?: string;
      when?: 'upcoming' | 'past' | 'all';
      includePredictions?: boolean;
    },
    pagination: PaginationParams
  ): Promise<{ events: Event[]; total: number }> {
    // Build base query selecting event fields and latest prediction (winner)
    let query = `
      SELECT
        e.*,
        lp.prediction as prediction
      FROM events e
      LEFT JOIN LATERAL (
        SELECT json_build_object(
          'id', p.id,
          'event_id', p.event_id,
          'prediction_type', p.prediction_type,
          'predicted_value', p.predicted_value,
          'confidence_score', p.confidence_score,
          'reasoning', p.reasoning,
          'model_version', p.model_version,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) as prediction
        FROM predictions p
          WHERE p.event_id = e.id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) lp ON true
        WHERE 1=1
        AND e.is_archived = false
    `;

    const values: any[] = [];
    let paramCount = 1;

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

    if (filters.status) {
      query += ` AND e.status = $${paramCount++}`;
      values.push(filters.status);
    }

    // Handle 'when' filter relative to NOW()
    if (filters.when === 'upcoming') {
      query += ` AND e.event_date >= NOW()`;
    } else if (filters.when === 'past') {
      query += ` AND e.event_date < NOW()`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM (${query}) as filtered`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Ordering
    if (filters.when === 'upcoming') {
      query += ` ORDER BY e.event_date ASC`;
    } else if (filters.when === 'past') {
      query += ` ORDER BY e.event_date DESC`;
    } else {
      query += ` ORDER BY e.event_date DESC`;
    }

    // Pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(pagination.limit, pagination.offset);

    try {
      const result = await db.query(query, values);
      // Map rows into Event with nested prediction and winner field
      const events: Event[] = result.rows.map((r: any) => {
        const ev: Event = {
          id: r.id,
          event_ref: r.event_ref,
          sport: r.sport,
          league: r.league,
          home_team: r.home_team,
          away_team: r.away_team,
          event_date: r.event_date,
          venue: r.venue,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          is_archived: r.is_archived,
          prediction: r.prediction || null,
          winner: r.prediction ? r.prediction.predicted_value : null,
        };
        return ev;
      });

      return { events, total };
    } catch (error: any) {
      logger.error('Error finding events', { error: error.message, filters });
      throw error;
    }
  }

  async update(id: number, event: Partial<Event>): Promise<Event | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(event).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE events
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Error updating event', { error: error.message, id, event });
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM events WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error: any) {
      logger.error('Error deleting event', { error: error.message, id });
      throw error;
    }
  }

  async archiveOldEvents(retentionDays: number): Promise<number> {
    const query = `
      UPDATE events
      SET is_archived = true
      WHERE is_archived = false
        AND event_date < NOW() - INTERVAL '${retentionDays} days'
    `;
    try {
      const result = await db.query(query);
      return result.rowCount || 0;
    } catch (error: any) {
      logger.error('Error archiving events', { error: error.message, retentionDays });
      throw error;
    }
  }

  async getArchivedCount(): Promise<number> {
    const query = `SELECT COUNT(*) as cnt FROM events WHERE is_archived = true`;
    try {
      const result = await db.query(query);
      return parseInt(result.rows[0].cnt, 10);
    } catch (error: any) {
      logger.error('Error getting archived count', { error: error.message });
      throw error;
    }
  }
}

export default new EventRepository();
