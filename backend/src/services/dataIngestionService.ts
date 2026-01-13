import fs from 'fs';
import eventRepository from '../database/repositories/eventRepository';
import predictionRepository from '../database/repositories/predictionRepository';
import logger from './logger';
//import { generateEventRef } from '../types';

interface Participant {
  name: string;
  id?: string;
  role?: string;
}

interface EventData {
  event_ref: string;
  sport_type?: string;
  league?: string;
  home_team?: string;
  away_team?: string;
  event_date?: string;
  scheduled_at?: string;
  participants?: Participant[];
  event_name?: string;
  location?: string;
  venue?: string;
  event_status?: string;
  status?: string;//'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
}

interface PredictionData {
  // Either reference the event by index (legacy) or by event_ref
  event_index?: number;
  event_ref?: string;
  prediction_type?: 'WINNER' | 'SCORE' | 'OVER_UNDER';
  // may be `predicted_outcome` or `predicted_value`
  predicted_value?: string;
  predicted_outcome?: string;
  confidence_score?: number;
  reasoning?: string;
  analysis_details?: any;
  model_version?: string;
}

export class DataIngestionService {
  /**
   * Load events from JSON file
   * @param filePath Path to events JSON file
   * @returns Array of created event IDs
   */
  async loadEvents(filePath: string): Promise<any[]> {
    try {
      logger.info('Loading events from file', { filePath });

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const events: EventData[] = JSON.parse(fileContent);

      const createdEvents: any[] = [];

      for (const eventData of events) {
        // pick date from scheduled_at or event_date
        const dateStr = eventData.scheduled_at ?? eventData.event_date ?? '';
        const eventDate = new Date(dateStr);

        if (isNaN(eventDate.getTime())) {
          logger.warn('Skipping event with invalid or missing date', { event: eventData });
          continue;
        }

        // determine home/away from explicit fields or participants array or event_name
        const homeTeam = eventData.home_team
          ?? eventData.participants?.find(p => (p.role || '').toLowerCase() === 'home')?.name
          ?? eventData.participants?.[0]?.name
          ?? eventData.event_name?.split(' vs ')[0]
          ?? 'unknown';

        const awayTeam = eventData.away_team
          ?? eventData.participants?.find(p => (p.role || '').toLowerCase() === 'away')?.name
          ?? eventData.participants?.[1]?.name
          ?? eventData.event_name?.split(' vs ')[1]
          ?? 'unknown';

        const sport = eventData.sport_type ?? 'unknown';
        const league = eventData.league ?? eventData.location ?? eventData.event_name ?? '';

       // const eventRef = generateEventRef(sport, homeTeam, awayTeam, eventDate);

        const event = await eventRepository.create({
          event_ref: eventData.event_ref,
          sport,
          league: league || 'NA',
          home_team: homeTeam,
          away_team: awayTeam,
          event_date: eventDate,
          venue: eventData.venue ?? eventData.location ?? null,
          status: eventData.status ?? (eventData.event_status ? (
            (eventData.event_status as string).toLowerCase() === 'upcoming' ? 'SCHEDULED' : (eventData.event_status as string).toUpperCase()
          ) : 'SCHEDULED'),
        });
        createdEvents.push(event);
        logger.debug('Event created', { id: event.id, event_ref: event.event_ref });
      }

      logger.info('Events loaded successfully', { count: createdEvents.length });
      return createdEvents;
    } catch (error: any) {
      logger.error('Error loading events', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Load predictions from JSON file
   * @param filePath Path to predictions JSON file
   * @param eventIds Array of event IDs (should match event_index in predictions)
   * @returns Array of created prediction IDs
   */
  async loadPredictions(filePath: string, events: any[]): Promise<number[]> {
    try {
      logger.info('Loading predictions from file', { filePath });

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const predictions: PredictionData[] = JSON.parse(fileContent);

      const predictionIds: number[] = [];

      for (const predData of predictions) {
        let eventId: number = 0;

        if (predData.event_ref) {
          const evt = events.find(e => e.event_ref === predData.event_ref);
          if (!evt) {
            logger.warn('No matching event found for prediction event_ref', { event_ref: predData.event_ref });
            continue;
          }
          eventId = evt.id;
        } else if (predData.event_index !== undefined) {
          if (predData.event_index >= events.length) {
            logger.warn('Invalid event_index in prediction', { event_index: predData.event_index });
            continue;
          }
          eventId = events[predData.event_index].id;
        } else {
          logger.warn('Prediction missing event reference (event_ref or event_index)', { prediction: predData });
          continue;
        }

        const predictedValue = predData.predicted_value ?? predData.predicted_outcome ?? '';
        const confidence = typeof predData.confidence_score === 'number' ? predData.confidence_score : 0;
        const reasoning = predData.reasoning ?? predData.analysis_details?.reasoning ?? JSON.stringify(predData.analysis_details ?? {});
        const modelVersion = predData.model_version ?? 'ingest-1';
        const predictionType = predData.prediction_type ?? 'WINNER';

        const prediction = await predictionRepository.create({
          event_id: eventId,
          prediction_type: predictionType as any,
          predicted_value: predictedValue,
          confidence_score: confidence,
          reasoning,
          model_version: modelVersion,
        });
        predictionIds.push(prediction.id);
        logger.debug('Prediction created', { id: prediction.id, event_id: eventId });
      }

      logger.info('Predictions loaded successfully', { count: predictionIds.length });
      return predictionIds;
    } catch (error: any) {
      logger.error('Error loading predictions', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Load both events and predictions from JSON files
   * @param eventsPath Path to events JSON file
   * @param predictionsPath Path to predictions JSON file
   */
  async loadData(eventsPath: string, predictionsPath: string) {
    try {
      logger.info('Starting data ingestion', { eventsPath, predictionsPath });

      const events = await this.loadEvents(eventsPath);
      const predictionIds = await this.loadPredictions(predictionsPath, events);

      const eventIds = events.map(e => e.id);

      logger.info('Data ingestion completed', {
        eventsCount: eventIds.length,
        predictionsCount: predictionIds.length,
      });

      return { events, eventIds, predictionIds };
    } catch (error: any) {
      logger.error('Data ingestion failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }
}

export default new DataIngestionService();
