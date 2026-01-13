# Research: Sports Prediction Portal Backend

**Date**: 2026-01-09  
**Feature**: Sports Prediction Portal Database & Backend API  
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Overview

This research document addresses key technical decisions for implementing a high-performance backend API with denormalized PostgreSQL database schema for sports predictions with the following requirements:
- Query performance <100ms for active predictions
- Sport-agnostic schema supporting any sport type (using JSONB for flexible participants)
- 30-day archival strategy for old events
- Denormalized structure for read optimization
- Direct SQL access (no ORM per constitution)
- **Backend API only** (frontend deferred to next phase)

## Research Areas

### 1. PostgreSQL Schema Design for Denormalized Data with JSONB Participants

**Question**: What is the optimal PostgreSQL schema design for denormalized event and prediction data with JSONB for both participants and metadata?

**Decision**: Use two primary tables (events, predictions) with JSONB columns for participants and flexible metadata, supplemented with archive tables using separate archive tables (not partitioning for MVP).

**Rationale**:
- **JSONB for participants**: Enables flexible structure for different sports - teams (with home/away roles), individual players (with rankings), or other participant types without schema changes
- **JSONB for metadata**: Sport-specific data (league, tournament, venue details) stored in metadata field
- **Denormalization strategy**: Store participant objects directly in events.participants JSONB array; store full analysis in predictions.analysis_details
- **Soft deletes**: Use `is_active` boolean flag rather than hard deletes for events with incomplete data
- **UTC timestamps**: Store all timestamps as `TIMESTAMP WITH TIME ZONE` in UTC for consistency

**Alternatives Considered**:
- TEXT field for participants - Rejected: Difficult to parse and query, no structured data
- Fully normalized schema with separate participants/teams tables - Rejected: Adds join complexity and violates denormalization requirement
- NoSQL (MongoDB) - Rejected: PostgreSQL mandated per constitution and project requirements
- Separate tables per sport type - Rejected: Violates sport-agnostic requirement

**Best Practices**:
- Use JSONB arrays for participants: `[{"name": "Team A", "id": "team_123", "role": "home"}, {...}]`
- GIN indexes on JSONB enable efficient searches: `WHERE participants @> '[{"name": "Liverpool"}]'::jsonb`
- Use explicit data types (INTEGER, VARCHAR, TIMESTAMP WITH TIME ZONE, JSONB) rather than generic TEXT everywhere
- Add CHECK constraints for data integrity (e.g., confidence_score BETWEEN 0 AND 100)
- Use SERIAL or BIGSERIAL for primary keys (auto-incrementing integers)
- Include created_at, updated_at timestamps on all tables for audit trails

### 2. Indexing Strategy for <100ms Query Performance

**Question**: Which indexes are required to meet the <100ms query performance goal for listing active predictions?

**Decision**: Implement composite indexes on frequently queried columns and GIN indexes on JSONB metadata.

**Rationale**:
- **Primary queries**:
  - List active predictions: Filter by event.scheduled_at (future dates), event.is_active, prediction.is_active
  - Detail view: Filter by prediction.id or event.id
  - Archive process: Filter by event.scheduled_at (>30 days old)

**Required Indexes**:
```sql
-- Events table
CREATE INDEX idx_events_active_scheduled ON events (scheduled_at DESC, is_active) WHERE is_active = true;
CREATE INDEX idx_events_archive_candidates ON events (scheduled_at) WHERE is_active = true;
CREATE INDEX idx_events_sport_type ON events (sport_type);
CREATE INDEX idx_events_participants_gin ON events USING gin (participants);  -- For participant searches
CREATE INDEX idx_events_metadata_gin ON events USING gin (metadata jsonb_path_ops);

-- Predictions table
CREATE INDEX idx_predictions_event_active ON predictions (event_id, is_active) WHERE is_active = true;
CREATE INDEX idx_predictions_created_at ON predictions (created_at DESC);
CREATE INDEX idx_predictions_analysis_gin ON predictions USING gin (analysis_details jsonb_path_ops);
```

