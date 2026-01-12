-- Database schema for Sports Prediction System
-- Version: 1.0

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_ref VARCHAR(64) NOT NULL UNIQUE,
    sport VARCHAR(50) NOT NULL,
    league VARCHAR(100) NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    venue VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_status CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED'))
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    prediction_type VARCHAR(20) NOT NULL,
    predicted_value TEXT NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL,
    reasoning TEXT NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT check_prediction_type CHECK (prediction_type IN ('WINNER', 'SCORE', 'OVER_UNDER')),
    CONSTRAINT check_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_ref ON events(event_ref);
CREATE INDEX IF NOT EXISTS idx_events_sport ON events(sport);
CREATE INDEX IF NOT EXISTS idx_events_league ON events(league);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_home_team ON events(home_team);
CREATE INDEX IF NOT EXISTS idx_events_away_team ON events(away_team);

CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON predictions(confidence_score);
CREATE INDEX IF NOT EXISTS idx_predictions_archived ON predictions(is_archived);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
