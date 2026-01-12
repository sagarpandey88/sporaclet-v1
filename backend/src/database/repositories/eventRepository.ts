import db from '../connection';
import { Event } from '../../types';
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

  async findById(id: number): Promise<Event | null> {
    const query = 'SELECT * FROM events WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Error finding event by ID', { error: error.message, id });
      throw error;
    }
  }

  async findAll(filters: {
    sport?: string;
    league?: string;
    team?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Event[]> {
    let query = 'SELECT * FROM events WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters.sport) {
      query += ` AND sport = $${paramCount++}`;
      values.push(filters.sport);
    }

    if (filters.league) {
      query += ` AND league = $${paramCount++}`;
      values.push(filters.league);
    }

    if (filters.team) {
      query += ` AND (home_team = $${paramCount} OR away_team = $${paramCount})`;
      values.push(filters.team);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND event_date >= $${paramCount++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND event_date <= $${paramCount++}`;
      values.push(filters.endDate);
    }

    if (filters.status) {
      query += ` AND status = $${paramCount++}`;
      values.push(filters.status);
    }

    query += ' ORDER BY event_date ASC';

    try {
      const result = await db.query(query, values);
      return result.rows;
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
}

export default new EventRepository();
