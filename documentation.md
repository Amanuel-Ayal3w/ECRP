# ECRP — Technical Documentation

> **Ethiopian Community Ride-sharing Platform**
>
> A full-stack Next.js monolith for voluntary, community-based ride-sharing in Ethiopia.
> Drivers with empty seats offer rides along their daily routes; passengers request pickups.
> No payments — drivers earn a **Service Score** for verified trip completions.

---

## Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. Project Structure](#3-project-structure)
- [4. Authentication System](#4-authentication-system)
  - [4.1 Three-Role Auth Separation](#41-three-role-auth-separation)
  - [4.2 Telegram OAuth Flow](#42-telegram-oauth-flow)
  - [4.3 Admin Email/Password Auth](#43-admin-emailpassword-auth)
  - [4.4 Session Management](#44-session-management)
  - [4.5 Client-Side Auth Helpers](#45-client-side-auth-helpers)
- [5. Middleware & Route Protection (RBAC)](#5-middleware--route-protection-rbac)
- [6. Rate Limiting](#6-rate-limiting)
- [7. Database Schema](#7-database-schema)
  - [7.1 Entity-Relationship Diagram](#71-entity-relationship-diagram)
  - [7.2 Table Reference](#72-table-reference)
  - [7.3 Migrations](#73-migrations)
- [8. Ride Matching Algorithm](#8-ride-matching-algorithm)
  - [8.1 Matching Flow](#81-matching-flow)
  - [8.2 Proximity Filtering & Scoring](#82-proximity-filtering--scoring)
  - [8.3 Gebeta Matrix API Integration](#83-gebeta-matrix-api-integration)
  - [8.4 Haversine Fallback](#84-haversine-fallback)
- [9. Trip State Machine](#9-trip-state-machine)
  - [9.1 State Diagram](#91-state-diagram)
  - [9.2 Transition Table](#92-transition-table)
  - [9.3 Audit Logging](#93-audit-logging)
- [10. Real-Time System (Pusher)](#10-real-time-system-pusher)
  - [10.1 Architecture](#101-architecture)
  - [10.2 Channel Authentication](#102-channel-authentication)
  - [10.3 GPS Telemetry Pipeline](#103-gps-telemetry-pipeline)
  - [10.4 Event Types](#104-event-types)
- [11. Geocoding & Maps](#11-geocoding--maps)
  - [11.1 Geocoding Pipeline](#111-geocoding-pipeline)
  - [11.2 API Proxy Routes](#112-api-proxy-routes)
- [12. Service Score System](#12-service-score-system)
- [13. Emergency Alert (Panic) System](#13-emergency-alert-panic-system)
- [14. Admin Dashboard](#14-admin-dashboard)
- [15. Driver Document Management](#15-driver-document-management)
- [16. API Reference](#16-api-reference)
- [17. Error Handling](#17-error-handling)
- [18. Environment Variables](#18-environment-variables)
- [19. Getting Started](#19-getting-started)

---

## 1. Architecture Overview

ECRP is built as a **Next.js 16 full-stack monolith** using the App Router pattern. The single deployable unit handles:

- Server-rendered React UI (Server Components first)
- RESTful API routes for all business logic
- Authentication via three independent Better Auth instances
- Real-time event delivery via Pusher (managed WebSockets)
- Database access via Drizzle ORM to PostgreSQL (Neon Serverless)
- Geospatial computations via Gebeta Maps and LocationIQ proxied APIs

```mermaid
graph TB
    subgraph "Browser (React 19)"
        UI["App Router Pages"]
        PusherClient["Pusher JS Client"]
        MapComponent["MapLibre GL<br/>(Gebeta Tiles)"]
    end

    subgraph "Next.js Server"
        API["API Routes<br/>/api/*"]
        Middleware["Middleware<br/>(proxy.ts)"]
        AuthPassenger["Better Auth<br/>Passenger Instance"]
        AuthDriver["Better Auth<br/>Driver Instance"]
        AuthAdmin["Better Auth<br/>Admin Instance"]
        StateMachine["Trip State Machine"]
        ScoreRoute["Route Scoring Engine"]
        TripEvents["Trip Event Bus"]
    end

    subgraph "External Services"
        DB[("PostgreSQL<br/>(Neon Serverless)")]
        Pusher["Pusher<br/>(Managed WebSockets)"]
        Gebeta["Gebeta Maps API<br/>(Matrix, Direction, Geocoding)"]
        LocationIQ["LocationIQ<br/>(Primary Geocoding)"]
        Telegram["Telegram OAuth"]
    end

    UI -->|HTTP| API
    UI --> MapComponent
    PusherClient <-->|WebSocket| Pusher
    API --> Middleware
    API --> AuthPassenger & AuthDriver & AuthAdmin
    API --> StateMachine
    API --> ScoreRoute
    API --> TripEvents
    TripEvents -->|trigger| Pusher
    ScoreRoute -->|Matrix API| Gebeta
    API -->|SQL| DB
    API -->|Geocode| LocationIQ
    API -->|Geocode Fallback| Gebeta
    API -->|OAuth| Telegram
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Server Components first** | Minimize client bundle; data fetched server-side wherever possible |
| **Three separate Better Auth instances** | Hard role separation with independent session tables and cookie prefixes |
| **Pusher for real-time** | Offloads WebSocket management; fits free-tier constraints with throttling |
| **Gebeta Maps proxied through API routes** | API keys never exposed to the browser |
| **Typed state machine** | Enforces valid ride lifecycle transitions with audit logging |
| **Neon Serverless PostgreSQL** | Scales with serverless deployments; WebSocket-based connection pooling |

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| Language | TypeScript | ^5 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | ^4 |
| Component Library | shadcn/ui + Base UI | — |
| Authentication | Better Auth | ^1.6.2 |
| Database ORM | Drizzle ORM | ^0.45.2 |
| Database | PostgreSQL (Neon Serverless) | — |
| Real-Time | Pusher + pusher-js | 5.x / 8.x |
| Maps | Gebeta Maps (`@gebeta/tiles`) | ^2.1.5 |
| Geocoding (Primary) | LocationIQ | — |
| Icons | Lucide React | ^1.8.0 |
| Toasts | Sonner | ^2.0.7 |
| Testing | Vitest + @vitest/coverage-v8 | ^2.1.9 |
| DB Migrations | Drizzle Kit | ^0.31.10 |

---

## 3. Project Structure

```
src/
├── app/
│   ├── api/                      # All API routes
│   │   ├── auth/[...all]/        #   Passenger Better Auth handler
│   │   ├── driver-auth/[...all]/ #   Driver Better Auth handler
│   │   ├── admin-auth/[...all]/  #   Admin Better Auth handler
│   │   ├── telegram/callback/    #   Telegram OAuth callback
│   │   ├── realtime/auth/        #   Pusher private-channel auth
│   │   ├── rides/                #   Ride request, match, accept, reject
│   │   ├── trips/                #   Trip lifecycle (start, complete, cancel, location, panic)
│   │   ├── driver/               #   Driver availability, route, profile, documents
│   │   ├── passenger/            #   Passenger profile
│   │   ├── maps/                 #   Gebeta Maps proxy (geocode, matrix)
│   │   ├── gebeta/               #   Gebeta search, direction, reverse geocode
│   │   └── admin/                #   Admin dashboard endpoints
│   ├── admin/                    # Admin dashboard pages
│   ├── driver/                   # Driver dashboard
│   ├── passenger/                # Passenger ride-request page
│   ├── trip/[id]/                # Active trip tracking page
│   ├── trips/                    # Trip history (driver & passenger)
│   ├── login/                    # Telegram login page
│   └── onboarding/               # Role selection & driver onboarding
├── components/
│   ├── app-map.tsx               # Gebeta map wrapper (lazy-loaded via next/dynamic)
│   ├── map-inner.tsx             # Inner map with markers & polylines
│   ├── bottom-nav.tsx            # Mobile navigation bar
│   ├── profile-sheet.tsx         # Slide-up profile panel
│   └── ui/                       # shadcn/ui primitives
├── db/
│   ├── index.ts                  # Drizzle client (Neon Serverless + WebSocket)
│   ├── schema.ts                 # All table definitions
│   ├── schema-admin.ts           # Re-exports for admin auth tables
│   ├── schema-driver.ts          # Re-exports for driver auth tables
│   ├── schema-passenger.ts       # Re-exports for passenger auth tables
│   ├── migrations/               # SQL migration files
│   └── seed.ts                   # Super admin seed script
└── lib/
    ├── auth.ts                   # Re-exports all three auth instances
    ├── auth-admin.ts             # Admin Better Auth instance
    ├── auth-driver.ts            # Driver Better Auth instance
    ├── auth-passenger.ts         # Passenger Better Auth instance
    ├── auth-client.ts            # Client-side auth helpers & hooks
    ├── auth-role.ts              # Role resolution utilities
    ├── admin-role.ts             # Admin role type guards
    ├── gebeta.ts                 # Gebeta Maps API client (geocode, direction, search)
    ├── locationiq.ts             # LocationIQ geocoding client
    ├── pusher-server.ts          # Pusher server-side singleton
    ├── pusher-client.ts          # Pusher browser-side singleton
    ├── score-route.ts            # Driver–passenger route matching & ranking
    ├── state-machine.ts          # Trip lifecycle state machine
    ├── trip-events.ts            # Pusher event emitter + audit log writer
    ├── generate-id.ts            # Timestamp + random ID generator
    └── api-error.ts              # Typed API error response helpers
```

---

## 4. Authentication System

### 4.1 Three-Role Auth Separation

ECRP uses **three independent Better Auth instances** that share a single PostgreSQL database but maintain completely separate user tables, session tables, and cookie namespaces. This provides hard role separation — a user cannot accidentally escalate from passenger to admin.

```mermaid
graph LR
    subgraph "Better Auth Instances"
        PA["authPassenger<br/>basePath: /api/auth<br/>cookie: ba-passenger"]
        DA["authDriver<br/>basePath: /api/driver-auth<br/>cookie: ba-driver"]
        AA["authAdmin<br/>basePath: /api/admin-auth<br/>cookie: ba-admin"]
    end

    subgraph "Database Tables"
        PT["passenger_user<br/>passenger_session<br/>passenger_account<br/>passenger_verification"]
        DT["driver_user<br/>driver_session<br/>driver_account<br/>driver_verification"]
        AT["admin_user<br/>admin_session<br/>admin_account<br/>admin_verification"]
    end

    PA --> PT
    DA --> DT
    AA --> AT

    style PA fill:#e3f2fd
    style DA fill:#e8f5e9
    style AA fill:#fff3e0
```

| Role | Cookie Prefix | Auth Route | Login Method | Session TTL |
|---|---|---|---|---|
| Passenger | `ba-passenger` | `/api/auth` | Telegram OAuth | 7 days |
| Driver | `ba-driver` | `/api/driver-auth` | Telegram OAuth | 7 days |
| Admin | `ba-admin` | `/api/admin-auth` | Email + Password | 7 days |

Each auth instance uses:
- **Drizzle adapter** for database access with role-specific schema re-exports
- **`nextCookies()` plugin** for seamless Next.js cookie handling
- **`emailAndPassword` enabled** with minimum 8-character passwords
- **Session refresh** every 24 hours (`updateAge: 60 * 60 * 24`)

### 4.2 Telegram OAuth Flow

Passengers and drivers authenticate exclusively via the Telegram Login Widget. The flow uses **synthetic emails** (`tg_{telegramId}@telegram.local`) since Telegram doesn't provide email addresses.

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant TG as Telegram Widget
    participant CB as /api/telegram/callback
    participant DB as PostgreSQL

    U->>TG: Click "Login with Telegram"
    TG->>TG: User authorizes bot
    TG->>CB: GET /api/telegram/callback?id=...&hash=...&role=driver

    CB->>CB: Verify HMAC-SHA256 hash<br/>using TELEGRAM_BOT_TOKEN
    CB->>CB: Check auth_date < 24h
    CB->>CB: Generate synthetic email:<br/>tg_{id}@telegram.local

    alt User exists
        CB->>DB: UPDATE name, image
    else New user
        CB->>DB: INSERT user + account
    end

    CB->>DB: INSERT session (7-day TTL)
    CB->>CB: Sign session token with<br/>HMAC-SHA256(BETTER_AUTH_SECRET)
    CB-->>U: Set-Cookie: ba-{role}.session_token<br/>302 Redirect → /{role}
```

**Telegram Hash Verification:**

1. Extract all query params except `hash`
2. Sort keys alphabetically, join as `key=value\n`
3. Compute `HMAC-SHA256(SHA256(botToken), dataCheckString)`
4. Compare with the provided `hash` parameter

**Cookie Security:**
- `HttpOnly: true` — no JavaScript access
- `Secure: true` when `BETTER_AUTH_URL` starts with `https://`
- `SameSite: lax` — CSRF protection
- `__Secure-` prefix added automatically for HTTPS deployments
- Session token is signed: `{token}.{base64(HMAC-SHA256(token, secret))}`

### 4.3 Admin Email/Password Auth

Admins authenticate with email and password through Better Auth's built-in `emailAndPassword` provider. The initial super admin is created via the seed script:

```bash
# Required env vars (no defaults)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-password-here

npm run db:seed
```

The seed script:
1. Creates an admin user via `authAdmin.api.signUpEmail`
2. Promotes the user to `super_admin` role via direct DB update
3. Only super admins can create additional admin accounts

**Admin Roles:**

| Role | Permissions |
|---|---|
| `admin` | View dashboard, manage trips, resolve alerts |
| `super_admin` | All admin permissions + create/manage other admins |

### 4.4 Session Management

```mermaid
graph TD
    A["Request arrives"] --> B{Has session cookie?}
    B -->|No| C["Redirect to /login"]
    B -->|Yes| D["Extract signed token"]
    D --> E["Verify HMAC signature"]
    E -->|Invalid| C
    E -->|Valid| F["Query session table"]
    F --> G{Session expired?}
    G -->|Yes| C
    G -->|No| H{Session age > 24h?}
    H -->|Yes| I["Refresh session<br/>(updateAge)"]
    H -->|No| J["Proceed with request"]
    I --> J
```

- Sessions expire after **7 days** (`expiresIn: 60 * 60 * 24 * 7`)
- Sessions auto-refresh after **24 hours** of inactivity (`updateAge: 60 * 60 * 24`)
- Each session records `ipAddress` and `userAgent` for audit purposes
- Sessions cascade-delete when the user is deleted

### 4.5 Client-Side Auth Helpers

Three client-side auth instances are created in `src/lib/auth-client.ts`:

```typescript
passengerAuthClient  // basePath: /api/auth
driverAuthClient     // basePath: /api/driver-auth
adminAuthClient      // basePath: /api/admin-auth
```

Pre-bound hooks for React components:
- `usePassengerSession` — returns current passenger session
- `useDriverSession` — returns current driver session
- `useAdminSession` — returns current admin session

---

## 5. Middleware & Route Protection (RBAC)

The middleware layer (`src/proxy.ts`) provides **Role-Based Access Control (RBAC)** and is the central gatekeeper for all requests.

```mermaid
flowchart TD
    REQ["Incoming Request"] --> IS_API{Is /api/* ?}

    IS_API -->|Yes| RL["Check Rate Limit"]
    RL --> RL_RESULT{Rate Limited?}
    RL_RESULT -->|Yes| R429["429 Too Many Requests<br/>+ Retry-After header"]
    RL_RESULT -->|No| LOG["Log request<br/>(JSON structured)"]
    LOG --> API_PASS["NextResponse.next()<br/>+ x-request-id"]

    IS_API -->|No| ROLE{requiredRoleForPath?}

    ROLE -->|passenger| CHECK_P["Check ba-passenger cookie<br/>+ authPassenger.getSession"]
    ROLE -->|driver| CHECK_D["Check ba-driver cookie<br/>+ authDriver.getSession"]
    ROLE -->|either| CHECK_BOTH["Check BOTH cookies<br/>(passenger OR driver)"]
    ROLE -->|null| IS_ADMIN{Is /admin/* ?}

    CHECK_P -->|No session| LOGIN_P["Redirect /login?as=passenger"]
    CHECK_D -->|No session| LOGIN_D["Redirect /login?as=driver"]
    CHECK_BOTH -->|Neither session| LOGIN["Redirect /login"]

    CHECK_P -->|Valid| PASS["NextResponse.next()"]
    CHECK_D -->|Valid| PASS
    CHECK_BOTH -->|Valid| PASS

    IS_ADMIN -->|/admin/login| ADMIN_LOGIN["Check admin session<br/>→ redirect /admin if logged in"]
    IS_ADMIN -->|/admin/*| ADMIN_CHECK["Check admin session<br/>+ isAdminPanelRole()"]
    IS_ADMIN -->|No| PASS

    ADMIN_CHECK -->|No session| ADMIN_REDIRECT["Redirect /admin/login"]
    ADMIN_CHECK -->|Not admin role| HOME["Redirect /"]
    ADMIN_CHECK -->|Valid| PASS
```

**Route → Role Mapping:**

| Path Pattern | Required Role |
|---|---|
| `/passenger`, `/passenger/*` | `passenger` |
| `/driver`, `/driver/*` | `driver` |
| `/trips/passenger`, `/trips/passenger/*` | `passenger` |
| `/trips/driver`, `/trips/driver/*` | `driver` |
| `/trip/*`, `/trips` | `either` (passenger OR driver) |
| `/admin/*` (except `/admin/login`) | `admin` or `super_admin` |
| `/admin/login` | Public (redirects if already authenticated) |

**Request ID Tracking:**
Every response includes an `x-request-id` header (from the request's `x-request-id` or a newly generated UUID), enabling end-to-end request tracing.

---

## 6. Rate Limiting

ECRP implements **in-memory, per-IP rate limiting** in the middleware layer. Limits are enforced per API route pattern using a sliding-window token bucket.

```mermaid
flowchart LR
    REQ["API Request"] --> EXTRACT["Extract client IP<br/>(x-forwarded-for / x-real-ip)"]
    EXTRACT --> NORMALIZE["Normalize path<br/>(replace IDs with [id])"]
    NORMALIZE --> KEY["Rate limit key:<br/>IP:normalized_path"]
    KEY --> LOOKUP{Bucket exists<br/>& not expired?}
    LOOKUP -->|No| CREATE["Create bucket<br/>count=1, expires=now+window"]
    LOOKUP -->|Yes| CHECK{count >= limit?}
    CHECK -->|Yes| BLOCK["429 Too Many Requests<br/>Retry-After: remaining_seconds"]
    CHECK -->|No| INCREMENT["Increment count"]
    CREATE --> ALLOW["Allow request"]
    INCREMENT --> ALLOW
```

### Rate Limit Rules

| Route Pattern | Limit | Window | Purpose |
|---|---|---|---|
| `/api/auth/*` | 10 req | 60 sec | Prevent brute-force on passenger auth |
| `/api/driver-auth/*` | 10 req | 60 sec | Prevent brute-force on driver auth |
| `/api/admin-auth/*` | 5 req | 60 sec | Stricter limit for admin auth |
| `/api/rides/request` | 5 req | 60 sec | Prevent ride request spam |
| `/api/trips/[id]/location` | 30 req | 10 sec | Allow GPS updates but cap throughput |
| `/api/trips/[id]/panic` | 3 req | 60 sec | Prevent panic button spam |

**Implementation Details:**
- **Storage:** In-memory `Map<string, RateLimitBucket>` (resets on server restart)
- **Key normalization:** Dynamic path segments (UUIDs/IDs) are replaced with `[id]` so all trips share a rate limit key pattern
- **IP extraction:** `x-forwarded-for` (first IP) → `x-real-ip` → `"unknown"`
- **Response format:**
  ```json
  {
    "error": "Too many requests.",
    "code": "RATE_LIMITED",
    "status": 429
  }
  ```
  With `Retry-After` header indicating seconds until the window resets.

---

## 7. Database Schema

### 7.1 Entity-Relationship Diagram

```mermaid
erDiagram
    passenger_user {
        text id PK
        text name
        text email UK
        boolean emailVerified
        text image
        timestamp createdAt
        timestamp updatedAt
    }

    passenger_session {
        text id PK
        timestamp expiresAt
        text token UK
        text ipAddress
        text userAgent
        text userId FK
        timestamp createdAt
        timestamp updatedAt
    }

    passenger_account {
        text id PK
        text accountId
        text providerId
        text userId FK
        text accessToken
        text refreshToken
        text password
        timestamp createdAt
        timestamp updatedAt
    }

    passenger_verification {
        text id PK
        text identifier
        text value
        timestamp expiresAt
    }

    driver_user {
        text id PK
        text name
        text email UK
        boolean emailVerified
        text image
        timestamp createdAt
        timestamp updatedAt
    }

    driver_session {
        text id PK
        timestamp expiresAt
        text token UK
        text ipAddress
        text userAgent
        text userId FK
        timestamp createdAt
        timestamp updatedAt
    }

    driver_account {
        text id PK
        text accountId
        text providerId
        text userId FK
        text accessToken
        text refreshToken
        text password
        timestamp createdAt
        timestamp updatedAt
    }

    driver_verification {
        text id PK
        text identifier
        text value
        timestamp expiresAt
    }

    driver_profile {
        text userId PK_FK
        text plateNumber UK
        text vehicleModel
        integer capacity
        text licenseNumber
        integer serviceScore
        integer tripsCompleted
        timestamp updatedAt
    }

    driver_availability {
        text userId PK_FK
        boolean isOnline
        text routeStart
        text routeEnd
        real routeStartLat
        real routeStartLng
        real routeEndLat
        real routeEndLng
        timestamp updatedAt
    }

    admin_user {
        text id PK
        text name
        text email UK
        boolean emailVerified
        text image
        text role
        timestamp createdAt
        timestamp updatedAt
    }

    admin_session {
        text id PK
        timestamp expiresAt
        text token UK
        text userId FK
        timestamp createdAt
        timestamp updatedAt
    }

    admin_account {
        text id PK
        text accountId
        text providerId
        text userId FK
        text password
        timestamp createdAt
        timestamp updatedAt
    }

    admin_verification {
        text id PK
        text identifier
        text value
        timestamp expiresAt
    }

    ride_request {
        text id PK
        text passengerId FK
        text pickup
        text destination
        text status
        text matchedDriverId FK
        timestamp acceptedAt
        timestamp startedAt
        timestamp endedAt
        real currentLat
        real currentLng
        timestamp createdAt
        timestamp updatedAt
    }

    ride_rejection {
        text id PK
        text rideId FK
        text driverId FK
        timestamp createdAt
    }

    admin_alert {
        text id PK
        text tripId FK
        text userName
        text senderRole
        text location
        text coordinates
        text severity
        boolean resolved
        text resolvedBy FK
        timestamp resolvedAt
        timestamp createdAt
        timestamp updatedAt
    }

    driver_document {
        text id PK
        text userId FK
        text docType
        text originalName
        text filePath
        text mimeType
        bigint fileSize
        text status
        timestamp uploadedAt
        text reviewedByAdminId FK
        text reviewedByAdminName
        timestamp reviewedAt
    }

    trip_event {
        text id PK
        text rideId FK
        text actorId
        text actorRole
        text event
        text metadata
        timestamp createdAt
    }

    passenger_user ||--o{ passenger_session : "has sessions"
    passenger_user ||--o{ passenger_account : "has accounts"
    passenger_user ||--o{ ride_request : "creates rides"

    driver_user ||--o{ driver_session : "has sessions"
    driver_user ||--o{ driver_account : "has accounts"
    driver_user ||--|| driver_profile : "has profile"
    driver_user ||--|| driver_availability : "has availability"
    driver_user ||--o{ driver_document : "uploads documents"
    driver_user ||--o{ ride_rejection : "rejects rides"

    admin_user ||--o{ admin_session : "has sessions"
    admin_user ||--o{ admin_account : "has accounts"
    admin_user ||--o{ admin_alert : "resolves alerts"

    ride_request ||--o{ ride_rejection : "has rejections"
    ride_request ||--o{ trip_event : "has events"
    ride_request ||--o| admin_alert : "triggers alerts"
    ride_request }o--o| driver_user : "matched to driver"
```

### 7.2 Table Reference

#### Auth Tables (per role × 4 tables = 12 total)

Each role (passenger, driver, admin) has four Better Auth tables:

| Table | Purpose | Key Columns |
|---|---|---|
| `{role}_user` | User identity | `id`, `name`, `email` (unique), `emailVerified`, `image` |
| `{role}_session` | Active sessions | `id`, `token` (unique), `userId` → user, `expiresAt`, `ipAddress`, `userAgent` |
| `{role}_account` | Auth providers | `id`, `providerId` (telegram/credential), `accountId`, `userId` → user, `password` |
| `{role}_verification` | Email verification tokens | `id`, `identifier`, `value`, `expiresAt` |

**Admin-specific:** `admin_user` has an additional `role` column (`admin` | `super_admin`).

#### Business Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `driver_profile` | Vehicle & reputation data | `userId` (PK, FK → driver_user), `plateNumber` (unique), `vehicleModel`, `capacity`, `licenseNumber`, `serviceScore`, `tripsCompleted` |
| `driver_availability` | Online status & route | `userId` (PK, FK → driver_user), `isOnline`, `routeStart/End` (text), `routeStartLat/Lng`, `routeEndLat/Lng` |
| `ride_request` | Core ride lifecycle | `id`, `passengerId` → passenger_user, `pickup`, `destination`, `status`, `matchedDriverId` → driver_user, timestamps (`acceptedAt`, `startedAt`, `endedAt`), `currentLat/Lng` |
| `ride_rejection` | Prevents re-matching | `id`, `rideId` → ride_request, `driverId` → driver_user |
| `admin_alert` | Panic button alerts | `id`, `tripId` → ride_request, `userName`, `senderRole`, `location`, `coordinates`, `severity`, `resolved`, `resolvedBy` → admin_user |
| `driver_document` | Uploaded documents | `id`, `userId` → driver_user, `docType` (license\|registration\|insurance), `filePath`, `status` (pending\|verified\|rejected), `reviewedByAdminId` |
| `trip_event` | Full audit log | `id`, `rideId` → ride_request, `actorId`, `actorRole` (passenger\|driver\|system), `event`, `metadata` (JSON text) |

### 7.3 Migrations

Migrations are managed by **Drizzle Kit** and stored in `src/db/migrations/`:

| Migration | Description |
|---|---|
| `0000_fair_moonstone.sql` | Initial schema: auth tables, ride_request, driver_profile, admin_alert |
| `0001_exotic_ender_wiggin.sql` | Driver documents, ride_rejection |
| `0002_trip_location.sql` | Add `currentLat`/`currentLng` to ride_request |
| `0003_trip_event_audit.sql` | Trip event audit log table |
| `0004_driver_route_coords.sql` | Add lat/lng columns to driver_availability |

```bash
npm run db:generate   # Generate migration from schema changes
npm run db:push       # Push schema directly (dev)
npm run db:migrate    # Run pending migrations (production)
npm run db:studio     # Open Drizzle Studio GUI
```

---

## 8. Ride Matching Algorithm

### 8.1 Matching Flow

```mermaid
sequenceDiagram
    participant P as Passenger
    participant API as /api/rides/request
    participant DB as PostgreSQL
    participant GEO as LocationIQ / Gebeta
    participant MATRIX as Gebeta Matrix API

    P->>API: POST { pickup, destination,<br/>pickupLat?, pickupLng?,<br/>destLat?, destLng? }
    API->>API: Validate session (passenger)

    API->>DB: Query busy drivers<br/>(status IN matched, accepted, in_progress)
    API->>DB: Query online drivers<br/>(isOnline = true)
    API->>API: Filter out busy drivers

    alt Coordinates not provided
        API->>GEO: Geocode pickup → {lat, lng}
        API->>GEO: Geocode destination → {lat, lng}
    end

    API->>MATRIX: Matrix distances:<br/>pickup → all driver route starts
    API->>MATRIX: Matrix distances:<br/>destination → all driver route ends

    API->>API: Filter: both distances ≤ 1km
    API->>API: Sort by combined distance (ascending)

    API->>DB: INSERT ride_request<br/>(status: matched or requested)
    API->>DB: INSERT trip_event (audit log)
    API-->>P: { ride, matched: true/false }
```

### 8.2 Proximity Filtering & Scoring

The matching algorithm in `src/lib/score-route.ts` evaluates each online driver's declared route against the passenger's request:

```mermaid
flowchart TD
    START["Online drivers pool"] --> FILTER_BUSY["Remove busy drivers<br/>(already on active trips)"]
    FILTER_BUSY --> FILTER_COORDS["Remove drivers without<br/>stored lat/lng coordinates"]
    FILTER_COORDS --> MATRIX_PICKUP["Gebeta Matrix API:<br/>passenger pickup → each driver's route start"]
    FILTER_COORDS --> MATRIX_DEST["Gebeta Matrix API:<br/>passenger destination → each driver's route end"]

    MATRIX_PICKUP --> FALLBACK_P{Matrix returned<br/>Infinity?}
    MATRIX_DEST --> FALLBACK_D{Matrix returned<br/>Infinity?}

    FALLBACK_P -->|Yes| HAVERSINE_P["Haversine fallback<br/>(straight-line distance)"]
    FALLBACK_P -->|No| COMBINE
    FALLBACK_D -->|Yes| HAVERSINE_D["Haversine fallback<br/>(straight-line distance)"]
    FALLBACK_D -->|No| COMBINE

    HAVERSINE_P --> COMBINE
    HAVERSINE_D --> COMBINE

    COMBINE["Compute distances"] --> PROX{Both distances<br/>≤ 1 km?}
    PROX -->|No| EXCLUDE["Exclude driver"]
    PROX -->|Yes| RANK["Add to eligible list"]

    RANK --> SORT["Sort by (pickupGap + destGap)<br/>ascending"]
    SORT --> BEST["Return ranked drivers<br/>(closest first)"]
```

**Eligibility Criteria:**
1. Driver must be **online** (`isOnline = true`)
2. Driver must **not** be on an active trip (status ∈ {matched, accepted, in_progress})
3. Driver must have **stored route coordinates** (lat/lng for both start and end)
4. Road distance from **passenger pickup** to **driver route start** ≤ **1 km**
5. Road distance from **passenger destination** to **driver route end** ≤ **1 km**

### 8.3 Gebeta Matrix API Integration

The Gebeta Matrix API computes road distances from one origin to multiple destinations in batches:

- **Batch size:** 24 destinations per request (API limit: 25 points = 1 origin + 24)
- **Timeout:** 8 seconds per batch
- **URL format:** `https://mapapi.gebeta.app/api/v1/route/matrix?apiKey=...&la1=...&lo1=...&la2=...&lo2=...`
- **Response parsing:** Each destination entry includes a `distance` field (meters), converted to km
- **Error handling:** Failed batches silently return `Infinity`; outer code falls back to Haversine

### 8.4 Haversine Fallback

When the Gebeta Matrix API is unavailable or returns no data, the system falls back to the **Haversine formula** for great-circle distance:

```
R = 6371 km (Earth's radius)
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
distance = R × 2 × arcsin(√a)
```

- Accuracy: ~0.5% for city-scale distances
- Used when: Matrix API key missing, timeout, or individual pair has no route data

---

## 9. Trip State Machine

### 9.1 State Diagram

The trip lifecycle is enforced by a typed state machine in `src/lib/state-machine.ts`:

```mermaid
stateDiagram-v2
    [*] --> requested : Passenger submits ride

    requested --> matched : match (driver found)
    requested --> accepted : accept (driver accepts)
    requested --> cancelled : cancel

    matched --> accepted : accept
    matched --> requested : reject (returns to pool)
    matched --> cancelled : cancel

    accepted --> in_progress : start
    accepted --> completed : complete
    accepted --> cancelled : cancel

    in_progress --> completed : complete
    in_progress --> cancelled : cancel

    completed --> [*]
    cancelled --> [*]
```

### 9.2 Transition Table

| Current Status | Event | Next Status | Actor |
|---|---|---|---|
| `requested` | `match` | `matched` | System |
| `requested` | `accept` | `accepted` | Driver |
| `requested` | `reject` | `requested` | Driver (clears matchedDriverId) |
| `requested` | `cancel` | `cancelled` | Passenger or Driver |
| `matched` | `accept` | `accepted` | Driver |
| `matched` | `reject` | `requested` | Driver (returns to matching pool) |
| `matched` | `cancel` | `cancelled` | Passenger or Driver |
| `accepted` | `start` | `in_progress` | Driver |
| `accepted` | `complete` | `completed` | Driver |
| `accepted` | `cancel` | `cancelled` | Passenger or Driver |
| `in_progress` | `complete` | `completed` | Driver |
| `in_progress` | `cancel` | `cancelled` | Passenger or Driver |
| `completed` | — | *(terminal)* | — |
| `cancelled` | — | *(terminal)* | — |

**Cancelable statuses:** `requested`, `matched`, `accepted`, `in_progress`
**Acceptable statuses:** `requested`, `matched`

Invalid transitions return a `400 INVALID_TRANSITION` error with the reason string.

### 9.3 Audit Logging

Every state transition is recorded in the `trip_event` table:

```mermaid
flowchart LR
    TRANSITION["State Transition<br/>(e.g., accept, start, complete)"] --> WRITE["writeTripEvent()"]
    WRITE --> DB[("trip_event table")]
    WRITE --> DETAILS["Records:<br/>• rideId<br/>• actorId<br/>• actorRole (passenger|driver|system)<br/>• event name<br/>• metadata (JSON)"]

    TRANSITION --> EMIT["emitTripEvent()"]
    EMIT --> PUSHER["Pusher trigger<br/>private-trip.{rideId}"]
```

The `trip_event` table captures:
- **Who** performed the action (`actorId`, `actorRole`)
- **What** happened (`event`: match, accept, reject, start, complete, cancel)
- **When** it happened (`createdAt`)
- **Context** (`metadata`: JSON with previous status, timestamps, scores, etc.)

---

## 10. Real-Time System (Pusher)

### 10.1 Architecture

ECRP uses **Pusher** as a managed WebSocket service to deliver real-time events between trip participants.

```mermaid
graph TB
    subgraph "Driver Browser"
        GEO["navigator.geolocation<br/>(every 5-7 seconds)"]
        DPC["Pusher Client<br/>(subscribes)"]
    end

    subgraph "Next.js API Routes"
        LOC["/api/trips/[id]/location"]
        PANIC["/api/trips/[id]/panic"]
        ACCEPT["/api/rides/[id]/accept"]
        CANCEL["/api/trips/[id]/cancel"]
        COMPLETE["/api/trips/[id]/complete"]
        AUTH_RT["/api/realtime/auth"]
    end

    subgraph "Pusher (Managed WebSockets)"
        CH["Channel:<br/>private-trip.{rideId}"]
    end

    subgraph "Passenger Browser"
        PPC["Pusher Client<br/>(subscribes)"]
        MAP["Map Marker<br/>(updates position)"]
    end

    subgraph "Admin Dashboard"
        ADM["Pusher Client<br/>(subscribes to alerts)"]
    end

    GEO -->|POST lat/lng| LOC
    LOC -->|trigger| CH
    PANIC -->|trigger| CH
    ACCEPT -->|trigger| CH
    CANCEL -->|trigger| CH
    COMPLETE -->|trigger| CH

    CH -->|location_update| PPC
    CH -->|status_change| PPC & DPC
    PPC --> MAP

    DPC & PPC -->|auth request| AUTH_RT
    AUTH_RT -->|HMAC-SHA256 signature| DPC & PPC
```

### 10.2 Channel Authentication

Pusher private channels require server-side authentication:

```mermaid
sequenceDiagram
    participant Client as Browser (pusher-js)
    participant Auth as /api/realtime/auth
    participant DB as PostgreSQL

    Client->>Auth: POST socket_id=...&channel_name=private-trip.{rideId}
    Auth->>Auth: Verify passenger OR driver session
    Auth->>DB: Lookup ride_request by rideId
    Auth->>Auth: Check user is participant<br/>(passengerId or matchedDriverId)
    Auth->>Auth: HMAC-SHA256(secret, "socketId:channelName")
    Auth-->>Client: { auth: "appKey:signature" }
```

**Key Details:**
- Channel format: `private-trip.{rideId}` (dot-separated, not hyphen)
- Only trip participants (passenger or matched driver) can subscribe
- Auth endpoint accepts both `application/x-www-form-urlencoded` and JSON body
- Client configures: `authEndpoint: "/api/realtime/auth"`, `authTransport: "ajax"`

### 10.3 GPS Telemetry Pipeline

```mermaid
sequenceDiagram
    participant Driver as Driver Browser
    participant API as /api/trips/[id]/location
    participant DB as PostgreSQL
    participant Pusher as Pusher
    participant Passenger as Passenger Browser
    participant Map as MapLibre GL

    loop Every 5-7 seconds (throttled)
        Driver->>Driver: navigator.geolocation.getCurrentPosition()
        Driver->>API: POST { lat, lng }
        API->>API: Validate driver session
        API->>API: Validate driver is assigned to trip
        API->>API: Validate trip status = in_progress
        API->>API: Validate lat ∈ [-90, 90], lng ∈ [-180, 180]
        API->>DB: UPDATE ride_request<br/>SET currentLat, currentLng
        API->>Pusher: trigger("location_update",<br/>{ lat, lng, updatedAt })
        Pusher-->>Passenger: location_update event
        Passenger->>Map: Update driver marker position
    end
```

**Throttling Strategy:**
- Client-side throttle: 5–7 second intervals (configured to stay within Pusher free-tier limits)
- Rate limit: 30 requests per 10 seconds per IP (middleware)

### 10.4 Event Types

| Event Name | Trigger | Payload | Channel |
|---|---|---|---|
| `location_update` | Driver posts GPS | `{ lat, lng, updatedAt }` | `private-trip.{rideId}` |
| `status_change` | Trip state transition | `{ status, endedAt? }` | `private-trip.{rideId}` |

**Server-Side Configuration:**
- Singleton Pusher instance (cached on `globalThis` for HMR stability)
- Required env vars: `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`
- Default cluster: `mt1`
- TLS always enabled

---

## 11. Geocoding & Maps

### 11.1 Geocoding Pipeline

ECRP uses a **dual-provider geocoding strategy** with automatic fallback:

```mermaid
flowchart TD
    INPUT["Place name (e.g., 'Bole, Addis Ababa')"] --> LIQ{LocationIQ<br/>API key set?}

    LIQ -->|Yes| LIQ_REQ["LocationIQ Search API<br/>countrycodes=et, limit=1"]
    LIQ -->|No| GEBETA_REQ

    LIQ_REQ --> LIQ_OK{Success?}
    LIQ_OK -->|Yes| RESULT["Return { lat, lng }"]
    LIQ_OK -->|No| GEBETA_REQ["Gebeta Geocoding API<br/>4s timeout"]

    GEBETA_REQ --> GEBETA_OK{Success?}
    GEBETA_OK -->|Yes| RESULT
    GEBETA_OK -->|No| NULL["Return null"]
```

**LocationIQ (Primary):**
- Endpoint: `https://us1.locationiq.com/v1/search`
- Filters results to Ethiopia (`countrycodes=et`)
- 5-second timeout
- Returns up to 5 results for search, 1 for geocoding

**Gebeta (Fallback):**
- Endpoint: `https://mapapi.gebeta.app/api/v1/route/geocoding`
- 4-second timeout
- Used when LocationIQ key is not set or request fails

**Reverse Geocoding:**
- LocationIQ: `https://us1.locationiq.com/v1/reverse`
- Returns first comma-separated component of `display_name`

### 11.2 API Proxy Routes

All external map API calls are proxied through Next.js API routes to protect API keys:

```mermaid
flowchart LR
    subgraph "Browser (No API Keys)"
        B1["Place search"]
        B2["Reverse geocode"]
        B3["Route directions"]
        B4["Distance matrix"]
    end

    subgraph "Next.js Proxy Routes"
        P1["/api/gebeta/search"]
        P2["/api/gebeta/revgeocode"]
        P3["/api/gebeta/direction"]
        P4["/api/maps/geocode"]
        P5["/api/maps/matrix"]
    end

    subgraph "External APIs (Server-side only)"
        E1["LocationIQ Search"]
        E2["LocationIQ Reverse"]
        E3["Gebeta Direction"]
        E4["Gebeta Geocoding"]
        E5["Gebeta Matrix"]
    end

    B1 --> P1 --> E1
    B2 --> P2 --> E2
    B3 --> P3 --> E3
    B4 --> P4 --> E4
    B4 --> P5 --> E5
```

**Client-Side Map Rendering:**
- Component: `src/components/app-map.tsx`
- Library: MapLibre GL via `@gebeta/tiles`
- **Lazy-loaded** via `next/dynamic` to prevent blocking initial page render
- Supports: markers, polylines (route display), real-time marker updates

---

## 12. Service Score System

The Service Score is a reputation metric earned by drivers for verified trip completions.

```mermaid
flowchart TD
    COMPLETE["Driver completes trip<br/>(POST /api/trips/[id]/complete)"] --> VALIDATE["Validate state machine:<br/>in_progress/accepted → completed"]

    VALIDATE --> TX["Database Transaction"]

    TX --> UPDATE_RIDE["UPDATE ride_request<br/>status = 'completed'<br/>endedAt = now"]
    TX --> CHECK_PROFILE{Driver profile<br/>exists?}

    CHECK_PROFILE -->|Yes| INCREMENT["UPDATE driver_profile<br/>tripsCompleted += 1<br/>serviceScore += 10"]
    CHECK_PROFILE -->|No| SEED["INSERT driver_profile<br/>tripsCompleted = 1<br/>serviceScore = 10<br/>(minimal profile)"]

    INCREMENT --> AUDIT["Write trip_event<br/>(scoreBonusApplied: 10)"]
    SEED --> AUDIT

    AUDIT --> EMIT["Emit Pusher event<br/>status_change: completed"]
```

**Scoring Rules:**
- **+10 points** per verified trip completion (`COMPLETION_SCORE_BONUS = 10`)
- Score and trip count updated **atomically** in a database transaction
- If driver has no profile (edge case), a minimal profile is auto-created
- **Admin CSV ingestion** can adjust scores for traffic violations (via admin dashboard)

**Admin Score Adjustment:**
Admins can upload CSV files containing traffic authority penalty data:
- CSV format: license plate, violation type
- System matches drivers by plate number
- Scores are adjusted mathematically based on violation severity

---

## 13. Emergency Alert (Panic) System

```mermaid
sequenceDiagram
    participant User as Passenger/Driver
    participant API as /api/trips/[id]/panic
    participant DB as PostgreSQL
    participant Pusher as Pusher
    participant Admin as Admin Dashboard

    User->>API: POST { location, coordinates, severity }
    API->>API: Verify passenger OR driver session
    API->>DB: Lookup ride_request
    API->>API: Verify user is trip participant

    API->>DB: Lookup sender's name<br/>(passenger_user or driver_user)

    API->>DB: INSERT admin_alert<br/>{tripId, userName, senderRole,<br/>location, coordinates, severity,<br/>resolved: false}

    API-->>User: { ok: true, alertId }

    Note over Admin: Admin views unresolved alerts<br/>GET /api/admin/alerts

    Admin->>API: POST /api/admin/alerts/[id]/resolve
    API->>DB: UPDATE admin_alert<br/>resolved=true, resolvedBy, resolvedAt
```

**Alert Properties:**
- **Severity levels:** `low`, `medium`, `high` (defaults to `high` for panic)
- **Sender role:** Tracked as `driver` or `passenger`
- **Location data:** Both text description and coordinates string
- **Resolution:** Admin marks as resolved with their user ID and timestamp
- **Rate limited:** 3 requests per 60 seconds per IP

---

## 14. Admin Dashboard

The admin dashboard (`/admin`) provides operational oversight of the entire platform.

```mermaid
graph TB
    subgraph "Admin Dashboard Pages"
        OVERVIEW["Overview<br/>/admin"]
        USERS["Active Users<br/>/admin/users"]
        TRIPS["Active Trips<br/>/admin/trips"]
        ALERTS["Alerts<br/>/admin/alerts"]
        ADMINS["Admin Management<br/>/admin/admins"]
    end

    subgraph "API Endpoints"
        A1["GET /api/admin/overview"]
        A2["GET /api/admin/active-users"]
        A3["GET /api/admin/active-trips"]
        A4["GET /api/admin/alerts"]
        A5["POST /api/admin/alerts/[id]/resolve"]
        A6["GET /api/admin/admins"]
        A7["POST /api/admin/admins"]
        A8["GET /api/admin/me"]
        A9["GET /api/admin/documents"]
        A10["POST /api/admin/documents/[id]"]
    end

    OVERVIEW --> A1
    USERS --> A2
    TRIPS --> A3
    ALERTS --> A4 & A5
    ADMINS --> A6 & A7
```

**Overview Metrics (GET /api/admin/overview):**

| Metric | Description |
|---|---|
| Active Trips | Rides with status: requested, matched, accepted, in_progress |
| Online Users | Drivers with `isOnline = true` |
| Today's Trips | Completed/cancelled trips since midnight |
| Open Alerts | Unresolved panic alerts |
| Recent Activity | Last 6 finished trips + last 3 alerts |
| User Counts | Total passengers, total drivers |

**Access Control:**
- All admin endpoints require `admin` or `super_admin` role
- Admin creation restricted to `super_admin` only
- Password minimum: 8 characters
- Email must be unique and valid format

---

## 15. Driver Document Management

Drivers can upload verification documents that are reviewed by admins.

```mermaid
stateDiagram-v2
    [*] --> pending : Driver uploads document
    pending --> verified : Admin approves
    pending --> rejected : Admin rejects
    verified --> [*]
    rejected --> [*]
```

**Document Types:**
| Type | Description |
|---|---|
| `license` | Driver's license |
| `registration` | Vehicle registration |
| `insurance` | Vehicle insurance |

**Stored Fields:**
- `originalName` — original filename
- `filePath` — server storage path
- `mimeType` — file MIME type
- `fileSize` — size in bytes
- `reviewedByAdminId` / `reviewedByAdminName` — admin who reviewed
- `reviewedAt` — review timestamp

**API Endpoints:**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/driver/documents` | List driver's documents |
| `POST` | `/api/driver/documents` | Upload new document |
| `GET` | `/api/driver/documents/[id]` | Get single document |
| `DELETE` | `/api/driver/documents/[id]` | Delete document |
| `GET` | `/api/admin/documents` | List all documents (admin) |
| `POST` | `/api/admin/documents/[id]` | Review document (admin) |

---

## 16. API Reference

### Authentication

| Method | Path | Description | Auth |
|---|---|---|---|
| `*` | `/api/auth/[...all]` | Passenger Better Auth handler | Public |
| `*` | `/api/driver-auth/[...all]` | Driver Better Auth handler | Public |
| `*` | `/api/admin-auth/[...all]` | Admin Better Auth handler | Public |
| `GET` | `/api/telegram/callback` | Telegram OAuth callback + session creation | Public |
| `POST` | `/api/realtime/auth` | Pusher private-channel auth | Passenger or Driver |

### Rides

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/rides/request` | Create ride request + auto-match | Passenger |
| `GET` | `/api/rides/matches` | Fetch matched drivers for a request | Passenger |
| `POST` | `/api/rides/[id]/accept` | Driver accepts a ride | Driver |
| `POST` | `/api/rides/[id]/reject` | Driver rejects a ride | Driver |

### Trips

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/trips/[id]/start` | Start the trip | Driver |
| `POST` | `/api/trips/[id]/complete` | Complete trip + award score | Driver |
| `POST` | `/api/trips/[id]/cancel` | Cancel (either party) | Passenger or Driver |
| `POST` | `/api/trips/[id]/location` | Post GPS coordinates | Driver |
| `POST` | `/api/trips/[id]/panic` | Trigger panic alert | Passenger or Driver |
| `GET` | `/api/trips/[id]/stream` | *Deprecated (410)* — Use Pusher | — |
| `GET` | `/api/trips/active` | Fetch active trip for current user | Passenger or Driver |
| `GET` | `/api/trips/history` | Fetch completed/cancelled trips | Passenger or Driver |

### Driver

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/driver/availability` | Get driver's online status | Driver |
| `PATCH` | `/api/driver/availability` | Toggle online status | Driver |
| `GET/PUT` | `/api/driver/route` | Get/set daily route start & end | Driver |
| `GET` | `/api/driver/me` | Fetch driver profile | Driver |
| `GET/POST` | `/api/driver/documents` | List/upload documents | Driver |
| `GET/DELETE` | `/api/driver/documents/[id]` | Get/delete document | Driver |

### Passenger

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/passenger/me` | Fetch passenger profile | Passenger |

### Maps (API Key Proxy)

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/maps/geocode` | Forward geocoding (LocationIQ → Gebeta) | Server-side |
| `GET` | `/api/maps/matrix` | Distance/duration matrix | Server-side |
| `GET` | `/api/gebeta/search` | Place search | Public |
| `GET` | `/api/gebeta/revgeocode` | Reverse geocoding | Public |
| `GET` | `/api/gebeta/direction` | Route directions (polyline) | Public |

### Admin

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/overview` | Dashboard summary metrics | Admin |
| `GET` | `/api/admin/active-users` | Currently online users | Admin |
| `GET` | `/api/admin/active-trips` | In-progress trips | Admin |
| `GET` | `/api/admin/alerts` | Unresolved panic alerts | Admin |
| `POST` | `/api/admin/alerts/[id]/resolve` | Mark alert resolved | Admin |
| `GET` | `/api/admin/admins` | List admin accounts | Admin |
| `POST` | `/api/admin/admins` | Create admin account | Super Admin |
| `GET` | `/api/admin/me` | Current admin session info | Admin |
| `GET` | `/api/admin/documents` | List all driver documents | Admin |
| `POST` | `/api/admin/documents/[id]` | Review (approve/reject) document | Admin |

---

## 17. Error Handling

ECRP uses a consistent error response format across all API routes:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Valid session but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource state conflict (e.g., ride already assigned) |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `VALIDATION_ERROR` | 400 | Request data fails validation |
| `INVALID_TRANSITION` | 400 | State machine rejects the transition |
| `RATE_LIMITED` | 429 | Too many requests (includes `Retry-After` header) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | External service not configured |

### Error Flow

```mermaid
flowchart TD
    REQ["API Request"] --> AUTH{Authenticated?}
    AUTH -->|No| E401["401 UNAUTHORIZED"]
    AUTH -->|Yes| PERM{Authorized?}
    PERM -->|No| E403["403 FORBIDDEN"]
    PERM -->|Yes| VALIDATE{Input valid?}
    VALIDATE -->|No| E400["400 VALIDATION_ERROR"]
    VALIDATE -->|Yes| RESOURCE{Resource exists?}
    RESOURCE -->|No| E404["404 NOT_FOUND"]
    RESOURCE -->|Yes| STATE{State valid?}
    STATE -->|No| E400_T["400 INVALID_TRANSITION"]
    STATE -->|Yes| PROCESS["Process request"]
    PROCESS -->|Error| E500["500 INTERNAL_ERROR"]
    PROCESS -->|Success| OK["200/201 Success"]
```

---

## 18. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Session signing secret (generate: `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | App base URL (e.g., `http://localhost:3000`) |
| `NEXT_PUBLIC_GEBETA_API_KEY` | Yes | Gebeta Maps API key (tiles + fallback geocoding) |
| `LOCATIONIQ_API_KEY` | Yes | LocationIQ API key (primary geocoding) |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot token (from @BotFather) |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Yes | Telegram bot username |
| `NEXT_PUBLIC_TELEGRAM_REQUEST_ACCESS` | No | `read` (default) or `write` |
| `PUSHER_APP_ID` | Yes | Pusher application ID |
| `PUSHER_APP_KEY` / `NEXT_PUBLIC_PUSHER_APP_KEY` | Yes | Pusher key (server + client) |
| `PUSHER_APP_SECRET` | Yes | Pusher secret (server only) |
| `PUSHER_APP_CLUSTER` / `NEXT_PUBLIC_PUSHER_APP_CLUSTER` | No | Pusher cluster (default: `mt1`) |
| `ADMIN_EMAIL` | Seed only | Super admin email for `npm run db:seed` |
| `ADMIN_PASSWORD` | Seed only | Super admin password for `npm run db:seed` |
| `ADMIN_NAME` | No | Super admin display name (default: `ECRP Super Admin`) |

> **Security:** `ADMIN_EMAIL` and `ADMIN_PASSWORD` have no hardcoded defaults. The seed script exits with an error if either is missing.

---

## 19. Getting Started

### Prerequisites

- **Node.js 20+**
- **PostgreSQL database** (Neon Serverless recommended)
- **Pusher account** (free tier works)
- **Gebeta Maps API key** ([gebeta.app](https://gebeta.app/))
- **LocationIQ API key** ([locationiq.com](https://locationiq.com/))
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd ecrp

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in all required environment variables

# 4. Push database schema
npm run db:push

# 5. Seed the super admin account
npm run db:seed

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:unit:watch` | Vitest in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:push` | Push schema directly to database |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `npm run db:seed` | Create initial super admin account |

> **Telegram OAuth note:** Telegram requires a real public domain for the login widget. For local development, use [ngrok](https://ngrok.com/) or a similar tunnel and register that domain with your bot via `/setdomain` in BotFather.
