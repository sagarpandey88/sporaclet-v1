# Implementation Plan: Sports Prediction Portal Database

**Branch**: `001-sports-prediction-db` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sports-prediction-db/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Design and implement a PostgreSQL database schema and backend API for an AI-assisted sports prediction portal that stores events and predictions in a denormalized structure. The system must support sport-agnostic data storage, efficient querying (<100ms for active predictions), 30-day archival strategy, and scheduled data ingestion from JSON files. Primary use cases include RESTful API endpoints for listing predictions, fetching detailed analysis, and automated data import from external prediction files. Technical approach: Direct SQL with parameterized queries, JSONB for flexible metadata and participants, composite indexes for performance, separate archive tables, and cron-based data ingestion pipeline. **Note**: Frontend implementation is deferred to a separate feature specification in the next phase.

## Technical Context

**Language/Version**: Node.js v20+ (LTS), TypeScript 5.3+
**Primary Dependencies**: PostgreSQL 16+, node-postgres (pg) driver, Redis 7+ for caching  
**Storage**: PostgreSQL 16+ with JSONB support, Redis for query caching and rate limiting  
**Testing**: Jest 29+ (unit/integration), Supertest for API contract tests, pg-mem for database tests  
**Target Platform**: Linux server (containerized via Docker), Ubuntu 24.04 LTS  
**Project Type**: Backend API only (frontend deferred to next phase)  
**Performance Goals**: <100ms query response for active predictions list, support 1000+ concurrent read requests  
**Constraints**: Query p95 latency <100ms, denormalized schema for read optimization, UTC timestamp storage, no ORM (raw SQL only per constitution)  
**Scale/Scope**: 10,000+ events, 50,000+ predictions, archive after 30 days, support indefinite sports types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: Feature design promotes clean, maintainable code with clear separation of concerns (database layer, API layer, service layer)
- [x] **Test-First**: TDD approach confirmed; contract tests for API, integration tests for database queries, unit tests for business logic
- [x] **Database Direct Access**: SQL approach confirmed with parameterized queries via node-postgres driver (no ORM per Principle III)
- [ ] **UI/UX Excellence**: Not applicable - Frontend deferred to next phase
- [ ] **AI-Agnostic**: Not applicable - AI prediction generation is out of scope; this feature only stores and retrieves predictions
- [x] **RESTful API**: REST principles confirmed - GET /api/v1/predictions (list), GET /api/v1/predictions/:id (detail); versioning, rate limiting (100 req/15min public), proper status codes planned
- [x] **Modular Architecture**: Clear module separation - database/migrations, database/queries, api/routes, api/controllers, services (cache, archive)

