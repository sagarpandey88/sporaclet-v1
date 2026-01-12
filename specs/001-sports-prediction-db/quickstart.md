# Quickstart: Sports Prediction Portal Backend API

**Date**: 2026-01-09  
**Feature**: Sports Prediction Portal Database & Backend API  
**Prerequisites**: Docker, Node.js 20+, npm/yarn

## Overview

This quickstart guide helps developers set up the local development environment for the backend API and understand core database workflows. **Note**: Frontend implementation is deferred to a separate feature specification.

## Setup

### 1. Prerequisites

Ensure you have the following installed:
- Node.js 20+ (LTS)
- Docker and Docker Compose
- Git
- A PostgreSQL client (optional: psql, pgAdmin, or DBeaver)

### 2. Clone and Install

```bash
# Clone the repository (if not already)
git checkout 001-sports-prediction-db

# Install backend dependencies
cd backend
npm install
```

### 3. Start Local Services

```bash
# From repository root
docker-compose up -d

# This starts:
# - PostgreSQL 16 on localhost:5432
# - Redis 7 on localhost:6379
```

### 4. Configure Environment

```bash
# backend/.env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/sporaclet
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
DATA_DIR=/workspaces/sporaclet-v1/data  # Location for events.json and predictions.json
```

### 5. Run Migrations

```bash
cd backend
npm run migrate

# Expected output:
# ✓ Running migration 001_create_events_and_predictions.sql
# ✓ Running migration 002_create_archive_tables.sql
# ✓ Migrations completed successfully
```

### 6. Seed Database (Optional)

```bash
npm run seed

# Seeds sample events and predictions for testing
```

### 7. Start Backend Server

```bash
npm run dev

# Server runs on http://localhost:3000
# API available at http://localhost:3000/api/v1
```

## Key Workflows

### Workflow 1: Insert Event and Prediction (Manual for MVP)

Since AI prediction generation is out of scope, use direct SQL or a future admin endpoint:

```sql
-- Insert event with JSONB participants
INSERT INTO events (sport_type, event_name, participants, scheduled_at, event_status, location, metadata)
VALUES (
  'Soccer',
  'La Liga: Barcelona vs Real Madrid',
  '[{"name": "FC Barcelona", "id": "team_bar", "role": "home"}, {"name": "Real Madrid", "id": "team_rm", "role": "away"}]'::jsonb,
  '2026-01-25 20:00:00+00',
  'upcoming',
  'Camp Nou',
  '{"league": "La Liga", "round": 22}'::jsonb
) RETURNING id;

-- Insert prediction (assuming event id = 4)
INSERT INTO predictions (event_id, predicted_outcome, confidence_score, analysis_details, ai_model, model_version)
VALUES (
  4,
  'Barcelona wins 3-1',
  78.50,
  '{"key_factors": ["Home advantage", "Recent form"], "reasoning": "Barcelona dominant at home"}'::jsonb,
  'gpt-4-turbo',
  '2024-01-15'
);
```

### Workflow 2: Query Active Predictions (Backend API)

**TypeScript Query Function**:

```typescript
// backend/src/database/queries/predictions.ts
import { Pool } from 'pg';

export interface PredictionListItem {
  event_id: number;
  sport_type: string;
  event_name: string;
  participants: Array<{ name: string; id: string; role?: string; [key: string]: any }>;
  scheduled_at: Date;
  prediction_id: number;
  predicted_outcome: string;
  confidence_score: number;
}

export async function getActivePredictions(
  pool: Pool,
  page: number = 1,
  limit: number = 20
): Promise<PredictionListItem[]> {
  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      e.id AS event_id,
      e.sport_type,
      e.event_name,
      e.participants,
      e.scheduled_at,
      p.id AS prediction_id,
      p.predicted_outcome,
      p.confidence_score
    FROM events e
    INNER JOIN predictions p ON e.id = p.event_id
    WHERE e.is_active = true 
      AND p.is_active = true
      AND e.event_status = 'upcoming'
      AND e.scheduled_at >= NOW()
    ORDER BY e.scheduled_at ASC
    LIMIT $1 OFFSET $2
  `;

  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}
```

**API Endpoint** (`backend/src/api/routes/predictions.ts`):

```typescript
import express from 'express';
import { getActivePredictions } from '../database/queries/predictions';
import { pool } from '../database/pool';

const router = express.Router();

