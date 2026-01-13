import eventRepository from '../database/repositories/eventRepository';
import { Event, PaginationParams, PaginatedResponse } from '../types';
import logger from './logger';

export class EventService {
  async getEvents(
    filters: any,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const { events, total } = await eventRepository.findAll(filters, pagination);

    const data = events.map((e) => {
      // Ensure event_date is a JS Date instance (db returns Date) and leave as-is; JSON serialization will produce UTC ISO
      return e;
    });

    const response: PaginatedResponse<Event> = {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };

    logger.info('Events retrieved', { total, page: pagination.page, limit: pagination.limit });
    return response;
  }

  async getEventById(id: number, options?: { includePredictions?: boolean }): Promise<Event | null> {
    const event = await eventRepository.findById(id, options);
    if (!event) return null;
    return event;
  }
}

export default new EventService();
