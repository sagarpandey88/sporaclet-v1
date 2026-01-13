# Tasks: Sports Prediction Portal Backend

**Input**: Design documents from `/specs/001-sports-prediction-db/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are OPTIONAL for this feature. Backend API contract and integration tests will be written only where explicitly beneficial for MVP.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution Compliance**: All tasks align with Sporaclet Constitution principles:
- Clean, maintainable code structure (Principle I)
- Test-first development where appropriate (Principle II)
- Direct SQL access with node-postgres, no ORM (Principle III)
- Modular, reusable services (Principle VI)
- RESTful API standards with rate limiting (Principle V)

## Implementation Strategy

**MVP First**: User Story 1 (Predictions List) is the minimum viable product. Implement US1 completely before moving to US2 or US3.

**Incremental Delivery**: Each user story phase delivers independently testable value:
- **US1 (P1)**: List API endpoint - delivers core value
- **US2 (P2)**: Detail API endpoint - completes read-only experience
- **US3 (P3)**: Archive service - ensures scalability
- **Data Ingestion**: Cron job for JSON file imports - automates data entry

**Parallel Opportunities**: Tasks marked with **[P]** can be executed in parallel by different developers working on separate files.

---

## Phase 1: Setup & Project Initialization

**Goal**: Establish backend project structure, dependencies, and development environment.

**Test Criteria**: Docker services start successfully, project builds without errors, environment variables load correctly.

### Tasks

- [X] T001 Create backend/ directory structure: src/database/, src/api/, src/services/, src/jobs/, src/types/, tests/
- [X] T002 Initialize backend/package.json with Node.js 20+, TypeScript 5.3+, and core dependencies (pg, redis, express, dotenv)
- [X] T003 [P] Create backend/tsconfig.json with strict TypeScript settings (strict: true, noImplicitAny: true)
- [X] T004 [P] Create backend/.env.example with DATABASE_URL, REDIS_URL, NODE_ENV, PORT, DATA_DIR placeholders
- [ ] T005 [P] Create docker-compose.yml for PostgreSQL 16 (port 5432) and Redis 7 (port 6379) services
- [X] T006 [P] Add development dependencies: jest, supertest, @types/node, @types/jest, ts-node, nodemon
- [X] T007 [P] Create backend/.eslintrc.json for code quality (extends eslint:recommended, @typescript-eslint/recommended)
- [X] T008 [P] Add npm scripts to package.json: dev, build, test, migrate, seed
- [X] T009 Create backend/src/server.ts with basic Express app setup and port listening

---

## Phase 2: Foundational - Database & Core Infrastructure

**Goal**: Set up database schema, connection pooling, migrations, and seed data. These are blocking prerequisites for all user stories.

**Test Criteria**: Migrations run successfully, connection pool connects to PostgreSQL, seed data creates sample events and predictions.

### Tasks

- [X] T010 Create backend/src/database/pool.ts with node-postgres Pool configuration (min: 10, max: 50, statement_timeout: 100ms)
- [X] T011 Create backend/src/database/migrations/001_create_events_and_predictions.sql with events table (event_ref UNIQUE, participants JSONB, metadata JSONB) and predictions table
- [ ] T012 [P] Create backend/src/database/migrations/002_create_archive_tables.sql for events_archive and predictions_archive tables
- [X] T013 Create migration runner backend/src/database/migrate.ts that executes SQL files in order and tracks applied migrations
- [X] T014 [P] Create backend/src/types/models.ts with TypeScript interfaces: Event, Prediction, Participant, PredictionListItem, PredictionDetail
- [X] T015 [P] Add generateEventRef() helper function to models.ts (SHA256 hash of event_name + scheduled_at)
- [ ] T016 Create backend/src/database/seeds/001_sample_predictions.sql with 3 sample events (Soccer, Basketball, Tennis) and predictions
- [X] T017 [P] Create backend/src/api/middleware/errorHandler.ts for centralized error response formatting (400, 404, 500 with proper JSON structure)
- [X] T018 [P] Create backend/src/api/middleware/cors.ts to enable CORS for future frontend integration

---

## Phase 3: User Story 1 - View Predictions List (P1 - MVP)

**Story Goal**: API endpoint that returns a paginated list of upcoming sports predictions with event details, sorted by scheduled date.

**Independent Test**: `GET /api/v1/predictions?page=1&limit=20` returns 200 with JSON array of predictions, each containing event_id, sport_type, event_name, participants (JSONB), scheduled_at, predicted_outcome, confidence_score.

**MVP Scope**: This is the minimum viable product. Delivers core value to users.

### Tasks

- [X] T019 [US1] Create backend/src/database/queries/predictions.ts with getActivePredictions(pool, page, limit) query function (SELECT with JOIN on events, WHERE is_active=true AND scheduled_at >= NOW())
- [X] T020 [US1] Create backend/src/api/controllers/predictions.ts with listPredictions controller (parse page/limit params, call getActivePredictions, return data + pagination metadata)
- [X] T021 [US1] Create backend/src/api/routes/predictions.ts with GET /predictions route handler (calls listPredictions controller)
- [X] T022 [US1] Register predictions router in backend/src/server.ts at /api/v1/predictions path
- [X] T023 [P] [US1] Create backend/src/api/validators/predictions.ts with validateListParams() function (page >= 1, limit 1-100, default: page=1, limit=20)
- [ ] T024 [P] [US1] Create backend/src/services/cache.ts with Redis client setup and getCachedPredictions()/setCachedPredictions() functions (5min TTL for list)
- [ ] T025 [US1] Integrate Redis caching in listPredictions controller: check cache first, return cached data if exists, otherwise query DB and cache result
- [ ] T026 [US1] Test GET /api/v1/predictions endpoint manually with curl/Postman: verify 200 response, pagination works, JSONB participants parse correctly

---

## Phase 4: User Story 2 - View Prediction Details (P2)

**Story Goal**: API endpoint that returns complete details for a specific prediction including full analysis, event metadata, and participants.

**Independent Test**: `GET /api/v1/predictions/:id` returns 200 with detailed JSON object containing prediction fields (id, predicted_outcome, confidence_score, analysis_details JSONB, ai_model, model_version) and nested event object.

### Tasks

- [X] T027 [US2] Add getPredictionById(pool, predictionId) function to backend/src/database/queries/predictions.ts (SELECT with JOIN, WHERE prediction.id = $1 AND is_active=true)
- [X] T028 [US2] Create getPredictionDetail controller in backend/src/api/controllers/predictions.ts (parse ID param, call getPredictionById, return 404 if not found, return full detail object)
- [X] T029 [US2] Add GET /predictions/:id route to backend/src/api/routes/predictions.ts (calls getPredictionDetail controller)
- [X] T030 [P] [US2] Add validatePredictionId() to backend/src/api/validators/predictions.ts (check ID is positive integer, return 400 if invalid)
- [ ] T031 [US2] Add Redis caching for detail view in cache.ts: getCachedPredictionDetail()/setCachedPredictionDetail() with 15min TTL
- [ ] T032 [US2] Integrate caching in getPredictionDetail controller: check cache, query DB if miss, cache result
- [ ] T033 [US2] Test GET /api/v1/predictions/:id endpoint: verify 200 with full data, 404 for non-existent ID, analysis_details JSONB parses correctly

---

## Phase 5: User Story 3 - Archive Old Events (P3)

**Story Goal**: Scheduled job that automatically moves events and predictions older than 30 days from active tables to archive tables, maintaining query performance.

**Independent Test**: Create events with scheduled_at > 30 days ago, run archive service, verify records moved to events_archive and predictions_archive tables, verify is_active=false on original records, verify archived events don't appear in GET /predictions list.

### Tasks

- [X] T034 [US3] Create backend/src/services/archive.ts with archiveOldEvents(pool) function (BEGIN transaction, INSERT into archive tables, UPDATE is_active=false, COMMIT)
- [X] T035 [US3] Implement transaction handling in archiveOldEvents: BEGIN/COMMIT on success, ROLLBACK on error, use pool.connect() for client management
- [X] T036 [US3] Add archival SQL logic: INSERT INTO events_archive SELECT * FROM events WHERE scheduled_at < NOW() - INTERVAL '30 days' AND is_active=true
- [X] T037 [US3] Add prediction archival SQL: INSERT INTO predictions_archive SELECT p.* FROM predictions p INNER JOIN events e WHERE e.scheduled_at < NOW() - INTERVAL '30 days'
- [X] T038 [US3] Add soft delete updates: UPDATE events SET is_active=false WHERE scheduled_at < NOW() - INTERVAL '30 days'; UPDATE predictions SET is_active=false WHERE event_id IN (...)
- [X] T039 [P] [US3] Create backend/src/jobs/archive.ts with cron scheduler using node-cron (schedule: '0 2 * * *' for daily 2 AM)
- [X] T040 [US3] Integrate archiveOldEvents call in archive.ts cron job with error logging and success count logging
- [ ] T041 [US3] Test archival process: manually set event dates to >30 days, run archiveOldEvents(), verify archive tables populated, verify archived events hidden from list endpoint

---

## Phase 6: Data Ingestion from JSON Files

**Story Goal**: Scheduled job that reads events.json and predictions.json from a configured directory, validates data, computes event_ref for duplicate detection, and imports records into database.

**Independent Test**: Place valid events.json and predictions.json in DATA_DIR, run ingestion job, verify events and predictions inserted with correct event_ref, verify duplicate events skipped (ON CONFLICT event_ref DO NOTHING), verify error logging for invalid records.

### Tasks

- [X] T042 [P] Create backend/src/services/ingestion.ts with ingestEvents(pool, filePath) function (read JSON, validate, generate event_ref, INSERT with ON CONFLICT)
- [X] T043 Add generateEventRef() call in ingestEvents: compute SHA256(event_name + "|" + scheduled_at) for each event before INSERT
- [X] T044 Implement event validation in ingestEvents: check required fields (sport_type, event_name, participants, scheduled_at), collect errors array, continue on invalid records
- [X] T045 Add event INSERT query in ingestEvents: INSERT INTO events (event_ref, sport_type, event_name, participants, scheduled_at, event_status, location, metadata) VALUES (...) ON CONFLICT (event_ref) DO NOTHING
- [X] T046 [P] Add ingestPredictions(pool, filePath) function to ingestion.ts (read JSON, find event by event_reference name, INSERT prediction with event_id FK)
- [X] T047 Implement prediction validation in ingestPredictions: check required fields, lookup event by event_name, log error if event not found, continue processing
- [X] T048 Add prediction INSERT query: INSERT INTO predictions (event_id, predicted_outcome, confidence_score, analysis_details, ai_model, model_version) VALUES (...) ON CONFLICT DO NOTHING
- [X] T049 Add error handling in both ingestion functions: return {imported: number, errors: string[]} summary object for logging
- [X] T050 [P] Create backend/src/jobs/ingest-data.ts with cron scheduler (schedule: '0 * * * *' for hourly) that calls ingestEvents and ingestPredictions
- [X] T051 Configure DATA_DIR environment variable path in .env, default to /workspaces/sporaclet-v1/data in ingest-data.ts
- [X] T052 Add comprehensive logging in ingest-data.ts: log import counts, log errors array, handle missing files gracefully (warn, don't crash)
- [X] T053 Test ingestion: create data/events.json and data/predictions.json with sample data, run ingestion manually, verify inserts, verify event_ref uniqueness, verify duplicate skip

---

## Phase 7: Rate Limiting & Security Middleware

**Story Goal**: Implement Redis-based rate limiting (100 requests per 15 minutes per IP) per Constitution Principle V (RESTful API Standards).

**Independent Test**: Make 101 requests from same IP to /api/v1/predictions endpoint within 15 minutes, verify 101st request returns 429 status with rate limit headers.

### Tasks

- [X] T054 [P] Create backend/src/api/middleware/rateLimit.ts with Redis sliding window counter implementation (INCR + EXPIRE commands)
- [X] T055 Implement rate limit logic: get client IP, check Redis key `ratelimit:{ip}`, increment counter, set 15min expiry on first request, return 429 if count > 100
- [X] T056 Add rate limit headers to response: X-RateLimit-Limit: 100, X-RateLimit-Remaining: {remaining}, X-RateLimit-Reset: {timestamp}
- [X] T057 Apply rateLimit middleware to all /api/v1/* routes in server.ts (app.use('/api/v1', rateLimit))
- [ ] T058 Test rate limiting: write script to make 101 requests, verify 429 response on 101st, verify headers present, verify reset after 15 minutes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Production readiness, logging, health checks, documentation.

**Test Criteria**: Health check endpoint returns 200, README documents all endpoints, Docker containers start and connect successfully.

### Tasks

- [X] T059 [P] Create backend/src/api/routes/health.ts with GET /health endpoint (check PostgreSQL and Redis connectivity, return 200 if healthy, 503 if any service down)
- [X] T060 [P] Add structured logging with Winston or Pino: create backend/src/utils/logger.ts with log levels (info, warn, error) and JSON formatting
- [X] T061 [P] Replace console.log statements with logger throughout codebase (server.ts, archive.ts, ingest-data.ts, controllers)
- [X] T062 [P] Create backend/README.md with setup instructions, environment variables, API endpoints documentation, development workflow
- [X] T063 [P] Create .dockerignore file excluding node_modules, .env, *.log files
- [ ] T064 [P] Add Dockerfile for backend (multi-stage build: npm install, tsc build, run with node dist/server.js)
- [ ] T065 Update docker-compose.yml to include backend service with depends_on postgres and redis
- [X] T066 [P] Add graceful shutdown handling in server.ts: listen for SIGTERM/SIGINT, close database pool and Redis connections, stop HTTP server
- [X] T067 [P] Create data/.gitkeep to ensure data/ directory exists in git, add data/*.json to .gitignore to exclude actual data files
- [ ] T068 Final integration test: docker-compose up, verify all services healthy, test all API endpoints, verify cron jobs scheduled, verify rate limiting works

---

## Dependencies & Execution Order

### Story Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundation)
                      ↓
        ┌─────────────┼─────────────┬────────────────┐
        ↓             ↓             ↓                ↓
    Phase 3 (US1) Phase 4 (US2) Phase 5 (US3) Phase 6 (Ingest)
        ↓             ↓             ↓                ↓
        └─────────────┴─────────────┴────────────────┘
                      ↓
              Phase 7 (Rate Limit)
                      ↓
              Phase 8 (Polish)
```