router.get('/predictions', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const predictions = await getActivePredictions(pool, page, limit);

    res.json({
      data: predictions,
      pagination: {
        page,
        limit,
        total: predictions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Workflow 3: Get Prediction Detail by ID

**TypeScript Query Function**:

```typescript
// backend/src/database/queries/predictions.ts
export interface PredictionDetail {
  prediction_id: number;
  predicted_outcome: string;
  confidence_score: number;
  analysis_details: Record<string, any>;
  ai_model: string;
  model_version: string;
  created_at: Date;
  event: {
    event_id: number;
    sport_type: string;
    event_name: string;
    participants: Array<{ name: string; id: string; [key: string]: any }>;
    scheduled_at: Date;
    event_status: string;
    location: string | null;
    metadata: Record<string, any>;
  };
}

export async function getPredictionById(
  pool: Pool,
  predictionId: number
): Promise<PredictionDetail | null> {
  const query = `
    SELECT 
      p.id AS prediction_id,
      p.predicted_outcome,
      p.confidence_score,
      p.analysis_details,
      p.ai_model,
      p.model_version,
      p.created_at,
      e.id AS event_id,
      e.sport_type,
      e.event_name,
      e.participants,
      e.scheduled_at,
      e.event_status,
      e.location,
      e.metadata
    FROM predictions p
    INNER JOIN events e ON p.event_id = e.id
    WHERE p.id = $1 
      AND p.is_active = true
      AND e.is_active = true
  `;

  const result = await pool.query(query, [predictionId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    prediction_id: row.prediction_id,
    predicted_outcome: row.predicted_outcome,
    confidence_score: parseFloat(row.confidence_score),
    analysis_details: row.analysis_details,
    ai_model: row.ai_model,
    model_version: row.model_version,
    created_at: row.created_at,
    event: {
      event_id: row.event_id,
      sport_type: row.sport_type,
      event_name: row.event_name,
      participants: row.participants,
      scheduled_at: row.scheduled_at,
      event_status: row.event_status,
      location: row.location,
      metadata: row.metadata
    }
  };
}
```

### Workflow 4: Archive Events Older than 30 Days

**TypeScript Service Function**:

```typescript
// backend/src/services/archive.ts
import { Pool } from 'pg';

export async function archiveOldEvents(pool: Pool): Promise<number> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insert events into archive
    const eventsResult = await client.query(`
      INSERT INTO events_archive 
      SELECT *, NOW() AS archived_at
      FROM events
      WHERE scheduled_at < NOW() - INTERVAL '30 days'
        AND is_active = true
    `);

    // Insert predictions into archive
    await client.query(`
      INSERT INTO predictions_archive 
      SELECT p.*, NOW() AS archived_at
      FROM predictions p
      INNER JOIN events e ON p.event_id = e.id
      WHERE e.scheduled_at < NOW() - INTERVAL '30 days'
        AND e.is_active = true
    `);

    // Soft delete from active tables
    await client.query(`
      UPDATE events 
      SET is_active = false, updated_at = NOW()
      WHERE scheduled_at < NOW() - INTERVAL '30 days'
        AND is_active = true
    `);

    await client.query(`
      UPDATE predictions 
      SET is_active = false
      WHERE event_id IN (
        SELECT id FROM events 
        WHERE scheduled_at < NOW() - INTERVAL '30 days'
      )
    `);

    await client.query('COMMIT');

    return eventsResult.rowCount || 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Scheduled Job** (using cron or node-cron):

```typescript
// backend/src/jobs/archive.ts
import cron from 'node-cron';
import { archiveOldEvents } from '../services/archive';
import { pool } from '../database/pool';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running archive job...');
  try {
    const archivedCount = await archiveOldEvents(pool);
    console.log(`Archived ${archivedCount} events`);
  } catch (error) {
    console.error('Archive job failed:', error);
  }
});
```

### Workflow 5: Data Ingestion from JSON Files

**Purpose**: Import events and predictions from external JSON files on a schedule (e.g., from AI prediction service output).

**JSON File Format** (`data/events.json`):

```json
[
  {
    "sport_type": "Soccer",
    "event_name": "Champions League: PSG vs Bayern Munich",
    "participants": [
      {"name": "Paris Saint-Germain", "id": "team_psg", "role": "home"},
      {"name": "Bayern Munich", "id": "team_fcb", "role": "away"}
    ],
    "scheduled_at": "2026-02-10T20:00:00Z",
    "event_status": "upcoming",
    "location": "Parc des Princes",
    "metadata": {
      "tournament": "UEFA Champions League",
      "round": "Round of 16"
    }
  }
]
```

**JSON File Format** (`data/predictions.json`):

```json
[
  {
    "event_reference": "Champions League: PSG vs Bayern Munich",
    "predicted_outcome": "Bayern Munich wins 2-1",
    "confidence_score": 71.25,
    "analysis_details": {
      "key_factors": ["Bayern's away record", "PSG injury concerns"],
      "reasoning": "Bayern Munich strong in knockout stages"
    },
    "ai_model": "gpt-4-turbo",
    "model_version": "2024-01-15"
  }
]
```

**TypeScript Ingestion Service**:

```typescript
// backend/src/services/ingestion.ts
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Helper function to generate unique event_ref
function generateEventRef(eventName: string, scheduledAt: string): string {
  const input = `${eventName}|${scheduledAt}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

interface EventInput {
  sport_type: string;
  event_name: string;
  participants: Array<{ name: string; id: string; role?: string; [key: string]: any }>;
  scheduled_at: string;
  event_status: string;
  location?: string;
  metadata?: Record<string, any>;
}

interface PredictionInput {
  event_reference: string;  // Match by event_name
  predicted_outcome: string;
  confidence_score: number;
  analysis_details: Record<string, any>;
  ai_model: string;
  model_version: string;
}

export async function ingestEvents(
  pool: Pool,
  filePath: string
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const events: EventInput[] = JSON.parse(fileContent);

    for (const event of events) {
      try {
        // Validate required fields
        if (!event.sport_type || !event.event_name || !event.participants || !event.scheduled_at) {
          errors.push(`Invalid event: ${event.event_name || 'unknown'} - missing required fields`);
          continue;
        }

        // Generate unique event_ref
        const eventRef = generateEventRef(event.event_name, event.scheduled_at);

        // Insert event (ON CONFLICT event_ref prevents duplicates)
        await pool.query(
          `INSERT INTO events (event_ref, sport_type, event_name, participants, scheduled_at, event_status, location, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (event_ref) DO NOTHING`,
          [
            eventRef,
            event.sport_type,
            event.event_name,
            JSON.stringify(event.participants),
            event.scheduled_at,
            event.event_status || 'upcoming',
            event.location || null,
            JSON.stringify(event.metadata || {})
          ]
        );

        imported++;
      } catch (err: any) {
        errors.push(`Failed to import event ${event.event_name}: ${err.message}`);
      }
    }

    return { imported, errors };
  } catch (err: any) {
    throw new Error(`Failed to read events file: ${err.message}`);
  }
}

export async function ingestPredictions(
  pool: Pool,
  filePath: string
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const predictions: PredictionInput[] = JSON.parse(fileContent);

    for (const prediction of predictions) {
      try {
        // Validate required fields
        if (!prediction.event_reference || !prediction.predicted_outcome || !prediction.ai_model) {
          errors.push(`Invalid prediction for event: ${prediction.event_reference || 'unknown'}`);
          continue;
        }

        // Find event by name
        const eventResult = await pool.query(
          'SELECT id FROM events WHERE event_name = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
          [prediction.event_reference]
        );

        if (eventResult.rows.length === 0) {
          errors.push(`Event not found: ${prediction.event_reference}`);
          continue;
        }

        const eventId = eventResult.rows[0].id;

        // Insert prediction
        await pool.query(
          `INSERT INTO predictions (event_id, predicted_outcome, confidence_score, analysis_details, ai_model, model_version)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            eventId,
            prediction.predicted_outcome,
            prediction.confidence_score,
            JSON.stringify(prediction.analysis_details || {}),
            prediction.ai_model,
            prediction.model_version
          ]
        );

        imported++;
      } catch (err: any) {
        errors.push(`Failed to import prediction for ${prediction.event_reference}: ${err.message}`);
      }
    }

    return { imported, errors };
  } catch (err: any) {
    throw new Error(`Failed to read predictions file: ${err.message}`);
  }
}
```

**Scheduled Ingestion Job**:

```typescript
// backend/src/jobs/ingest-data.ts
import cron from 'node-cron';
import { ingestEvents, ingestPredictions } from '../services/ingestion';
import { pool } from '../database/pool';
import path from 'path';

