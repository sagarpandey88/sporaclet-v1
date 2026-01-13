<!--
SYNC IMPACT REPORT
==================
Version Change: Initial Constitution → 1.0.0
Ratification Date: 2026-01-09
Last Amended: 2026-01-09

Principles Defined:
  ✓ I. Code Quality & Maintainability
  ✓ II. Test-First Development (NON-NEGOTIABLE)
  ✓ III. Database Direct Access
  ✓ IV. UI/UX Excellence
  ✓ V. AI-Agnostic Architecture
  ✓ VI. RESTful API Standards
  ✓ VII. Modular Architecture

Sections Added:
  ✓ Technology Stack
  ✓ API & Integration Standards
  ✓ Governance

Template Consistency Check:
  ✅ plan-template.md - Constitution Check section aligns with principles
  ✅ spec-template.md - Requirements structure supports constitution principles
  ✅ tasks-template.md - Task categorization reflects TDD and modular approach

Follow-up TODOs: None
-->

# Sporaclet Constitution

## Core Principles

### I. Code Quality & Maintainability

**MUST**: Write clean, readable, self-documenting code that adheres to established best practices.

- Code MUST follow consistent naming conventions and formatting standards
- Functions and methods MUST be single-purpose and focused
- Avoid code duplication (DRY principle); extract reusable logic into shared utilities
- Complex logic MUST be accompanied by explanatory comments
- Magic numbers and hardcoded values MUST be replaced with named constants
- Code reviews MUST verify adherence to quality standards

**Rationale**: Clean code reduces technical debt, improves maintainability, accelerates onboarding, and minimizes bugs. Quality is non-negotiable for long-term project health.

### II. Test-First Development (NON-NEGOTIABLE)

**MUST**: Follow strict Test-Driven Development (TDD) methodology for all feature work.

- Tests MUST be written before implementation code
- All tests MUST fail initially, then pass after implementation (Red-Green-Refactor)
- Unit tests MUST cover individual functions and components
- Integration tests MUST verify interactions between modules
- Contract tests MUST validate API endpoints and data contracts
- No feature is complete without passing tests and user validation

**Rationale**: TDD ensures correctness by design, provides living documentation, enables confident refactoring, and catches regressions early. This is the foundation of reliable software delivery.

### III. Database Direct Access

**MUST**: Interact with PostgreSQL using raw SQL queries; ORMs are prohibited.

- Database queries MUST be written in SQL, not abstracted through ORM layers
- Use parameterized queries to prevent SQL injection
- Query optimization and indexing strategies MUST be explicit and intentional
- Database migrations MUST be versioned and reviewable
- Complex queries MUST include performance considerations and EXPLAIN plans
- Caching layer (Redis) MUST be used strategically to reduce database load

**Rationale**: Direct SQL provides full control over query performance, avoids ORM abstraction penalties, ensures developers understand database operations, and enables precise optimization. This principle prioritizes performance and transparency over convenience.

### IV. UI/UX Excellence

**MUST**: Deliver intuitive, accessible, and visually appealing user interfaces.

- Use Tailwind CSS for consistent, utility-first styling
- Use shadcn/ui components as the foundation for UI consistency
- Interfaces MUST be responsive across mobile, tablet, and desktop
- Follow accessibility standards (WCAG 2.1 AA minimum)
- User feedback (loading states, errors, confirmations) MUST be clear and immediate
- Design MUST prioritize user intent and minimize cognitive load
- Component reusability MUST be maximized

**Rationale**: User experience is a product differentiator. Beautiful, accessible interfaces increase adoption, reduce support burden, and reflect professional quality.

### V. AI-Agnostic Architecture

**MUST**: Design AI integration to support multiple providers without architectural changes.

- AI functionality MUST be abstracted behind provider-agnostic interfaces
- Configuration MUST allow switching between AI providers (OpenAI, Anthropic, etc.)
- Feature logic MUST NOT depend on provider-specific APIs or behaviors
- Graceful degradation MUST be implemented when AI services are unavailable
- AI responses MUST be validated and sanitized before use
- Costs and rate limits MUST be monitored per provider