**Initial Assessment**: ✅ All applicable gates passed. Feature aligns with constitutional principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-sports-prediction-db/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── contracts/           # Phase 1 output (/speckit.plan command)
    ├── get-predictions-list.yaml
    └── get-prediction-detail.yaml
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── database/
│   │   ├── migrations/           # SQL migration files
│   │   ├── queries/              # Raw SQL queries
│   │   │   ├── events.ts         # Event-related queries
│   │   │   └── predictions.ts    # Prediction-related queries
│   │   └── pool.ts               # PostgreSQL connection pool
│   ├── api/
│   │   ├── routes/
│   │   │   └── predictions.ts    # Prediction endpoints
│   │   ├── controllers/
│   │   │   └── predictions.ts    # Business logic
│   │   ├── middleware/
│   │   │   ├── rateLimit.ts      # Redis-based rate limiting
│   │   │   ├── errorHandler.ts   # Error response formatting
│   │   │   └── cors.ts           # CORS configuration for future frontend
│   │   └── validators/
│   │       └── predictions.ts    # Input validation
│   ├── services/
│   │   ├── cache.ts              # Redis caching service
│   │   ├── archive.ts            # Archive service (30-day job)
│   │   └── ingestion.ts          # Data ingestion from JSON files
│   ├── jobs/
│   │   ├── archive.ts            # Archive cron job
│   │   └── ingest-data.ts        # Data ingestion cron job
│   ├── types/
│   │   └── models.ts             # TypeScript interfaces
│   └── server.ts                 # Express/Fastify app entry
├── tests/
│   ├── contract/
│   │   └── predictions.test.ts   # API contract tests
│   ├── integration/
│   │   ├── database.test.ts      # Database query tests
│   │   └── api.test.ts           # End-to-end API tests
│   └── unit/
│       ├── controllers.test.ts   # Controller unit tests
│       └── services.test.ts      # Service unit tests
├── docker-compose.yml            # PostgreSQL + Redis local setup
├── package.json
└── tsconfig.json
```

**Structure Decision**: Backend API only structure selected. Frontend implementation is deferred to a separate feature specification in the next phase. Database migrations and queries are centralized in `backend/src/database/`. API layer follows RESTful principles with clear separation: routes → controllers → queries. CORS middleware included to prepare for future frontend integration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*Not applicable - all constitutional checks passed.*

---

## Post-Design Constitution Check

*Re-evaluation after completing Phase 1 design (data-model.md, contracts/, quickstart.md)*

- [x] **Code Quality**: ✅ Maintained - Clear module boundaries defined in quickstart, SQL migrations are reviewable, TypeScript types align with schema
- [x] **Test-First**: ✅ Confirmed - Quickstart includes TDD workflow examples, test structure defined (contract/integration/unit)
- [x] **Database Direct Access**: ✅ Verified - Data model shows raw SQL migrations and parameterized queries, no ORM dependencies
- [ ] **UI/UX Excellence**: N/A - Frontend deferred to next phase
- [ ] **AI-Agnostic**: N/A - AI generation remains out of scope
- [x] **RESTful API**: ✅ Verified - OpenAPI contracts demonstrate REST principles, versioned endpoints (/api/v1/), rate limiting headers, proper status codes
- [x] **Modular Architecture**: ✅ Verified - Project structure shows clear separation: database queries, API controllers, services are independent modules

**Post-Design Assessment**: ✅ All gates still pass. Design maintains constitutional compliance. No complexity violations introduced.

**Design Quality**:
- Database schema supports 10K+ events, 50K+ predictions with denormalized structure
- JSONB used for participants enables flexible participant details and easy splitting
- Indexes designed for <100ms query performance
- Archive strategy preserves active query performance
- Data ingestion pipeline handles batch imports from JSON files with validation and error handling
- API contracts define clear request/response formats with error handling
- CORS middleware prepares backend for future frontend integration

---

## Artifacts Generated

This planning phase produced the following deliverables:

1. **[research.md](./research.md)** - Technical research covering 8 key areas:
   - PostgreSQL schema design for denormalized data
   - Indexing strategy for <100ms performance
   - Archival approach (separate tables vs partitioning)
   - Connection pooling configuration
   - Redis caching and rate limiting strategies
   - Pagination and type safety approaches

2. **[data-model.md](./data-model.md)** - Complete database schema:
   - 4 tables: events, predictions, events_archive, predictions_archive
   - 10+ indexes for query optimization
   - DDL migrations with sample data
   - Query patterns for all user stories
   - Field specifications and constraints

3. **[contracts/](./contracts/)** - OpenAPI 3.0 API specifications:
   - `get-predictions-list.yaml` - List endpoint with pagination
   - `get-prediction-detail.yaml` - Detail endpoint with full data
   - Rate limiting headers, error responses, examples

4. **[quickstart.md](./quickstart.md)** - Developer onboarding guide:
   - Setup instructions (Docker, migrations, seed data)
   - Project structure walkthrough
   - 5 key workflows with code examples
   - Testing strategy (TDD approach)
   - Troubleshooting and common commands

5. **Agent Context Updated** - GitHub Copilot instructions enhanced with:
   - Node.js v20+ / TypeScript 5.3+ stack
   - PostgreSQL 16+ / Redis 7+ dependencies
   - Web application project structure

---

## Next Steps

**Planning phase complete.** Proceed to task breakdown with:

```bash
/speckit.tasks
```

The tasks command will generate:
- Phase-by-phase implementation tasks
- Test-first task ordering (write tests before implementation)
- Task dependencies and parallelization opportunities
- Acceptance criteria for each task

**Estimated Implementation Scope**:
- Phase 1 (Setup): ~4 tasks (project init, Docker setup, migration framework)
- Phase 2 (Foundation): ~6 tasks (database setup, connection pooling, base API structure)
- Phase 3 (User Story 1 - List): ~8 tasks (tests, database queries, API endpoint, frontend list view)
- Phase 4 (User Story 2 - Detail): ~6 tasks (tests, query, endpoint, detail component)
- Phase 5 (User Story 3 - Archive): ~4 tasks (archive service, scheduling, testing)

**Total Estimated Tasks**: ~28 tasks organized by priority and dependencies