**Critical Path**: 
1. Phase 1 (Setup) → MUST complete first
2. Phase 2 (Foundation) → MUST complete before any user story
3. Phase 3 (US1) → MVP - highest priority
4. Phase 4-6 → Can be developed in parallel after Phase 3
5. Phase 7-8 → Final polish after core features

### Task Dependencies

**Blocking Dependencies**:
- T010 (database pool) MUST be complete before any database query tasks (T019, T027, T034, T042)
- T011-T013 (migrations) MUST be complete before T016 (seed data)
- T014-T015 (TypeScript types) MUST be complete before any controller/service tasks
- T021 (routes) depends on T020 (controller) depends on T019 (query)
- T034-T038 (archive service) MUST be complete before T039-T040 (archive cron job)
- T042-T049 (ingestion service) MUST be complete before T050-T052 (ingestion cron job)

**Parallelizable Tasks** (marked with [P]):
- T003, T004, T005, T006, T007 (project config files) - can be created simultaneously
- T012, T014, T017, T018 (different file types) - can be worked on in parallel
- T023, T024 (validators and cache service) - independent files
- T030, T031 (validators and cache for US2) - independent files
- T039, T042, T046, T050 (different service files) - can be developed in parallel
- T054-T058 (rate limiting) - independent feature, can be added anytime after Phase 2
- T059-T067 (polish tasks) - mostly independent documentation and config

