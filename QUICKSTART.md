# Quick Start Guide - Sports Prediction Portal

## Prerequisites

- PostgreSQL 14+ running
- Node.js 18+
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_predictions
DB_USER=your_user
DB_PASSWORD=your_password
```

### 3. Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE sports_predictions;
\q
```

### 4. Run Migrations

```bash
npm run migrate
```

This creates the `events` and `predictions` tables with proper indexes.

### 5. Load Sample Data (Optional)

```bash
npm run load-data ../data/sample_events.json ../data/sample_predictions.json
```

### 6. Start the Server

#### Development Mode (with hot reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

Server will start on `http://localhost:3000`

## Verify Installation

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T...",
  "services": {
    "database": "up"
  }
}
```

### Test Predictions List
```bash
curl http://localhost:3000/api/predictions
```

Expected response:
```json
{
  "data": [
    {
      "id": 1,
      "event_id": 1,
      "prediction_type": "WINNER",
      "predicted_value": "Manchester United",
      "confidence_score": 68.5,
      "reasoning": "...",
      "event": {
        "id": 1,
        "sport": "Football",
        "league": "Premier League",
        ...
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 11,
    "totalPages": 1
  }
}
```

### Test Prediction Detail
```bash
curl http://localhost:3000/api/predictions/1
```

## Common Issues

### Database Connection Failed

**Error**: `Database connection failed`

**Solution**: 
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

```bash
psql -U postgres -c "\l" | grep sports_predictions
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**: Change PORT in `.env` or kill the process using port 3000:

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Migration Fails

**Error**: `relation "events" already exists`

**Solution**: Drop and recreate database:

```bash
psql -U postgres
DROP DATABASE sports_predictions;
CREATE DATABASE sports_predictions;
\q

npm run migrate
```

## API Usage Examples

### Filter by Sport
```bash
curl "http://localhost:3000/api/predictions?sport=Football"
```

### Filter by League and Confidence
```bash
curl "http://localhost:3000/api/predictions?league=Premier%20League&minConfidence=70"
```

### Pagination
```bash
curl "http://localhost:3000/api/predictions?page=2&limit=10"
```

### Multiple Filters
```bash
curl "http://localhost:3000/api/predictions?sport=Basketball&team=Lakers&minConfidence=65&page=1&limit=5"
```

## Development Workflow

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm test -- --coverage     # With coverage
```

### Code Quality
```bash
npm run lint               # Check code style
npm run lint:fix          # Fix linting issues
npm run format            # Format with Prettier
```

### Load Custom Data
```bash
npm run load-data <path-to-events.json> <path-to-predictions.json>
```

Example data format in `data/sample_events.json` and `data/sample_predictions.json`.

## Next Steps

1. ✅ Database running and migrations completed
2. ✅ Server responding to health checks
3. ✅ Sample data loaded
4. 🔄 Test all API endpoints
5. 🔄 Configure archive service schedule
6. 🔄 Set up monitoring and logging
7. 🔄 Deploy to production environment

## Support

For issues:
- Check backend logs in `backend/logs/`
- Review error messages in terminal
- Verify environment variables in `.env`
- Ensure PostgreSQL is accessible

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong database password
- [ ] Configure CORS_ORIGIN to your frontend domain
- [ ] Set appropriate rate limits
- [ ] Enable SSL for database connection (DB_SSL=true)
- [ ] Set up log rotation
- [ ] Configure monitoring and alerting
- [ ] Set up backup strategy for database
- [ ] Review and adjust archive retention days
- [ ] Set up reverse proxy (nginx/Apache)
- [ ] Configure firewall rules
- [ ] Set up SSL certificates (Let's Encrypt)

## Architecture Overview

```
Client Request
     ↓
[Rate Limiter] → 429 if exceeded
     ↓
[CORS/Security Headers]
     ↓
[Routes] → /api/predictions, /api/predictions/:id
     ↓
[Validation] → 400 if invalid
     ↓
[Repository] → Database queries
     ↓
[PostgreSQL Database]
     ↓
[Response] → JSON with data/pagination

Background Jobs:
- Archive Service (Cron: Daily at midnight)
- Data Ingestion (Manual via CLI)
```

## Logs Location

- **Error logs**: `backend/logs/error.log`
- **Combined logs**: `backend/logs/combined.log`
- **Console**: Real-time output in terminal

View logs:
```bash
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

---

**Ready to go!** 🚀

Your Sports Prediction Portal API is now running and ready to serve predictions.
