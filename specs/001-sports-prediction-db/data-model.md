# Data Model: Sports Prediction Portal Database

**Date**: 2026-01-09  
**Feature**: Sports Prediction Portal Database  
**Database**: PostgreSQL 16+

## Overview

This document defines the complete database schema for storing sports events and AI predictions. The design is denormalized for read performance, sport-agnostic to support any sport type, and includes archival tables for 30-day-old events. **Participants are stored as JSONB** to enable flexible structure, easy parsing, and extensibility for different sports.

## Entities and Relationships

```
┌─────────────────┐            ┌──────────────────┐
│     events      │            │   predictions    │
├─────────────────┤            ├──────────────────┤
│ id (PK)         │◄───────────│ event_id (FK)    │
│ sport_type      │         1  │ id (PK)          │
│ event_name      │         :  │ predicted_outcome│
│ participants    │         1  │ confidence_score │
│   (JSONB)       │            │ analysis_details │
│ scheduled_at    │            │ ai_model         │
│ event_status    │            │ model_version    │
│ location        │            │ is_active        │
│ metadata (JSON) │            │ created_at       │
│ is_active       │            └──────────────────┘
│ created_at      │
│ updated_at      │
└─────────────────┘

Archive Tables (same structure):
├── events_archive
└── predictions_archive
```

**Relationship**: One Event has zero or one Prediction (1:0..1). In the MVP, each event can have at most one prediction. Events without predictions are not displayed in the UI.

## Table Definitions

### 1. events

Stores sports events/matches/competitions with JSONB participants for flexible structure.

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_ref VARCHAR(100) NOT NULL UNIQUE,  -- Hash of event_name + scheduled_at for duplicate detection
    sport_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(500) NOT NULL,
    participants JSONB NOT NULL,  -- Array of participant objects with flexible schema
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    event_status VARCHAR(20) NOT NULL 
        CHECK (event_status IN ('upcoming', 'in-progress', 'completed', 'cancelled')),
    location VARCHAR(300),  -- Optional: venue/stadium name
    metadata JSONB DEFAULT '{}',  -- Sport-specific data (e.g., league, tournament, odds)
    is_active BOOLEAN NOT NULL DEFAULT true,  -- Soft delete flag
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE events IS 'Sports events with JSONB participant data';
COMMENT ON COLUMN events.event_ref IS 'Unique hash for duplicate detection (SHA256 of event_name + scheduled_at ISO string)';
COMMENT ON COLUMN events.participants IS 'JSONB array of participant objects. Examples:
  Soccer: [{"name": "Team A", "id": "team_123", "role": "home"}, {"name": "Team B", "id": "team_456", "role": "away"}]
  Tennis: [{"name": "Player 1", "id": "player_789", "rank": 5}, {"name": "Player 2", "id": "player_890", "rank": 12}]';