// Run every hour to check for new data files
cron.schedule('0 * * * *', async () => {
  console.log('Running data ingestion job...');

  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
  const eventsFile = path.join(dataDir, 'events.json');
  const predictionsFile = path.join(dataDir, 'predictions.json');

  try {
    // Ingest events first
    const eventsResult = await ingestEvents(pool, eventsFile);
    console.log(`Ingested ${eventsResult.imported} events`);
    if (eventsResult.errors.length > 0) {
      console.error('Event ingestion errors:', eventsResult.errors);
    }

    // Then ingest predictions
    const predictionsResult = await ingestPredictions(pool, predictionsFile);
    console.log(`Ingested ${predictionsResult.imported} predictions`);
    if (predictionsResult.errors.length > 0) {
      console.error('Prediction ingestion errors:', predictionsResult.errors);
    }

    // Optional: Archive or move processed files
    // await fs.rename(eventsFile, `${eventsFile}.${Date.now()}.processed`);
  } catch (error: any) {
    console.error('Data ingestion job failed:', error.message);
  }
});
```

**Configuration** (`backend/.env`):

```bash
DATA_DIR=/path/to/data/files
# Files expected: events.json, predictions.json
```

### Workflow 6: Working with JSONB Participants

**Extract Participant Names**:

```typescript
// backend/src/database/queries/events.ts
export async function getEventParticipants(
  pool: Pool,
  eventId: number
): Promise<Array<{ name: string; id: string; role?: string }>> {
  const query = `
    SELECT 
      participant->>'name' AS name,
      participant->>'id' AS id,
      participant->>'role' AS role
    FROM events e,
         jsonb_array_elements(e.participants) AS participant
    WHERE e.id = $1
  `;

  const result = await pool.query(query, [eventId]);
  return result.rows;
}
```

**Search by Participant**:

```typescript
// backend/src/database/queries/events.ts
export async function searchEventsByParticipant(
  pool: Pool,
  participantName: string
): Promise<any[]> {
  const query = `
    SELECT e.*
    FROM events e
    WHERE e.participants @> $1::jsonb
      AND e.is_active = true
    ORDER BY e.scheduled_at DESC
    LIMIT 50
  `;

  const searchParam = JSON.stringify([{ name: participantName }]);
  const result = await pool.query(query, [searchParam]);
  return result.rows;
}
```

## TDD Workflow Example

### Test-First Approach (Principle II: Test-First Development)

**1. Write Contract Test First**:

```typescript
// backend/tests/contract/predictions.test.ts
import request from 'supertest';
import app from '../../src/server';

