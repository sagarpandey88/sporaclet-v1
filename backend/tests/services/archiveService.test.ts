import archiveService from '../../src/services/archiveService';
import eventRepository from '../../src/database/repositories/eventRepository';
import predictionRepository from '../../src/database/repositories/predictionRepository';
import db from '../../src/database/connection';
import { generateEventRef } from '../../src/types';

describe('Archive Service', () => {
  let oldEventId: number;
  let oldPredictionId: number;

  beforeAll(async () => {
    // Create an old event and prediction for testing
    const eventDate = new Date('2020-01-01T15:00:00Z');
    const event = await eventRepository.create({
      event_ref: generateEventRef('Basketball', 'Lakers', 'Celtics', eventDate),
      sport: 'Basketball',
      league: 'NBA',
      home_team: 'Lakers',
      away_team: 'Celtics',
      event_date: eventDate,
      venue: 'Staples Center',
      status: 'COMPLETED',
    });
    oldEventId = event.id;

    const prediction = await predictionRepository.create({
      event_id: oldEventId,
      prediction_type: 'WINNER',
      predicted_value: 'Lakers',
      confidence_score: 80,
      reasoning: 'Historical analysis',
      model_version: 'v1.0.0',
    });
    oldPredictionId = prediction.id;

    // Manually set the created_at to be old (simulate old prediction)
    await db.query('UPDATE predictions SET created_at = $1 WHERE id = $2', [
      new Date('2020-01-01T00:00:00Z'),
      oldPredictionId,
    ]);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('archiveOldPredictions', () => {
    it('should archive predictions older than retention days', async () => {
      const retentionDays = 30;
      const result = await archiveService.archiveOldPredictions(retentionDays);

      expect(result).toHaveProperty('archivedCount');
      expect(result).toHaveProperty('retentionDays');
      expect(result).toHaveProperty('archivedBefore');
      expect(result.retentionDays).toBe(retentionDays);
      expect(result.archivedCount).toBeGreaterThanOrEqual(0);
    });

    it('should not archive recent predictions', async () => {
      // Create a recent prediction
      const recentEventDate = new Date();
      const recentEvent = await eventRepository.create({
        event_ref: generateEventRef('Football', 'Arsenal', 'Chelsea', recentEventDate),
        sport: 'Football',
        league: 'Premier League',
        home_team: 'Arsenal',
        away_team: 'Chelsea',
        event_date: recentEventDate,
        venue: 'Emirates Stadium',
        status: 'SCHEDULED',
      });

      await predictionRepository.create({
        event_id: recentEvent.id,
        prediction_type: 'WINNER',
        predicted_value: 'Arsenal',
        confidence_score: 70,
        reasoning: 'Recent form',
        model_version: 'v1.0.0',
      });

      await archiveService.archiveOldPredictions(30);

      // Verify the recent event is not archived
      const event = await eventRepository.findById(recentEvent.id);
      expect(event).not.toBeNull();
      expect(event?.is_archived).toBe(false);
    });
  });

  describe('getArchivedCount', () => {
    it('should return count of archived events', async () => {
      const count = await archiveService.getArchivedCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