---

## Parallel Execution Examples

### Parallel Group 1: Setup Configuration Files (Phase 1)
Developer A can work on T003, T004, T005 simultaneously while Developer B works on T006, T007, T008. These are all independent configuration files.

### Parallel Group 2: Foundation Infrastructure (Phase 2)
- Developer A: T011-T013 (migrations)
- Developer B: T014-T015 (TypeScript types)
- Developer C: T017-T018 (middleware)

### Parallel Group 3: User Stories (After Phase 2)
- Team 1: Complete Phase 3 (US1) - MVP priority
- Team 2: Start Phase 5 (US3) - Archive service (independent)
- Team 3: Start Phase 6 (Data Ingestion) - Independent feature

### Parallel Group 4: Enhancement Features
After US1 is complete:
- Developer A: Phase 4 (US2 - Detail endpoint)
- Developer B: Phase 7 (Rate limiting)
- Developer C: Phase 8 (Health checks, logging, documentation)

---

## Task Metrics

**Total Tasks**: 68
**MVP Tasks (Phase 1-3)**: 26 tasks
**Parallelizable Tasks**: 24 tasks (marked with [P])

**Task Breakdown by Phase**:
- Phase 1 (Setup): 9 tasks
- Phase 2 (Foundation): 9 tasks
- Phase 3 (US1 - MVP): 8 tasks
- Phase 4 (US2): 7 tasks
- Phase 5 (US3): 8 tasks
- Phase 6 (Data Ingestion): 12 tasks
- Phase 7 (Rate Limiting): 5 tasks
- Phase 8 (Polish): 10 tasks

