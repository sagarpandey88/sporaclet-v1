# Sporaclet - Sports Prediction Portal

A full-featured sports prediction system with RESTful API, database management, and automated archival services.

## Features

- 🏆 **Sports Predictions API** - List and retrieve sports predictions with advanced filtering
- 📊 **Multi-Sport Support** - Football, Basketball, American Football, and more
- 🔍 **Advanced Filtering** - Filter by sport, league, team, date range, confidence score
- 📈 **Pagination** - Efficient data retrieval with customizable page sizes
- 🗄️ **PostgreSQL Database** - Robust data storage with migrations
- 🔒 **Security** - Rate limiting, CORS, Helmet.js protection
- 📦 **Archive Service** - Automated cron job for data retention management
- 📝 **Comprehensive Logging** - Structured logging with Winston
- ✅ **Full Test Coverage** - Jest test suite included
- 🐳 **Docker Support** - Ready for containerized deployment

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/sagarpandey88/sporaclet-v1.git
cd sporaclet-v1

# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Load sample data (optional)
npm run load-data ../data/sample_events.json ../data/sample_predictions.json

# Start the development server
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Endpoints

#### Health Check
```
GET /health
```

Returns server and database health status.

#### List Predictions
```
GET /api/predictions
```

**Query Parameters:**
- `sport` - Filter by sport (e.g., "Football", "Basketball")
- `league` - Filter by league (e.g., "Premier League", "NBA")
- `team` - Filter by team name (home or away)
- `startDate` - Filter events from this date (ISO 8601)
- `endDate` - Filter events until this date (ISO 8601)
- `predictionType` - Filter by type: `WINNER`, `SCORE`, `OVER_UNDER`
- `minConfidence` - Minimum confidence score (0-100)
- `includeArchived` - Include events that are archived (`true`/`false`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```bash
curl "http://localhost:3000/api/predictions?sport=Football&league=Premier%20League&minConfidence=70&page=1&limit=10"
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "event_id": 1,
      "prediction_type": "WINNER",
      "predicted_value": "Manchester United",
      "confidence_score": 75.5,
      "reasoning": "Home advantage and strong recent form",
      "model_version": "v1.2.0",
      "created_at": "2026-01-09T10:00:00Z",
      "updated_at": "2026-01-09T10:00:00Z",
      "event": {
        "id": 1,
        "sport": "Football",
        "league": "Premier League",
        "home_team": "Manchester United",
        "away_team": "Liverpool",
        "event_date": "2026-02-15T15:00:00Z",
        "venue": "Old Trafford",
        "status": "SCHEDULED",
        "is_archived": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Get Prediction Details
```
GET /api/predictions/:id
```

Returns detailed information for a specific prediction.

**Example:**
```bash
curl "http://localhost:3000/api/predictions/1"
```

## Project Structure

```
sporaclet-v1/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── api/            # API routes and middleware
│   │   ├── database/       # Database connection and repositories
│   │   ├── jobs/           # Scheduled jobs (archival)
│   │   ├── scripts/        # CLI utilities
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript definitions
│   │   └── server.ts       # Application entry point
│   ├── tests/              # Test suite
│   ├── logs/               # Application logs
│   └── package.json
├── data/                   # Sample data files
│   ├── sample_events.json
│   └── sample_predictions.json
├── specs/                  # Project specifications
│   └── 001-sports-prediction-db/
└── docker-compose.yml      # Docker configuration
```

## Development

### Running Tests

```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm test -- --coverage     # With coverage report
```

### Code Quality

```bash
npm run lint               # Check code style
npm run lint:fix          # Fix linting issues
npm run format            # Format with Prettier
```

### Database Migrations

```bash
npm run migrate           # Run migrations
```

### Data Ingestion

```bash
npm run load-data <events.json> <predictions.json>
```

## Configuration

Environment variables (`.env`):

```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_predictions
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=*

# Archival
ARCHIVE_CRON_SCHEDULE=0 0 * * *  # Daily at midnight
ARCHIVE_RETENTION_DAYS=30
```

## Docker Deployment

```bash
docker-compose up -d
```

## Architecture

- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **TypeScript** - Type-safe development
- **Winston** - Structured logging
- **Jest** - Testing framework
- **node-cron** - Scheduled jobs

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - 100 requests per 15 minutes
- **Input Validation** - All inputs validated
- **SQL Injection Prevention** - Parameterized queries

## Archive Service

Automatically archives events older than the configured retention period (default: 30 days). Runs as a cron job at midnight daily.

Archived events are marked with `is_archived: true` on the `event` object and are excluded from API list responses by default.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
