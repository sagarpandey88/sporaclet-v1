-- Migration: Move is_archived from predictions to events

-- Add is_archived to events (default false)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_is_archived ON events(is_archived);

-- Remove is_archived from predictions
ALTER TABLE predictions
  DROP COLUMN IF EXISTS is_archived;
