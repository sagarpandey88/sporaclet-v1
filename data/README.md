# Data Directory for JSON Ingestion

This directory is used for automated data ingestion of events and predictions.

## Purpose

The backend ingestion cron job reads JSON files from this directory to import sports events and AI predictions into the database.

## File Formats

### events.json

Array of event objects with the following structure:

```json
[
  {
    "sport_type": "Soccer",
    "event_name": "Champions League: PSG vs Bayern Munich",
    "participants": [
      {
        "name": "Paris Saint-Germain",
        "id": "team_psg",
        "role": "home"
      },
      {
        "name": "Bayern Munich",
        "id": "team_fcb",
        "role": "away"
      }
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

**Required Fields:**
- `sport_type`: String (e.g., "Soccer", "Basketball", "Tennis")
- `event_name`: String (unique identifier for matching with predictions)
- `participants`: Array of participant objects (JSONB)
  - Each participant must have `name` and `id`
  - Optional fields: `role`, `rank`, `country`, `conference`, etc.
- `scheduled_at`: ISO 8601 timestamp (UTC)

**Optional Fields:**
- `event_status`: String (default: "upcoming")
- `location`: String
- `metadata`: Object with sport-specific data

### predictions.json

Array of prediction objects with the following structure:

```json
[
  {
    "event_reference": "Champions League: PSG vs Bayern Munich",
    "predicted_outcome": "Bayern Munich wins 2-1",
    "confidence_score": 71.25,
    "analysis_details": {
      "key_factors": ["Factor 1", "Factor 2"],
      "stats": { "key": "value" },
      "reasoning": "Explanation text"
    },
    "ai_model": "gpt-4-turbo",
    "model_version": "2024-01-15"
  }
]
```

**Required Fields:**
- `event_reference`: String (must match `event_name` from events.json)
- `predicted_outcome`: String
- `confidence_score`: Number (0.00 to 100.00)
- `ai_model`: String
- `model_version`: String

**Optional Fields:**
- `analysis_details`: Object with prediction analysis

## Ingestion Process

1. **Schedule**: Cron job runs hourly (`0 * * * *`)
2. **Read Files**: Reads `events.json` and `predictions.json`
3. **Validate**: Checks required fields
4. **Generate event_ref**: Computes SHA256 hash of `event_name + "|" + scheduled_at` for duplicate detection
5. **Import**: 
   - Events are imported first
   - Predictions are matched to events by `event_reference` = `event_name`
   - Uses `ON CONFLICT (event_ref) DO NOTHING` to prevent duplicates based on unique event_ref
6. **Logging**: Outputs import counts and any errors
7. **Processing**: Optionally archives processed files with timestamp

**Duplicate Detection**: The system automatically generates a unique `event_ref` field (32-char hash) from the combination of event name and scheduled time. This ensures that:
- Same event at different times = Different records (e.g., "Team A vs Team B" on Jan 10 vs Jan 20)
- Same event + same time = Duplicate (skipped automatically)
- Reliable idempotent ingestion (can re-run safely)

## Configuration

Set the data directory location in `backend/.env`:

```bash
DATA_DIR=/workspaces/sporaclet-v1/data
```

## Usage

1. Place `events.json` and `predictions.json` in this directory
2. The ingestion job will automatically pick them up on the next scheduled run
3. Check logs for import results: `Ingested X events, Y predictions`

## Example Files

See `events.json.example` and `predictions.json.example` for sample formats.

## Error Handling

- Invalid records are logged but don't stop the import process
- Events without matching predictions are still imported
- Predictions for non-existent events are logged as errors
- **Duplicate events** (same event_name + scheduled_at) are automatically skipped via UNIQUE constraint on event_ref
- System computes event_ref internally - no need to provide it in JSON files

## Manual Import

To manually trigger import (useful for testing):

```bash
cd backend
npm run ingest-data
```