**Alternatives Considered**:
- Full-text search indexes (tsvector) - Deferred: Not required for MVP; search is out of scope
- Materialized views for prediction lists - Deferred: Adds complexity; test simple indexes first
- Partitioning by sport_type - Rejected: Sport-agnostic requirement means uniform query patterns

**Best Practices**:
- Use partial indexes with WHERE clauses to reduce index size and improve performance
- DESC order on date columns for "most recent first" queries
- jsonb_path_ops for GIN indexes when only using @> operator (faster, smaller)
- Monitor query plans with EXPLAIN ANALYZE to validate index usage

### 3. Archival Strategy: Partitioning vs Separate Archive Tables

**Question**: Should we use PostgreSQL table partitioning or separate archive tables for 30-day-old events?

**Decision**: Use separate archive tables (events_archive, predictions_archive) with periodic migration via scheduled job.

**Rationale**:
- **Simplicity**: Separate tables are easier to understand and implement than partitioning
- **Query isolation**: Active queries never touch archive data, ensuring consistent performance
- **Storage flexibility**: Archive tables can use different tablespaces or compression settings
- **MVP-friendly**: Can be implemented with simple SQL INSERT...SELECT and DELETE operations

**Implementation Approach**:
```sql
-- Archive tables mirror active tables
CREATE TABLE events_archive (LIKE events INCLUDING ALL);
CREATE TABLE predictions_archive (LIKE predictions INCLUDING ALL);

-- Archive process (cron job or scheduled function)
-- 1. Copy events older than 30 days to archive
INSERT INTO events_archive SELECT * FROM events WHERE scheduled_at < NOW() - INTERVAL '30 days';
-- 2. Copy associated predictions to archive  
INSERT INTO predictions_archive SELECT * FROM predictions WHERE event_id IN (...);
-- 3. Delete from active tables
DELETE FROM predictions WHERE event_id IN (...);
DELETE FROM events WHERE id IN (...);
```

**Alternatives Considered**:
- PostgreSQL declarative partitioning by scheduled_at - Considered but deferred: More complex setup, better for future scale
- Soft delete with is_archived flag - Rejected: Still pollutes active queries with archived data
- Time-series database (TimescaleDB) - Rejected: Adds dependency complexity for MVP

**Best Practices**:
- Use transactions for archive operations to ensure data integrity
- Add indexes to archive tables for historical queries
- Implement archive as idempotent process (can run multiple times safely)
- Log archive operations for audit trail
- Consider VACUUM ANALYZE after large deletes to reclaim space

### 4. PostgreSQL Connection Pooling with node-postgres

**Question**: How should we configure node-postgres (pg) connection pooling for 1000+ concurrent read requests?

**Decision**: Use node-postgres Pool with configuration: min 10, max 50 connections, idle timeout 30s.

**Rationale**:
- **Connection pooling**: Reusing connections reduces overhead of establishing new PostgreSQL connections
- **Pool sizing**: Max 50 connections balances concurrency (1000 requests) with PostgreSQL limits (default 100 connections)
- **Idle timeout**: 30s releases unused connections while maintaining pool for bursts

**Configuration**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: 10,                    // Minimum pool size
  max: 50,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for acquiring connection
  statement_timeout: 100,     // Query timeout (100ms target)
});
```

**Alternatives Considered**:
- Direct database connections - Rejected: Poor performance under load
- PgBouncer external pooler - Deferred: Adds deployment complexity; use if needed later
- Higher max connections (100+) - Avoided: PostgreSQL performance degrades with too many connections

**Best Practices**:
- Use parameterized queries ($1, $2) to prevent SQL injection
- Always release connections after use (try/finally blocks)
- Monitor pool metrics (active, idle, waiting connections)
- Set statement_timeout to enforce query performance SLA

### 5. Redis Caching Strategy for Query Performance

**Question**: Which queries should be cached in Redis to reduce database load?

**Decision**: Cache prediction list queries with 5-minute TTL; cache individual predictions with 15-minute TTL.

**Rationale**:
- **List queries**: High-traffic endpoint, relatively static within 5 minutes
- **Detail queries**: Moderate traffic, predictions don't change frequently
- **Skip caching**: Archive queries (low volume), write operations (require consistency)

**Cache Key Strategy**:
```typescript
// List cache key format
`predictions:list:page:{page}:limit:{limit}`

