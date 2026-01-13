Continuation Plan — Move `is_archived` from predictions to events

Objective
- Move archival flag from `predictions` to `events`, update code, migrations, and tests; verify with full build and test run.

Immediate Steps
1. Run TypeScript build and full test suite to surface failures and type issues.

   Commands:
   ```bash
   cd backend
   npm run build
   npm test
   ```

2. Fix failing tests and serialization issues
- Address numeric/string serialization (e.g., `confidence_score` should be numeric).
- Fix TypeScript errors (e.g., unused variables) and adjust tests to new shapes.

3. Rebuild compiled artifacts and update `dist/` references
- Re-run build to regenerate `dist/` outputs.
- Search for any remaining references to `predictions.is_archived` and update or remove them.

4. Update API contracts and specs
- Update `specs/` YAML and docs to reflect `Event` containing optional `prediction` and `events.is_archived`.

5. Re-run tests and verify all pass
- Run `npm test` again and confirm green.
- If failures persist, iterate on fixes, prioritizing serialization and repository SQL.

Notes
- No DB backfill required per current instructions; migration removes `predictions.is_archived` and adds `events.is_archived`.
- Prioritize running tests and rebuilding before making further code changes.

Outputs to produce
- Updated migration SQL reflecting `events.is_archived`.
- Updated repository SQL queries and services to use event-level archive semantics.
- Green test suite.

Next action (if approved)
- Run the build & tests now and report failures for targeted fixes.
