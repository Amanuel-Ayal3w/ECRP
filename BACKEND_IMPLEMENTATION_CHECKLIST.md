# Backend Implementation Checklist

Last updated: 2026-04-21

## Status Legend

- DONE: implemented and working in codebase
- PARTIAL: exists but incomplete or mocked
- TODO: not implemented

## Priority Legend

- P0: required for MVP core flow
- P1: important for production readiness
- P2: operational hardening and scale

## Current Backend Coverage Snapshot

- Implemented route files: 23
- Estimated main product endpoints still needed: ~2 (maps/geocode, maps/matrix)

## Implemented Endpoints (DONE)

| Priority | Method | Endpoint | Status | Notes |
|---|---|---|---|---|
| P0 | GET/POST | /api/auth/[...all] | DONE | Passenger auth handler via Better Auth |
| P0 | GET/POST | /api/driver-auth/[...all] | DONE | Driver auth handler via Better Auth |
| P0 | GET/POST | /api/admin-auth/[...all] | DONE | Admin auth handler via Better Auth |
| P0 | GET | /api/passenger/me | DONE | Passenger profile fetch |
| P0 | PATCH | /api/passenger/me | DONE | Passenger profile/password update |
| P0 | GET | /api/driver/me | DONE | Driver profile fetch |
| P0 | PATCH | /api/driver/me | DONE | Driver profile/password update |
| P1 | GET | /api/driver/documents | DONE | List driver documents |
| P1 | POST | /api/driver/documents | DONE | Upload document with validation |
| P1 | DELETE | /api/driver/documents/:id | DONE | Delete own document |
| P1 | GET | /api/admin/me | DONE | Returns current admin role |
| P1 | GET | /api/admin/admins | DONE | List admin users |
| P1 | POST | /api/admin/admins | DONE | Super admin creates admin |

## Missing Core Endpoints (TODO)

### P0: Core Ride and Trip Flow

| Priority | Method | Endpoint | Status | Why Needed |
|---|---|---|---|---|
| P0 | POST | /api/rides/request | DONE | Passenger creates ride request |
| P0 | PATCH | /api/driver/availability | DONE | Driver online/offline toggle |
| P0 | PATCH | /api/driver/route | DONE | Driver declares route |
| P0 | GET | /api/rides/matches | DONE | Retrieve matched drivers for request |
| P0 | POST | /api/rides/:id/accept | DONE | Driver accepts request |
| P0 | POST | /api/rides/:id/reject | DONE | Driver rejects request |
| P0 | GET | /api/trips/active | DONE | Current active trip state |
| P0 | POST | /api/trips/:id/start | DONE | Start trip lifecycle |
| P0 | POST | /api/trips/:id/complete | DONE | Complete trip and trigger scoring |
| P0 | POST | /api/trips/:id/cancel | DONE | Cancel trip lifecycle |
| P0 | GET | /api/trips/history | DONE | Driver/passenger trip history |

### P0: Real-time and Safety

| Priority | Method | Endpoint | Status | Why Needed |
|---|---|---|---|---|
| P0 | POST | /api/trips/:id/location | DONE | GPS ingestion and live updates |
| P0 | POST | /api/trips/:id/panic | DONE | Emergency alerts to admin |
| P0 | POST | /api/realtime/auth | DONE | Private channel auth for realtime subscriptions |

### P0/P1: Maps and Matching Infrastructure

| Priority | Method | Endpoint | Status | Why Needed |
|---|---|---|---|---|
| P0 | POST | /api/maps/geocode | TODO | Convert pickup/destination to coords |
| P0 | POST | /api/maps/matrix | TODO | Distance/time matrix for matching logic |

### P1: Admin Dashboard Operations

| Priority | Method | Endpoint | Status | Why Needed |
|---|---|---|---|---|
| P1 | GET | /api/admin/overview | DONE | Dashboard KPIs |
| P1 | GET | /api/admin/active-users | DONE | Operations monitoring |
| P1 | GET | /api/admin/active-trips | DONE | Live trip view |
| P1 | GET | /api/admin/alerts | DONE | Panic and risk monitoring |
| P1 | POST | /api/admin/penalties/upload-csv | DONE | Receive authority files |
| P1 | POST | /api/admin/penalties/process | DONE | Parse + apply score deductions |
| P1 | GET | /api/admin/penalties/jobs | DONE | Processing status and history |

## Cross-Cutting Backend Work Items

| Priority | Work Item | Status | Notes |
|---|---|---|---|
| P0 | Telegram authentication integration | DONE | UI has button, backend login verification flow not implemented |
| P0 | Ride state machine and transition guards | DONE | Centralized in src/lib/state-machine.ts; all trip routes use it |
| P0 | Smart matching algorithm | DONE | Shared scorer in src/lib/score-route.ts; Gebeta matrix bonus available |
| P0 | Trip persistence and audit logs | DONE | tripEvent table + writeTripEvent() on every state transition |
| P1 | Automated service score updates | DONE | trip complete increments tripsCompleted+1, serviceScore+10 in transaction |
| P1 | CSV ingestion parser with validation | DONE | Column presence + row-level validation; skippedRows in response |
| P1 | Standard API error contract | DONE | src/lib/api-error.ts; applied to all new/modified endpoints |
| P1 | Rate limiting and abuse protection | DONE | src/middleware.ts; in-memory per-IP; 6 endpoint rules |
| P1 | Observability (structured logs + metrics) | DONE | x-request-id header + JSON structured log per request in middleware |
| P2 | Background jobs for heavy processing | TODO | CSV processing and retry-safe workflows |

## Recommended Build Order

1. P0 ride request, driver availability, matching, accept/reject.
2. P0 trip lifecycle and GPS + panic endpoints.
3. P0 maps integration and realtime auth endpoint.
4. P1 admin operational endpoints and CSV processing.
5. P1 scoring automation, rate limits, observability.
6. P2 background workers and scale hardening.

## Definition of Done per Endpoint

- Request payload validated with explicit schema.
- Authentication and role checks enforced server-side.
- DB writes are transactional where needed.
- Returns stable response contract and error codes.
- Unit tests for core logic and edge cases.
- Integration test for success + auth failure path.
- Added to API docs and linked from dashboard/client call site.