**Rationale**: AI vendor lock-in poses business and technical risks. Provider-agnostic design enables competition-based optimization, risk mitigation, and flexibility as the AI landscape evolves.

### VI. RESTful API Standards

**MUST**: Design and implement APIs following REST architectural principles and industry best practices.

- HTTP methods MUST be semantically correct (GET for reads, POST for creates, PUT/PATCH for updates, DELETE for removals)
- Endpoints MUST use noun-based resource naming (e.g., `/api/users`, not `/api/getUsers`)
- API versioning MUST be explicit (e.g., `/api/v1/...`) to support backward compatibility
- Status codes MUST be semantically correct (2xx success, 4xx client errors, 5xx server errors)
- Rate limiting MUST be implemented to prevent abuse and ensure fair usage
- API responses MUST include consistent error structures with actionable messages
- Authentication and authorization MUST be enforced on protected endpoints
- API documentation MUST be maintained and up-to-date

**Rationale**: RESTful standards ensure predictable, scalable APIs. Rate limiting protects infrastructure, prevents abuse, and maintains service quality for all users.

### VII. Modular Architecture

**MUST**: Structure code into independent, reusable, and loosely coupled modules.

- Each module MUST have a single, well-defined responsibility
- Modules MUST expose clear interfaces and hide implementation details
- Dependencies between modules MUST be explicit and minimized
- Shared utilities MUST be extracted into dedicated libraries
- Frontend components MUST be composable and independently testable
- Backend services MUST follow separation of concerns (routes, controllers, services, models)
- Module boundaries MUST be respected; avoid circular dependencies

**Rationale**: Modularity enables parallel development, simplifies testing, improves code reuse, and allows components to evolve independently. This reduces coupling and increases system resilience.

## Technology Stack

**Backend**: Node.js with Express or Fastify framework
**Frontend**: Next.js (React framework) with TypeScript
**Database**: PostgreSQL (raw SQL, no ORM)
**Caching**: Redis for session management, query caching, and rate limiting
**Styling**: Tailwind CSS + shadcn/ui components
**Testing**: Jest (unit/integration), Supertest (API), Playwright (E2E)

All technology choices MUST align with the principles above. Deviations require explicit justification and amendment approval.

## API & Integration Standards

### Rate Limiting

- Public endpoints: 100 requests per 15 minutes per IP
- Authenticated endpoints: 1000 requests per 15 minutes per user
- Rate limit headers MUST be included in responses (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- 429 status code MUST be returned when limits are exceeded
- Redis MUST be used for distributed rate limit tracking

### Error Handling

- All errors MUST return consistent JSON structure:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message",
      "details": {}
    }
  }
  ```
- Sensitive information MUST NOT be exposed in error messages
- Stack traces MUST NOT be returned in production environments

### Documentation

- All API endpoints MUST be documented with request/response examples
- OpenAPI/Swagger specification MUST be maintained
- Breaking changes MUST be communicated with migration guides

## Governance

**Authority**: This constitution supersedes all other development practices, guidelines, and conventions. In case of conflict, constitutional principles take precedence.

**Compliance**: All code reviews, pull requests, and feature specifications MUST verify compliance with constitutional principles. Non-compliant code MUST NOT be merged.

**Amendments**: Constitutional changes require:
1. Written proposal with rationale and impact analysis
2. Review by project maintainers
3. Documentation of migration path for existing code
4. Version increment following semantic versioning rules
5. Update of all dependent templates and guidance documents

**Versioning**:
- **MAJOR**: Backward-incompatible principle changes or removals
- **MINOR**: New principles added or existing principles materially expanded
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

**Complexity Justification**: Any deviation from simplicity or introduction of complex patterns MUST be documented with:
- Clear problem statement that cannot be solved simply
- Alternatives considered
- Long-term maintenance implications
- Approval from technical lead

**Version**: 1.0.0 | **Ratified**: 2026-01-09 | **Last Amended**: 2026-01-09
