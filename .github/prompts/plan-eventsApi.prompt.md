Plan: Events API (list + detail)

TL;DR: Implement `GET /api/events` and `GET /api/events/:id` returning UTC dates, with `when=upcoming|past|all` (upcoming = `event_date >= now()`), pagination, filters, and `includePredictions` (default true). List responses include the prediction winner name (if any). Reuse types from `backend/src/types/index.ts` and follow existing patterns from the Predictions API.

Steps
1. Add route
   - Create `backend/src/api/routes/events.ts` with endpoints:
     - `GET /api/events` — query params: `sport`, `league`, `team`, `startDate`, `endDate`, `status`, `when` (values: `upcoming|past|all`, default `all`), `includePredictions` (boolean, default `true`), `page`, `limit`.
     - `GET /api/events/:id` — path param `id`, query `includePredictions` (default `true`).
   - Validate and parse params using the same style as `GET /api/predictions`.

2. Service/controller
   - Add `backend/src/services/eventService.ts` with:
     - `getEvents(filters: EventsListQuery, pagination: PaginationParams): Promise<PaginatedResponse<Event | EventWithPredictions>>`
     - `getEventById(id: number, options?: { includePredictions?: boolean }): Promise<Event | EventWithPredictions | null>`
   - Map repository results to the API response shape and ensure `event_date` is returned as UTC ISO strings.

3. Repository
   - Extend `backend/src/database/repositories/eventRepository.ts` with:
     - `findAll(filters: { sport?: string; league?: string; team?: string; startDate?: Date; endDate?: Date; status?: string; when?: 'upcoming'|'past'|'all' }, pagination: PaginationParams): Promise<{ events: Event[]; total: number }>`
     - `findById(id: number, options?: { includePredictions?: boolean }): Promise<Event | EventWithPredictions | null>`
   - SQL outline:
     - Build WHERE clauses for provided filters.
     - Implement `when` as:
       - `upcoming`: `event_date >= now()` (server UTC time)
       - `past`: `event_date < now()`
       - `all`: no time filter
     - For list total: `SELECT COUNT(*) FROM (filtered_query) AS filtered`.
     - ORDER BY defaults:
       - `when=upcoming` → `ORDER BY event_date ASC` (soonest first)
       - `when=past` → `ORDER BY event_date DESC` (most recent past first)
       - `when=all` → `ORDER BY event_date DESC`
     - Limit/Offset: standard LIMIT/OFFSET using `page` and `limit` like Predictions API.
   - Prediction in list: include `winner` field which is the predicted value from the latest non-archived prediction for the event; if none, `winner: null`.

4. Tests
   - Add `backend/tests/api/events.test.ts` mirroring `predictions.test.ts` to cover:
     - Pagination and `page`/`limit` behavior
     - Filters: `sport`, `league`, `team`, `startDate`, `endDate`, `status`
     - `when=upcoming|past|all` behavior
     - `includePredictions` default true and `winner` presence in list
     - Invalid parameter handling (400)

5. OpenAPI / Contracts
   - Add `specs/001-sports-prediction-db/contracts/get-events-list.yaml` and `get-event-detail.yaml` with query params and response schemas reusing `Event` shape. Include `includePredictions` and `winner` field in list items.

6. Documentation
   - Update `backend/README.md` and top-level `README.md` API sections with examples showing `GET /api/events` usage and query param descriptions.

Decisions & Confirmations (applied)
- Upcoming definition: `event_date >= now()` (server UTC). Frontend handles local timezone display.
- `includePredictions` default: `true` for both list and detail endpoints.
- `when` param name confirmed (`upcoming|past|all`).
- Prediction selection rule: use latest non-archived prediction (by `created_at`) to populate `winner` in the events list. If multiple predictions exist, pick the latest; if none, `winner: null`.
- Dates returned as UTC ISO strings.
- Sorting defaults: upcoming → ASC, past → DESC, all → DESC.

Further notes / open questions
- If you expect very large datasets, consider a cursor-based approach later; for now OFFSET/LIMIT matches existing patterns.
- If `includePredictions=true` in list responses creates heavy payloads, we can limit the embedded prediction to `{ winner, confidence_score, model_version }` only.

Next steps
- Implement route + service + repository following this plan.
- Add tests and contract files.
- Update READMEs.

References
- Reuse types from `backend/src/types/index.ts` (`Event`, `EventWithPredictions`, `PaginationParams`, `PaginatedResponse`).
- Follow the patterns used in `backend/src/api/routes/predictions.ts` for param parsing and error handling.
