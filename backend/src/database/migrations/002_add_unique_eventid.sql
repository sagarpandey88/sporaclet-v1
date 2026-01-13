-- Migration: add unique constraint/index to ensure one prediction per event
-- Adds a unique index on predictions(event_id) so ON CONFLICT can be used safely

-- Note: creating a unique index will prevent multiple predictions for the same event_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_event_id_unique ON predictions(event_id);