// Detail cache key format
`prediction:detail:{id}`

// Invalidation: On prediction update/create, invalidate:
// - Specific prediction detail cache
// - All list caches (simpler than selective invalidation)
```

**Best Practices**:
- Use Redis GET before querying PostgreSQL
- Set TTL on all cache keys to prevent stale data
- Implement cache-aside pattern (application manages cache)
- Monitor cache hit rate; adjust TTLs based on traffic patterns
- Use Redis SETEX for atomic set-with-expiry

### 6. Rate Limiting Implementation with Redis

**Question**: How to implement per-IP and per-user rate limiting per constitutional requirements?

**Decision**: Use Redis sliding window counter algorithm with separate keys for public and authenticated requests.

**Rationale**:
- **Constitutional requirement**: 100 req/15min (public), 1000 req/15min (authenticated)
- **Sliding window**: More accurate than fixed window, prevents burst at window boundaries
- **Redis atomicity**: INCR and EXPIRE are atomic, safe for concurrent requests

**Implementation**:
```typescript
// Rate limit key format
`ratelimit:{ip}:{window_start_minute}`

// Algorithm (simplified):
const key = `ratelimit:${ip}:${Math.floor(Date.now() / 60000)}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 900); // 15 minutes
if (count > 100) throw new RateLimitError();
```

**Alternatives Considered**:
- Token bucket algorithm - Deferred: More complex, sliding window sufficient for MVP
- API Gateway rate limiting (nginx) - Considered: Could complement application-level limits
- Database-based rate limiting - Rejected: Too slow, defeats purpose

**Best Practices**:
- Return 429 status code when limit exceeded
- Include rate limit headers in all responses:
  - X-RateLimit-Limit: 100
  - X-RateLimit-Remaining: 85
  - X-RateLimit-Reset: 1641024000
- Use separate Redis instance or database for rate limiting (isolation)
- Monitor rate limit hits to detect abuse patterns

### 7. API Response Pagination Strategy

**Question**: How should the predictions list API implement pagination for large result sets?

**Decision**: Use offset/limit pagination with default limit=20, max limit=100.

**Rationale**:
- **Simplicity**: Offset/limit is straightforward to implement and understand
- **URL structure**: `/api/v1/predictions?page=1&limit=20`
- **Result set size**: With active events (not archived), result sets stay manageable

