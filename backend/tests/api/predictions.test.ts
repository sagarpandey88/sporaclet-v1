import request from 'supertest';
import app from '../../src/server';
import db from '../../src/database/connection';
import eventRepository from '../../src/database/repositories/eventRepository';
import predictionRepository from '../../src/database/repositories/predictionRepository';
import { generateEventRef } from '../../src/types';

describe('Predictions API', () => {
  let eventId: number;

  beforeAll(async () => {
    // Create a test event
    const eventDate = new Date('2026-01-15T15:00:00Z');
    const event = await eventRepository.create({
      event_ref: generateEventRef('Football', 'Manchester United', 'Liverpool', eventDate),
      sport: 'Football',
      league: 'Premier League',
      home_team: 'Manchester United',
      away_team: 'Liverpool',
      event_date: eventDate,
      venue: 'Old Trafford',
      status: 'SCHEDULED',
    });
    eventId = event.id;

    // Create test predictions
    await predictionRepository.create({
      event_id: eventId,
      prediction_type: 'WINNER',
      predicted_value: 'Manchester United',
      confidence_score: 75.5,
      reasoning: 'Home advantage and recent form',
      model_version: 'v1.0.0',
    });
  });

  afterAll(async () => {
    await db.close();
  });

  describe('GET /api/predictions', () => {
    it('should return paginated list of predictions', async () => {
      const response = await request(app).get('/api/predictions').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter predictions by sport', async () => {
      const response = await request(app)
        .get('/api/predictions')
        .query({ sport: 'Football' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((pred: any) => {
        expect(pred.event_id).toBeDefined();
      });
    });

    it('should filter predictions by prediction type', async () => {
      const response = await request(app)
        .get('/api/predictions')
        .query({ predictionType: 'WINNER' })
        .expect(200);

      response.body.data.forEach((pred: any) => {
        expect(pred.prediction_type).toBe('WINNER');
      });
    });

    it('should filter predictions by minimum confidence', async () => {
      const response = await request(app)
        .get('/api/predictions')
        .query({ minConfidence: 70 })
        .expect(200);

      response.body.data.forEach((pred: any) => {
        expect(pred.confidence_score).toBeGreaterThanOrEqual(70);
      });
    });

    it('should return 400 for invalid prediction type', async () => {
      const response = await request(app)
        .get('/api/predictions')
        .query({ predictionType: 'INVALID' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/predictions')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/predictions/:id', () => {
    it('should return prediction details by ID', async () => {
      // Get a prediction ID from the list
      const listResponse = await request(app).get('/api/predictions').expect(200);

      if (listResponse.body.data.length > 0) {
        const predictionId = listResponse.body.data[0].id;
        const response = await request(app).get(`/api/predictions/${predictionId}`).expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('event_id');
        expect(response.body.data).not.toHaveProperty('event');
      }
    });

    it('should return 404 for non-existent prediction', async () => {
      const response = await request(app).get('/api/predictions/999999').expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Prediction not found');
    });

    it('should return 400 for invalid prediction ID', async () => {
      const response = await request(app).get('/api/predictions/invalid').expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Invalid prediction ID');
    });
  });
});
