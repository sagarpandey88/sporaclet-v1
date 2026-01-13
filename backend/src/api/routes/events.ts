import { Router, Request, Response } from 'express';
import eventService from '../../services/eventService';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { PaginatedResponse, Event } from '../../types';
import logger from '../../services/logger';

const router = Router();

/**
 * GET /api/events
 * List events with filters, when (upcoming|past|all), pagination and optional predictions
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      sport,
      league,
      team,
      startDate,
      endDate,
      status,
      when = 'all',
      includePredictions = 'true',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    if (!['upcoming', 'past', 'all'].includes(when)) {
      throw new AppError('Invalid value for when parameter', 400);
    }

    const filters: any = {
      when: when as 'upcoming' | 'past' | 'all',
      includePredictions: includePredictions !== 'false',
    };

    if (sport) filters.sport = sport;
    if (league) filters.league = league;
    if (team) filters.team = team;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;

    const response: PaginatedResponse<Event> = await eventService.getEvents(filters, {
      page: pageNum,
      limit: limitNum,
      offset,
    });

    logger.info('Events list retrieved', { total: response.pagination.total, page: pageNum, limit: limitNum });
    res.json(response);
  })
);

/**
 * GET /api/events/:id
 * Get event detail by id with optional includePredictions
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { includePredictions = 'true' } = req.query as Record<string, string>;

    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      throw new AppError('Invalid event ID', 400);
    }

    const event = await eventService.getEventById(eventId, {
      includePredictions: includePredictions !== 'false',
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    logger.info('Event details retrieved', { id: eventId });
    res.json({ data: event });
  })
);

export default router;
