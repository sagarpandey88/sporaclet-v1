export interface Prediction {
  id: number;
  event_id: number;
  prediction_type: 'WINNER' | 'SCORE' | 'OVER_UNDER';
  predicted_value: string;
  confidence_score: number;
  reasoning: string;
  model_version: string;
  created_at: Date;
  updated_at: Date;
  is_archived: boolean;
}

export interface Event {
  id: number;
  event_ref: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  event_date: Date;
  venue: string | null;
  status: string;//'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  created_at: Date;
  updated_at: Date;
}

export interface PredictionWithEvent extends Prediction {
  event: Event;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PredictionsListQuery {
  sport?: string;
  league?: string;
  team?: string;
  startDate?: string;
  endDate?: string;
  predictionType?: 'WINNER' | 'SCORE' | 'OVER_UNDER';
  minConfidence?: number;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface ArchiveJobResult {
  archivedCount: number;
  retentionDays: number;
  archivedBefore: Date;
}

/**
 * Generate a unique event reference hash from event details
 * Used for duplicate detection during data ingestion
 * @param sport Sport type
 * @param homeTeam Home team name
 * @param awayTeam Away team name
 * @param eventDate Event date
 * @returns SHA256 hash as event_ref
 */
export function generateEventRef(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  eventDate: Date
): string {
  const crypto = require('crypto');
  const data = `${sport}|${homeTeam}|${awayTeam}|${eventDate.toISOString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
