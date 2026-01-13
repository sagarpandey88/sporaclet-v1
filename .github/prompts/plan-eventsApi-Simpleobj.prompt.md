Plan: Events-first API (single prediction per event)

Goal
- Make Events the top-level object; predictions are nested inside events.
- Each event may have at most one active (non-archived) prediction; predictions do NOT embed event details.
- No backward compatibility required.

Scope
- Endpoints:
  - `GET /api/events` — list events (filters, pagination, `when=upcoming|past|all`, `includePredictions` default true).
  - `GET /api/events/:id` — get event detail plus nested single `prediction` (if `includePredictions=true`).
  - `GET /api/predictions` and `GET /api/predictions/:id` — return prediction-only objects (no embedded `event`).

Types
- `Prediction`: plain prediction record (includes `event_id`, no `event` object).
- `EventWithPrediction`: `Event` extended with `prediction?: Prediction | null` and `winner?: string | null` convenience if needed.
- Remove or deprecate `PredictionWithEvent` type.

Repositories
- `predictionRepository`:
  - Stop embedding event JSON in prediction queries (`json_build_object` removal).
  - Continue to allow filtering by event fields via joins, but return `p.*` (plus `event_id`).
  - Keep archiving and uniqueness behavior (migrations/unique index ensures single prediction per event where ingestion enforces replace/upsert).
- `eventRepository`:
  - For list/detail queries, SELECT latest non-archived prediction per event (LATERAL JOIN) and map to `prediction` field.
  - Implement `when` logic using `NOW()` (UTC).
  - Pagination via LIMIT/OFFSET; total via `COUNT(*) FROM (filtered_query) AS filtered`.

Services
- `eventService.getEvents` and `getEventById` return API-shaped events with `prediction` attached when requested.
- `predictionService`/routes return prediction-only objects.

Routes
- Update `backend/src/api/routes/events.ts` to return nested `prediction` and `winner` (derived from `prediction.predicted_value` if present).
- Update `backend/src/api/routes/predictions.ts` to return predictions without event embedding.
- Validate query params consistent with existing `predictions` style.

Tests
- Update `backend/tests/api/predictions.test.ts` to expect prediction-only responses.
- Add or update `backend/tests/api/events.test.ts` to validate nested prediction presence, `includePredictions` behavior, filters, pagination, and `when`.

Specs & Docs
- Update `specs/` contracts: `get-events-list.yaml`, `get-event-detail.yaml` -> include prediction schema; `get-predictions-list.yaml`, `get-prediction-detail.yaml` -> remove embedded event.
- Update README and API examples.

Decisions/Assumptions
- Latest non-archived prediction = the single prediction returned for an event (ordered by `created_at DESC`).
- `includePredictions` defaults to `true` on events routes.
- Dates returned as UTC ISO strings.
- No backward compatibility; clients must use events endpoints to load prediction alongside event.

Implementation steps (in order)
1. Update `backend/src/types/index.ts` types.
2. Modify `backend/src/database/repositories/predictionRepository.ts` to stop embedding event.
3. Ensure ingestion/upsert behavior enforces single active prediction per event.
4. Modify `backend/src/database/repositories/eventRepository.ts` to LATERAL JOIN latest prediction and support `when`, pagination, total count.
5. Update `backend/src/services/eventService.ts` and `predictionService` if present.
6. Update `backend/src/api/routes/predictions.ts` and `backend/src/api/routes/events.ts`.
7. Update `backend/src/server.ts` routing if needed.
8. Update tests: rewrite `predictions.test.ts`, add/adjust `events.test.ts`.
9. Update `specs/` contract files and README.
10. Run tests and fix type errors; build dist artifacts.

Notes
- Because there will be only one prediction per event, `winner` can be derived and stored only in responses; no extra DB column required.
- If ingestion must switch to upsert, modify `predictionRepository.create` to `INSERT ... ON CONFLICT (event_id) DO UPDATE SET ...`.

Next: I can implement these changes—start by editing types and prediction repository. Please confirm and I will proceed.