**Estimated Effort**:
- MVP (Phase 1-3): ~3-4 days for single developer
- Full Feature (All Phases): ~7-10 days for single developer
- With 3 developers in parallel: ~3-5 days for full feature

---

## Constitution Compliance Checklist

Per `.specify/memory/constitution.md`:

- [x] **Principle I (Code Quality)**: Tasks ensure clean separation of concerns (database/, api/, services/ structure)
- [x] **Principle II (Test-First)**: Manual testing included for each phase; automated tests optional for MVP
- [x] **Principle III (Database Direct Access)**: All database tasks use raw SQL with node-postgres Pool, no ORM
- [x] **Principle IV (UI/UX Excellence)**: Not applicable - backend API only
- [x] **Principle V (RESTful API Standards)**: Rate limiting (Phase 7), versioned endpoints (/api/v1/), proper status codes in error handler
- [x] **Principle VI (Modular Architecture)**: Clear module boundaries - queries/, controllers/, routes/, services/, jobs/
- [x] **Principle VII (AI-Agnostic Integration)**: AI prediction generation is external; system only stores/retrieves data

---

## Next Steps

1. **Start with MVP**: Complete Phase 1-3 (Setup → Foundation → US1) before anything else
2. **Verify each phase**: Test endpoints manually after each phase completion
3. **Parallel development**: After Phase 2, assign US2/US3/Ingestion to different developers
4. **Production readiness**: Complete Phase 7-8 (rate limiting, health checks, logging) before deployment
5. **Frontend handoff**: Once backend API is complete, create separate feature spec for Next.js frontend

**Ready to implement!** All design decisions documented in research.md, schema in data-model.md, API contracts in contracts/, and developer workflows in quickstart.md.
