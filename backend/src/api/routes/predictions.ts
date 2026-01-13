import { Router, Request, Response } from 'express';
import predictionRepository from '../../database/repositories/predictionRepository';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { PaginatedResponse, Prediction } from '../../types';
import logger from '../../services/logger';

const router = Router();

/**
 * GET /api/predictions
 * List predictions with filtering and pagination
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
      predictionType,
      minConfidence,
      includeArchived = 'false',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const filters: any = {
      includeArchived: includeArchived === 'true',
    };

    if (sport) filters.sport = sport;
    if (league) filters.league = league;
    if (team) filters.team = team;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (predictionType) {
      if (!['WINNER', 'SCORE', 'OVER_UNDER'].includes(predictionType)) {
        throw new AppError('Invalid prediction type', 400);
      }
      filters.predictionType = predictionType;
    }
    if (minConfidence) {
      const minConf = parseFloat(minConfidence);
      if (isNaN(minConf) || minConf < 0 || minConf > 100) {
        throw new AppError('Invalid confidence score', 400);
      }
      filters.minConfidence = minConf;
    }

    const { predictions, total } = await predictionRepository.findAll(filters, {
      page: pageNum,
      limit: limitNum,
      offset,
    });

    const response: PaginatedResponse<Prediction> = {
      data: predictions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    logger.info('Predictions list retrieved', { total, page: pageNum, limit: limitNum });
    res.json(response);
  })
);

/**
 * GET /api/predictions/:id
 * Get prediction details by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const predictionId = parseInt(id, 10);

    if (isNaN(predictionId)) {
      throw new AppError('Invalid prediction ID', 400);
    }

    const prediction = await predictionRepository.findById(predictionId);

    if (!prediction) {
      throw new AppError('Prediction not found', 404);
    }

    logger.info('Prediction details retrieved', { id: predictionId });
    res.json({ data: prediction });
  })
);

export default router;