COMMENT ON COLUMN events.metadata IS 'Sport-specific flexible data (JSONB)';
COMMENT ON COLUMN events.is_active IS 'Soft delete: false hides from active queries';
```

**Fields**:
- `id`: Unique identifier
- `event_ref`: Unique reference hash (SHA256 of event_name + scheduled_at) for duplicate detection during ingestion
- `sport_type`: Type of sport (e.g., "Soccer", "Basketball", "Tennis")
- `event_name`: Human-readable name
- `participants`: JSONB array of participant objects. Each object can contain name, id, role, rank, etc.
  - **Soccer example**: `[{"name": "Manchester United", "id": "team_mu", "role": "home"}, {"name": "Liverpool", "id": "team_liv", "role": "away"}]`
  - **Tennis example**: `[{"name": "Novak Djokovic", "id": "player_nd", "rank": 1}, {"name": "Carlos Alcaraz", "id": "player_ca", "rank": 2}]`
  - **Basketball example**: `[{"name": "Lakers", "id": "team_lal", "role": "home", "conference": "West"}, {"name": "Warriors", "id": "team_gsw", "role": "away", "conference": "West"}]`
- `scheduled_at`: Event start time (stored in UTC)
- `event_status`: Current event status (upcoming, in-progress, completed, cancelled)
- `location`: Venue/stadium name (optional)
- `metadata`: Sport-specific fields (league, tournament, odds, weather, etc.)
- `is_active`: Soft delete flag (false = archived/deleted)
- `created_at`, `updated_at`: Audit timestamps

### 2. predictions

Stores AI-generated predictions for events.

```sql
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    predicted_outcome VARCHAR(500) NOT NULL,  -- "Team A wins", "Over 2.5 goals", etc.
    confidence_score NUMERIC(5, 2) NOT NULL 
        CHECK (confidence_score >= 0 AND confidence_score <= 100),  -- 0.00 to 100.00
    analysis_details JSONB DEFAULT '{}',  -- Denormalized analysis (reasoning, factors, stats)
    ai_model VARCHAR(100) NOT NULL,  -- "gpt-4", "claude-3", etc.
    model_version VARCHAR(50) NOT NULL,  -- "1.0.0", "2024-01-15", etc.
    is_active BOOLEAN NOT NULL DEFAULT true,  -- Soft delete flag
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE predictions IS 'AI-generated predictions linked to events';
COMMENT ON COLUMN predictions.confidence_score IS 'Confidence percentage (0.00-100.00)';
COMMENT ON COLUMN predictions.analysis_details IS 'Denormalized JSON analysis data';
COMMENT ON COLUMN predictions.ai_model IS 'AI provider/model identifier';
```

### 3. events_archive

Archive table for events older than 30 days.

```sql
CREATE TABLE events_archive (
    id BIGINT PRIMARY KEY,
    event_ref VARCHAR(100) NOT NULL,
    sport_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(500) NOT NULL,
    participants JSONB NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    event_status VARCHAR(20) NOT NULL,
    location VARCHAR(300),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE events_archive IS 'Archive of events older than 30 days';
```

### 4. predictions_archive

Archive table for predictions linked to archived events.

```sql
CREATE TABLE predictions_archive (
    id BIGINT PRIMARY KEY,
    event_id BIGINT NOT NULL,  -- FK to events_archive, not enforced
    predicted_outcome VARCHAR(500) NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL,
    analysis_details JSONB DEFAULT '{}',
    ai_model VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE predictions_archive IS 'Archive of predictions for archived events';
```

## Indexes

### Performance Indexes

```sql
-- Index 1: Active events by scheduled date (covers main list query)
CREATE INDEX idx_events_active_scheduled 
    ON events (scheduled_at DESC, is_active) 
    WHERE is_active = true;

-- Index 2: Event status lookup
CREATE INDEX idx_events_status 
    ON events (event_status) 
    WHERE is_active = true;

-- Index 3: Sport type filtering
CREATE INDEX idx_events_sport_type 
    ON events (sport_type) 
    WHERE is_active = true;

-- Index 4: Active predictions by event (for JOIN optimization)
CREATE INDEX idx_predictions_event_active 
    ON predictions (event_id, is_active) 
    WHERE is_active = true;

-- Index 5: Prediction confidence sorting
CREATE INDEX idx_predictions_confidence 
    ON predictions (confidence_score DESC) 
    WHERE is_active = true;

-- Index 6: Archive queries by archived date
CREATE INDEX idx_events_archive_archived_at 
    ON events_archive (archived_at DESC);

CREATE INDEX idx_predictions_archive_archived_at 
    ON predictions_archive (archived_at DESC);

-- Index 7: JSONB GIN index for participant searches
CREATE INDEX idx_events_participants_gin 
    ON events USING gin (participants);
```

**Index Strategy**:
- Partial indexes with `WHERE is_active = true` reduce index size and improve query performance
- Composite indexes match query patterns (scheduled_at + is_active for list queries)
- GIN index on participants JSONB enables efficient searches like `participants @> '[{"name": "Liverpool"}]'`
- Archive table indexes support retention queries and analytics

## Query Patterns

### Pattern 1: List Active Predictions with Pagination

```sql
SELECT 
    e.id AS event_id,
    e.sport_type,
    e.event_name,
    e.participants,  -- Returns JSONB array
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
LIMIT 20 OFFSET 0;
```

**Performance**: Uses `idx_events_active_scheduled` and `idx_predictions_event_active`. Expected latency: <50ms for 10K events.

### Pattern 2: Get Prediction Detail by ID

```sql
SELECT 
    p.id AS prediction_id,
    p.predicted_outcome,
    p.confidence_score,
    p.analysis_details,  -- JSONB
    p.ai_model,
    p.model_version,
    p.created_at,
    e.id AS event_id,
    e.sport_type,
    e.event_name,
    e.participants,  -- JSONB
    e.scheduled_at,
    e.event_status,
    e.location,
    e.metadata  -- JSONB
FROM predictions p
INNER JOIN events e ON p.event_id = e.id
WHERE p.id = $1 
  AND p.is_active = true
  AND e.is_active = true;
```

**Performance**: Primary key lookup + index join. Expected latency: <10ms.

### Pattern 3: Extract Participant Names from JSONB

```sql
-- Get all participant names as separate rows
SELECT 
    e.id,
    e.event_name,
    participant->>'name' AS participant_name,
    participant->>'id' AS participant_id,
    participant->>'role' AS participant_role
FROM events e,
     jsonb_array_elements(e.participants) AS participant
WHERE e.id = $1;

-- Or as aggregated string (for display)
SELECT 
    e.id,
    e.event_name,
    string_agg(participant->>'name', ' vs ' ORDER BY participant->>'role') AS participants_display
FROM events e,
     jsonb_array_elements(e.participants) AS participant
WHERE e.id = $1
GROUP BY e.id, e.event_name;
```

### Pattern 4: Search Events by Participant Name

```sql
-- Find all events featuring a specific team/player
SELECT e.*
FROM events e
WHERE e.participants @> '[{"name": "Liverpool"}]'::jsonb
  AND e.is_active = true
ORDER BY e.scheduled_at DESC;

-- Uses idx_events_participants_gin for efficient search
```

### Pattern 5: Archive Events Older than 30 Days

```sql
-- Transaction to move old events and predictions to archive
BEGIN;

-- Insert events into archive
INSERT INTO events_archive 
SELECT *, NOW() AS archived_at
FROM events
WHERE scheduled_at < NOW() - INTERVAL '30 days'
  AND is_active = true;

-- Insert predictions into archive
INSERT INTO predictions_archive 
SELECT p.*, NOW() AS archived_at
FROM predictions p
INNER JOIN events e ON p.event_id = e.id
WHERE e.scheduled_at < NOW() - INTERVAL '30 days'
  AND e.is_active = true;

-- Soft delete from active tables
UPDATE events 
SET is_active = false, updated_at = NOW()
WHERE scheduled_at < NOW() - INTERVAL '30 days'
  AND is_active = true;

UPDATE predictions 
SET is_active = false
WHERE event_id IN (
    SELECT id FROM events 
    WHERE scheduled_at < NOW() - INTERVAL '30 days'
);

COMMIT;
```

## Migrations

### Migration 001: Initial Schema

```sql
-- File: backend/src/database/migrations/001_create_events_and_predictions.sql

BEGIN;

-- Events table with JSONB participants
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_ref VARCHAR(100) NOT NULL UNIQUE,  -- Duplicate detection
    sport_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(500) NOT NULL,
    participants JSONB NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    event_status VARCHAR(20) NOT NULL 
        CHECK (event_status IN ('upcoming', 'in-progress', 'completed', 'cancelled')),
    location VARCHAR(300),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    predicted_outcome VARCHAR(500) NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL 
        CHECK (confidence_score >= 0 AND confidence_score <= 100),
    analysis_details JSONB DEFAULT '{}',
    ai_model VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_active_scheduled 
    ON events (scheduled_at DESC, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_events_status 
    ON events (event_status) 
    WHERE is_active = true;

CREATE INDEX idx_events_sport_type 
    ON events (sport_type) 
    WHERE is_active = true;

CREATE INDEX idx_predictions_event_active 
    ON predictions (event_id, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_predictions_confidence 
    ON predictions (confidence_score DESC) 
    WHERE is_active = true;

CREATE INDEX idx_events_participants_gin 
    ON events USING gin (participants);

CREATE UNIQUE INDEX idx_events_event_ref 
    ON events (event_ref);

-- Comments
COMMENT ON TABLE events IS 'Sports events with JSONB participant data';
COMMENT ON COLUMN events.event_ref IS 'Unique reference for duplicate detection';
COMMENT ON COLUMN events.participants IS 'JSONB array of participant objects';
COMMENT ON TABLE predictions IS 'AI-generated predictions linked to events';

COMMIT;
```

### Migration 002: Archive Tables

```sql
-- File: backend/src/database/migrations/002_create_archive_tables.sql

BEGIN;

-- Events archive table
CREATE TABLE events_archive (
    id BIGINT PRIMARY KEY,
    event_ref VARCHAR(100) NOT NULL,
    sport_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(500) NOT NULL,
    participants JSONB NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    event_status VARCHAR(20) NOT NULL,
    location VARCHAR(300),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Predictions archive table
CREATE TABLE predictions_archive (
    id BIGINT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    predicted_outcome VARCHAR(500) NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL,
    analysis_details JSONB DEFAULT '{}',
    ai_model VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Archive indexes
CREATE INDEX idx_events_archive_archived_at 
    ON events_archive (archived_at DESC);

CREATE INDEX idx_predictions_archive_archived_at 
    ON predictions_archive (archived_at DESC);

-- Comments
COMMENT ON TABLE events_archive IS 'Archive of events older than 30 days';
COMMENT ON TABLE predictions_archive IS 'Archive of predictions for archived events';

COMMIT;
```

## Sample Data

```sql
-- File: backend/src/database/seeds/001_sample_predictions.sql

BEGIN;

-- Sample events with JSONB participants and event_ref
INSERT INTO events (event_ref, sport_type, event_name, participants, scheduled_at, event_status, location, metadata) VALUES
('e8a7f3b2c1d5a9e4f6b8c2d1a3e5f7b9', 'Soccer', 'Premier League: Manchester United vs Liverpool', 
 '[{"name": "Manchester United", "id": "team_mu", "role": "home"}, {"name": "Liverpool", "id": "team_liv", "role": "away"}]'::jsonb,
 '2026-01-15 15:00:00+00', 'upcoming', 'Old Trafford',
 '{"league": "Premier League", "round": 21, "referee": "Michael Oliver"}'::jsonb),

('a3c5e7f9b1d3a5c7e9f1b3d5a7c9e1f3', 'Basketball', 'NBA: Lakers vs Warriors', 
 '[{"name": "Los Angeles Lakers", "id": "team_lal", "role": "home", "conference": "West"}, {"name": "Golden State Warriors", "id": "team_gsw", "role": "away", "conference": "West"}]'::jsonb,
 '2026-01-16 02:30:00+00', 'upcoming', 'Crypto.com Arena',
 '{"league": "NBA", "season": "2025-26", "broadcast": "ESPN"}'::jsonb),

('f1b3d5a7c9e1f3b5d7a9c1e3f5b7d9a1', 'Tennis', 'Australian Open: Djokovic vs Alcaraz', 
 '[{"name": "Novak Djokovic", "id": "player_nd", "rank": 1, "country": "Serbia"}, {"name": "Carlos Alcaraz", "id": "player_ca", "rank": 2, "country": "Spain"}]'::jsonb,
 '2026-01-20 09:00:00+00', 'upcoming', 'Rod Laver Arena',
 '{"tournament": "Australian Open", "round": "Semifinal", "surface": "Hard", "best_of": 5}'::jsonb);

-- Note: event_ref is a deterministic hash computed from event_name + scheduled_at

-- Sample predictions
INSERT INTO predictions (event_id, predicted_outcome, confidence_score, analysis_details, ai_model, model_version) VALUES
(1, 'Liverpool wins 2-1', 72.50, 
 '{"key_factors": ["Liverpool has won 3 of last 5 meetings", "Man Utd missing key defender"], "stats": {"home_form": "W-L-D-W-L", "away_form": "W-W-W-D-W"}, "reasoning": "Liverpool in better form"}'::jsonb,
 'gpt-4-turbo', '2024-01-15'),

(2, 'Lakers win by 5+ points', 65.00, 
 '{"key_factors": ["Lakers home advantage", "Warriors on back-to-back"], "stats": {"lal_home_record": "18-5", "gsw_away_record": "12-11"}, "reasoning": "Home court advantage and rest differential"}'::jsonb,
 'claude-3-opus', '1.0.0'),

(3, 'Djokovic wins in 4 sets', 68.75, 
 '{"key_factors": ["Djokovic experience in semifinals", "Hard court specialist"], "stats": {"djokovic_slam_semis": "47-11", "alcaraz_slam_semis": "4-1"}, "reasoning": "Experience edge in high-pressure matches"}'::jsonb,
 'gpt-4-turbo', '2024-01-15');

COMMIT;
```

## TypeScript Type Definitions

```typescript
// File: backend/src/types/models.ts

// Participant interface (flexible for different sports)
export interface Participant {
  name: string;
  id: string;
  role?: 'home' | 'away';  // For team sports
  rank?: number;  // For individual sports
  country?: string;
  conference?: string;  // For leagues like NBA
  [key: string]: unknown;  // Allow additional fields
}

export interface Event {
  id: bigint;
  event_ref: string;  // Unique hash for duplicate detection
  sport_type: string;
  event_name: string;
  participants: Participant[];  // JSONB parsed to array
  scheduled_at: Date;
  event_status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  location?: string;
  metadata: Record<string, unknown>;  // JSONB
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Helper function to generate event_ref
export function generateEventRef(eventName: string, scheduledAt: Date | string): string {
  const crypto = require('crypto');
  const dateStr = typeof scheduledAt === 'string' 
    ? scheduledAt 
    : scheduledAt.toISOString();
  const input = `${eventName}|${dateStr}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

export interface Prediction {
  id: bigint;
  event_id: bigint;
  predicted_outcome: string;
  confidence_score: number;  // 0.00 to 100.00
  analysis_details: {
    key_factors?: string[];
    stats?: Record<string, unknown>;
    reasoning?: string;
    [key: string]: unknown;
  };
  ai_model: string;
  model_version: string;
  is_active: boolean;
  created_at: Date;
}

export interface PredictionWithEvent extends Prediction {
  event: Event;
}
```

## Design Decisions

1. **event_ref for Duplicate Detection**: Use SHA256 hash of event_name + scheduled_at (ISO string) to generate unique reference; ensures idempotent ingestion with UNIQUE constraint
2. **JSONB for Participants**: Enables flexible structure for different sports (teams vs individuals), easy parsing, and efficient searches with GIN indexes
3. **Denormalization**: Event and prediction data are in two tables only for read performance
4. **Soft Deletes**: `is_active` flag enables recovery and audit trails
5. **UTC Timestamps**: All timestamps stored in UTC, converted to user timezone in API layer
6. **JSONB Metadata**: Flexible schema allows sport-specific fields without ALTER TABLE
7. **Archive Strategy**: Separate archive tables (not partitions) for MVP simplicity
8. **One Prediction Per Event**: Simplified MVP scope; can be extended to multiple predictions later

## Performance Expectations

- **List Active Predictions**: <50ms for 10,000 active events (using composite index)
- **Get Prediction Detail**: <10ms (primary key + index join)
- **Participant Search**: <100ms for 50,000 events (using GIN index on JSONB)
- **Archive Job**: <5s to archive 1000 events (bulk INSERT + UPDATE in transaction)

## Validation Rules

1. `confidence_score`: Must be between 0.00 and 100.00
2. `event_status`: Must be one of: upcoming, in-progress, completed, cancelled
3. `scheduled_at`: Must be in the future when event is created (CHECK constraint)
4. `participants`: Must be valid JSONB array (enforced by PostgreSQL)