**Response Structure**:
```json
{
  "data": [ /* array of predictions */ ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Alternatives Considered**:
- Cursor-based pagination - Deferred: More complex, benefits not needed for MVP (no real-time updates)
- Keyset pagination - Deferred: Better performance for deep pages, but adds complexity

**Best Practices**:
- Validate and sanitize page/limit query parameters
- Set reasonable limit maximum (100) to prevent abuse
- Use COUNT() query with WHERE clause matching list query for accurate total
- Consider caching count query separately (changes less frequently)

### 8. TypeScript Type Safety with PostgreSQL

**Question**: How to maintain type safety between PostgreSQL schema and TypeScript code?

**Decision**: Define TypeScript interfaces manually, validate at runtime with input validation library (Zod or Joi).

**Rationale**:
- **No ORM**: Direct SQL means no automatic type generation
- **Manual interfaces**: Clear, explicit types that match database schema
- **Runtime validation**: Catch type mismatches at application boundaries (API inputs, database responses)

**Type Strategy**:
```typescript
// src/types/models.ts
export interface Event {
  id: number;
  sport_type: string;
  event_name: string;
  participants: string; // JSON string or parsed object
  scheduled_at: Date;
  event_status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  location: string | null;
  metadata: Record<string, any>; // JSONB
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Prediction {
  id: number;
  event_id: number;
  predicted_outcome: string;
  confidence_score: number; // 0-100
  analysis_details: Record<string, any>; // JSONB
  ai_model: string;
  model_version: string;
  is_active: boolean;
  created_at: Date;
}
```

**Alternatives Considered**:
- Prisma (generates types from schema) - Rejected: Prisma is an ORM, violates constitution
- TypeORM in "raw query" mode - Rejected: Still an ORM abstraction
- Postgres.js with type inference - Considered: Could explore for future improvements

**Best Practices**:
- Keep interfaces in sync with database schema via code reviews
- Use strict TypeScript compiler options (strict, noImplicitAny)
- Validate API inputs with Zod schemas that match TypeScript interfaces
- Document type mappings in migration files

### 8. Data Ingestion Strategy from JSON Files

**Question**: How should we handle scheduled data ingestion from external JSON files (events.json, predictions.json)?

**Decision**: Use node-cron scheduled job with file-based ingestion service that validates, transforms, and inserts data with proper error handling.

**Rationale**:
- **File format**: JSON files allow external AI prediction systems to easily output predictions
- **Scheduled ingestion**: Cron job runs hourly to check for new files (configurable frequency)
- **Validation**: Validate JSON structure and required fields before insertion
- **Duplicate detection**: Use `event_ref` field (SHA256 hash of event_name + scheduled_at) with UNIQUE constraint to prevent duplicates
- **Error handling**: Log errors for invalid records but continue processing valid ones
- **Idempotency**: Use `ON CONFLICT (event_ref) DO NOTHING` to avoid duplicate insertions
- **Event matching**: Match predictions to events by event_name (unique identifier in JSON)

**Implementation Approach**:
```typescript
// Generate deterministic event_ref hash
function generateEventRef(eventName: string, scheduledAt: string): string {
  const crypto = require('crypto');
  const input = `${eventName}|${scheduledAt}`;  // Pipe separator
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

// Use ON CONFLICT (event_ref) DO NOTHING for idempotency
INSERT INTO events (event_ref, sport_type, event_name, participants, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (event_ref) DO NOTHING;

// Cron: '0 * * * *' (every hour) - configurable based on prediction frequency
```

**Alternatives Considered**:
- REST API endpoint for data upload - Rejected: Less secure, requires authentication; file-based simpler for MVP
- Database triggers watching a staging table - Rejected: More complex, not needed for hourly batches
- Message queue (RabbitMQ/SQS) - Deferred: Overkill for MVP; consider for high-frequency updates
- Real-time streaming (Kafka) - Rejected: Not needed for prediction data (not real-time critical)

**Best Practices**:
- Compute `event_ref` using SHA256(event_name + "|" + scheduled_at_iso_string).substring(0, 32)
- Store processed files with timestamp: `events.json.1234567890.processed`
- Set DATA_DIR via environment variable for flexibility
- Log ingestion results with counts and errors for monitoring
- Handle missing files gracefully (log warning, don't crash)
- Validate JSONB structure for participants array before insertion
- Use transactions for batch inserts (rollback on critical errors)
- UNIQUE constraint on event_ref ensures database-level duplicate prevention

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Schema Design | Two tables (events, predictions) with JSONB for participants & metadata | Denormalized, flexible, sport-agnostic |
| Indexing | Composite indexes on query patterns, GIN on JSONB | Meet <100ms performance target |
| Archival | Separate archive tables with scheduled migration | Simple, isolates queries, MVP-friendly |
| Connection Pool | node-postgres Pool (min 10, max 50) | Balance concurrency and resource usage |
| Caching | Redis cache with 5min (list) / 15min (detail) TTL | Reduce database load, acceptable staleness |
| Rate Limiting | Redis sliding window counter | Constitutional requirement, accurate limits |
| Pagination | Offset/limit (default 20, max 100) | Simple, sufficient for MVP |
| Type Safety | Manual TypeScript interfaces + runtime validation | No ORM, maintain type safety explicitly |
| Data Ingestion | Cron job reading JSON files hourly with validation | Simple, file-based integration with external AI systems |

## Next Steps

All technical unknowns resolved. Proceed to Phase 1:
- Create detailed data model (data-model.md) with exact schema DDL
- Generate API contracts (contracts/) with OpenAPI specs
- Write developer quickstart guide (quickstart.md)
