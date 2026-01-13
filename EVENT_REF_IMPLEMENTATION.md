# Event Reference (event_ref) Implementation

## Overview

Added `event_ref` field as a unique identifier for events to enable duplicate detection during data ingestion. The `event_ref` is a SHA256 hash computed from key event attributes.

## Changes Made

### 1. Database Schema (`001_initial_schema.sql`)
- ✅ Added `event_ref VARCHAR(64) NOT NULL UNIQUE` column to events table
- ✅ Added unique constraint on event_ref
- ✅ Added index `idx_events_event_ref` for faster lookups
- ✅ Prevents duplicate events during ON CONFLICT operations

### 2. TypeScript Types (`src/types/index.ts`)
- ✅ Added `event_ref: string` to Event interface
- ✅ Implemented `generateEventRef()` helper function
  - Takes: sport, homeTeam, awayTeam, eventDate
  - Returns: SHA256 hash (64 characters)
  - Formula: `SHA256(sport|homeTeam|awayTeam|eventDate.toISOString())`

### 3. Event Repository (`src/database/repositories/eventRepository.ts`)
- ✅ Updated `create()` method to include event_ref in INSERT
- ✅ Added `ON CONFLICT (event_ref) DO NOTHING` for duplicate prevention
- ✅ Returns existing event if duplicate detected
- ✅ Added `findByEventRef()` method for looking up events by reference

### 4. Data Ingestion Service (`src/services/dataIngestionService.ts`)
- ✅ Imported `generateEventRef` function
- ✅ Generates event_ref before creating each event
- ✅ Passes event_ref to event repository
- ✅ Logs event_ref for debugging

### 5. Test Files
- ✅ Updated `tests/api/predictions.test.ts` to generate event_ref
- ✅ Updated `tests/services/archiveService.test.ts` to generate event_ref
- ✅ All test event creations now include proper event_ref

## Usage Example

```typescript
import { generateEventRef } from './types';

const eventDate = new Date('2026-01-15T15:00:00Z');
const eventRef = generateEventRef(
  'Football',
  'Manchester United',
  'Liverpool',
  eventDate
);

// eventRef = "a1b2c3d4e5f6..." (64-character SHA256 hash)

const event = await eventRepository.create({
  event_ref: eventRef,
  sport: 'Football',
  league: 'Premier League',
  home_team: 'Manchester United',
  away_team: 'Liverpool',
  event_date: eventDate,
  venue: 'Old Trafford',
  status: 'SCHEDULED',
});
```

## Duplicate Detection

When loading data from JSON files:

1. **First Load**: Event is created with computed event_ref
2. **Subsequent Loads**: 
   - Same event data generates same event_ref
   - Database `ON CONFLICT (event_ref) DO NOTHING` prevents duplicate
   - Existing event is returned instead
   - No error thrown, just logged as warning

## Benefits

- ✅ **Idempotent Imports**: Can safely re-run data ingestion without duplicates
- ✅ **Deterministic**: Same event details always generate same hash
- ✅ **Efficient**: Indexed for fast lookups
- ✅ **Database-Level Protection**: Unique constraint prevents duplicates
- ✅ **Graceful Handling**: Returns existing event rather than failing

## Database Query Examples

```sql
-- Find event by reference
SELECT * FROM events WHERE event_ref = 'abc123...';

-- Check for duplicates before insert
INSERT INTO events (event_ref, sport, league, home_team, away_team, event_date, venue, status)
VALUES ('abc123...', 'Football', 'Premier League', 'Arsenal', 'Chelsea', '2026-01-20', 'Emirates', 'SCHEDULED')
ON CONFLICT (event_ref) DO NOTHING;

-- Find all events for a specific sport (uses index)
SELECT * FROM events WHERE sport = 'Football';
```

## Verification

Build status: ✅ **Success** (no TypeScript errors)

All files compile correctly with event_ref implementation.

## Task Completion

- ✅ T011: Database schema with event_ref UNIQUE
- ✅ T015: generateEventRef() helper function
- ✅ T043: generateEventRef() call in ingestEvents
- ✅ T044: Event validation in ingestEvents
- ✅ T045: Event INSERT with ON CONFLICT (event_ref) DO NOTHING