describe('GET /api/v1/predictions', () => {
  it('should return 200 with predictions and pagination', async () => {
    const response = await request(app)
      .get('/api/v1/predictions?page=1&limit=20')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination.page).toBe(1);
  });

  it('should validate page and limit parameters', async () => {
    const response = await request(app)
      .get('/api/v1/predictions?page=abc&limit=-5')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});
```

**2. Run Test (should fail)**:

```bash
npm test -- predictions.test.ts
# Expected: Test fails (endpoint not implemented)
```

**3. Implement Minimal Code**:

Implement `getActivePredictions()` query and API endpoint (shown in Workflow 2).

**4. Run Test Again (should pass)**:

```bash
npm test -- predictions.test.ts
# Expected: Tests pass
```

## Database Connection Pool Configuration

```typescript
// backend/src/database/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sporaclet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  min: 10,  // Minimum connections
  max: 50,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 100,  // 100ms timeout per constitution
});

pool.on('error', (err) => {
  console.error('Unexpected pool error', err);
  process.exit(-1);
});
```

## Testing Strategy

### 1. Contract Tests (API)

Test API contracts match OpenAPI spec:

```bash
npm run test:contract
```

### 2. Integration Tests (Database)

Test SQL queries with pg-mem (in-memory PostgreSQL):

```typescript
// backend/tests/integration/database.test.ts
import { newDb } from 'pg-mem';

describe('Database Queries', () => {
  let db: any;
  let pool: any;

  beforeEach(() => {
    db = newDb();
    pool = db.adapters.createPg().Pool;
    // Run migrations on in-memory DB
  });

  it('should fetch active predictions', async () => {
    // Test getActivePredictions() query
  });
});
```

### 3. Unit Tests (Business Logic)

Test services and controllers in isolation:

```bash
npm run test:unit
```

## Troubleshooting

### Connection Refused (PostgreSQL)

```bash
# Check if Docker containers are running
docker ps

# Restart containers
docker-compose restart postgres redis
```

### Migration Errors

```bash
# Rollback last migration
npm run migrate:down

# Re-run migrations
npm run migrate
```

### Query Performance Issues

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT e.id, e.sport_type, p.predicted_outcome
FROM events e
INNER JOIN predictions p ON e.id = p.event_id
WHERE e.is_active = true AND e.scheduled_at >= NOW()
ORDER BY e.scheduled_at ASC
LIMIT 20;

-- Expected: Should use idx_events_active_scheduled
```

## Next Steps

1. **Implement all API endpoints** following TDD workflow
2. **Add Redis caching** for frequently accessed predictions
3. **Set up rate limiting middleware** (100 requests/15min per constitution)
4. **Configure CI/CD** for automated testing
5. **Frontend implementation** will be addressed in a separate feature specification

## Resources

- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/16/datatype-json.html)
- [node-postgres (pg) Guide](https://node-postgres.com/)
- [Redis Quick Start](https://redis.io/docs/getting-started/)
- [Supertest API Testing](https://github.com/visionmedia/supertest)
- [OpenAPI Specification](https://swagger.io/specification/)
