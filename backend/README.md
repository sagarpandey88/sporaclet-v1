# Sports Prediction Backend API

RESTful API for the Sports Prediction Portal built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- **Predictions API**: List and retrieve sports predictions with filtering and pagination
- **Database**: PostgreSQL with connection pooling and migrations
- **Archival Service**: Automated cron job to archive old predictions
- **Rate Limiting**: Request throttling to prevent abuse
- **Security**: Helmet.js, CORS, and input validation
- **Logging**: Structured logging with Winston
- **Testing**: Comprehensive test suite with Jest and Supertest

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- TypeScript 5+

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
```

## Configuration

Edit `.env` file with your settings:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_predictions
DB_USER=postgres
DB_PASSWORD=postgres
ARCHIVE_RETENTION_DAYS=30
```

## Database Setup

```bash
# Run migrations
npm run migrate

# Load sample data
npm run load-data ../data/events.json ../data/predictions.json
```

## Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### List Predictions
```
GET /api/predictions?sport=Football&league=Premier%20League&page=1&limit=20
```

Query parameters:
- `sport` (string): Filter by sport
- `league` (string): Filter by league
- `team` (string): Filter by team (home or away)
- `startDate` (ISO date): Filter by event start date
- `endDate` (ISO date): Filter by event end date
- `predictionType` (enum): WINNER, SCORE, OVER_UNDER
- `minConfidence` (number): Minimum confidence score (0-100)
- `includeArchived` (boolean): Include archived predictions
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

### Get Prediction Details
```
GET /api/predictions/:id
```

Returns detailed prediction with associated event information.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

## Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── middleware/       # Express middleware
│   │   └── routes/           # API route handlers
│   ├── database/
│   │   ├── migrations/       # SQL migration scripts
│   │   └── repositories/     # Database access layer
│   ├── jobs/                 # Scheduled jobs (archive)
│   ├── scripts/              # CLI utility scripts
│   ├── services/             # Business logic
│   ├── types/                # TypeScript type definitions
│   └── server.ts             # Application entry point
├── tests/                    # Test files
├── logs/                     # Application logs
└── package.json
```

## Archive Service

The archive service runs daily at midnight (configurable via `ARCHIVE_CRON_SCHEDULE`) and marks predictions older than `ARCHIVE_RETENTION_DAYS` as archived.

To manually trigger archival:
```typescript
import { runArchiveJobNow } from './jobs/archiveJob';
await runArchiveJobNow();
```

## Error Handling

The API uses consistent error responses:

```json
{
  "error": {
    "message": "Error description"
  }
}
```

HTTP status codes:
- 200: Success
- 400: Bad request (invalid parameters)
- 404: Resource not found
- 429: Too many requests (rate limit exceeded)
- 500: Internal server error

## Security

- **Helmet.js**: Sets security HTTP headers
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All user inputs are validated
- **SQL Injection Prevention**: Parameterized queries

## Logging

Logs are written to:
- Console (colorized, human-readable)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

Configure via `LOG_LEVEL` environment variable.

## License

ISC
