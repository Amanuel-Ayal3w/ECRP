# ECRP — Community Ride-Sharing Platform

A mobile-responsive web platform for community-based voluntary ride-sharing. Drivers with empty seats offer rides along their daily routes; passengers request pickups along those routes. No payments are processed — drivers earn a **Service Score** for verified trip completions.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Core Modules](#core-modules)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)

---

## Architecture Overview

ECRP is built as a **Next.js full-stack monolith** using the App Router. The server handles authentication, business logic, database access, and real-time event triggering — all within a single deployable unit.

```
Browser (React 19)
    │
    ├── App Router Pages  (/app)
    │       ├── /login              → Telegram OAuth entry point
    │       ├── /onboarding         → Role selection (Passenger / Driver)
    │       ├── /passenger          → Ride request interface
    │       ├── /driver             → Driver dashboard & availability toggle
    │       ├── /trip/[id]          → Live trip tracking (real-time map)
    │       ├── /trips/passenger    → Passenger trip history
    │       ├── /trips/driver       → Driver trip history
    │       └── /admin              → Admin oversight dashboard
    │
    ├── API Routes  (/app/api)
    │       ├── /auth/[...all]      → Passenger Better Auth handler
    │       ├── /driver-auth/[...all] → Driver Better Auth handler
    │       ├── /admin-auth/[...all]  → Admin Better Auth handler
    │       ├── /rides/*            → Ride request, match, accept, reject
    │       ├── /trips/*            → Trip lifecycle (start, complete, cancel)
    │       ├── /driver/*           → Driver availability, route, profile
    │       ├── /maps/*             → Gebeta Maps proxy (geocode, matrix)
    │       ├── /realtime/auth      → Pusher private-channel auth
    │       └── /admin/*            → Admin dashboard data endpoints
    │
    └── External Services
            ├── PostgreSQL          → Persistent data store (via Drizzle ORM)
            ├── Pusher              → Managed WebSockets for live GPS & alerts
            └── Gebeta Maps         → Geocoding, Matrix API, map tiles
```

### Key Design Decisions

- **Server Components first** — data is fetched server-side wherever possible to keep the client bundle small.
- **Three separate Better Auth instances** (`auth`, `auth-driver`, `auth-admin`) share the same PostgreSQL database but issue cookies with distinct prefixes (`ba-passenger`, `ba-driver`, `ba-admin`), giving hard role separation with no shared session table.
- **Pusher for real-time** — GPS coordinates are posted from the driver's browser to a Next.js API route every 5–7 seconds (throttled to stay within free-tier limits). The route triggers a Pusher event on a private channel (`private-trip-<id>`); the passenger's client subscribes and updates a map marker.
- **Trip state machine** — ride lifecycle transitions (`requested → accepted → started → completed / cancelled`) are enforced by a typed state machine in [src/lib/state-machine.ts](src/lib/state-machine.ts) and audit-logged to `trip_event`.
- **Gebeta Maps** — all map API calls are proxied through Next.js API routes (`/api/maps/geocode`, `/api/maps/matrix`, `/api/gebeta/search`) so the API key is never exposed to the browser.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| Language | TypeScript | ^5 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | ^4 |
| Component Library | shadcn/ui + Base UI | — |
| Authentication | Better Auth | ^1.6.2 |
| Database ORM | Drizzle ORM | ^0.45.2 |
| Database | PostgreSQL | — |
| Real-Time | Pusher + pusher-js | 5.x / 8.x |
| Maps | Gebeta Maps (`@gebeta/tiles`) | ^2.1.5 |
| Icons | Lucide React | ^1.8.0 |
| Toasts | Sonner | ^2.0.7 |
| Testing | Vitest + @vitest/coverage-v8 | ^2.1.9 |
| DB Migrations | Drizzle Kit | ^0.31.10 |

---

## Core Modules

### 1. Authentication (Three-Role System)

Three independent Better Auth instances share one database:

| Role | Cookie prefix | Auth route | Login method |
|---|---|---|---|
| Passenger | `ba-passenger` | `/api/auth` | Telegram OAuth |
| Driver | `ba-driver` | `/api/driver-auth` | Telegram OAuth |
| Admin | `ba-admin` | `/api/admin-auth` | Email + Password |

After login, users who have not yet selected a role are redirected to `/onboarding`. Drivers must also complete `/onboarding/driver` (plate number, vehicle model, capacity, license number) before their profile is activated.

### 2. Ride Matching

1. Passenger submits pickup + destination → geocoded to `[lat, lng]` via Gebeta Maps.
2. Server queries all online drivers and uses the **Gebeta Matrix API** to score each driver's declared route against the passenger's pickup point.
3. The best-matching driver receives a Pusher notification.
4. Driver explicitly **accepts** or **rejects**; rejection records prevent re-matching the same driver.

Route scoring logic lives in [src/lib/score-route.ts](src/lib/score-route.ts).

### 3. Live Trip Tracking

```
Driver browser
  └─ navigator.geolocation (every 5–7 s)
       └─ POST /api/trips/[id]/location
            └─ Pusher trigger → private-trip-[id]
                 └─ Passenger browser subscribes & updates Gebeta map marker
```

The map component ([src/components/app-map.tsx](src/components/app-map.tsx)) is **lazy-loaded** via `next/dynamic` so it does not block the initial page render.

### 4. Emergency (Panic) Alerts

A persistent panic button is shown on the active trip screen for both roles. Triggering it:
- POSTs current GPS coordinates to `POST /api/trips/[id]/panic`
- Creates an `admin_alert` row in the database
- Fires a high-priority Pusher event to the admin dashboard channel

Admins can resolve alerts via `POST /api/admin/alerts/[id]/resolve`.

### 5. Service Score & Admin Dashboard

- On trip completion the driver's `serviceScore` and `tripsCompleted` are incremented atomically.
- The protected `/admin` route provides: active users, live rides, unresolved alerts, and overview metrics.
- Admins can manage other admin accounts via `/api/admin/admins`.

---

## Database Schema

All tables are defined in [src/db/schema.ts](src/db/schema.ts), [src/db/schema-driver.ts](src/db/schema-driver.ts), [src/db/schema-passenger.ts](src/db/schema-passenger.ts), and [src/db/schema-admin.ts](src/db/schema-admin.ts).

```
admin_user / admin_session / admin_account / admin_verification
passenger_user / passenger_session / passenger_account / passenger_verification
driver_user / driver_session / driver_account / driver_verification

driver_profile          plateNumber, vehicleModel, capacity, licenseNumber,
                        serviceScore, tripsCompleted

driver_availability     isOnline, routeStart/End (text + lat/lng coords)

ride_request            passengerId, pickup, destination, status,
                        matchedDriverId, acceptedAt, startedAt, endedAt,
                        currentLat/Lng

ride_rejection          rideId, driverId  (prevents re-matching)

admin_alert             tripId, userName, location, coordinates,
                        severity, resolved, resolvedBy

driver_document         docType (license|registration|insurance),
                        filePath, status (pending|verified|rejected)

trip_event              rideId, actorId, actorRole, event, metadata
                        (full audit log of every state transition)
```

---

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| `*` | `/api/auth/[...all]` | Passenger Better Auth handler |
| `*` | `/api/driver-auth/[...all]` | Driver Better Auth handler |
| `*` | `/api/admin-auth/[...all]` | Admin Better Auth handler |
| `POST` | `/api/telegram/callback` | Telegram OAuth callback |
| `POST` | `/api/realtime/auth` | Pusher private-channel auth |

### Rides
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/rides/request` | Passenger creates a ride request |
| `GET` | `/api/rides/matches` | Fetch matched drivers for a request |
| `POST` | `/api/rides/[id]/accept` | Driver accepts a ride |
| `POST` | `/api/rides/[id]/reject` | Driver rejects a ride |

### Trips
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/trips/[id]/start` | Driver starts the trip |
| `POST` | `/api/trips/[id]/complete` | Driver marks trip complete |
| `POST` | `/api/trips/[id]/cancel` | Either party cancels |
| `POST` | `/api/trips/[id]/location` | Driver posts GPS coordinates |
| `POST` | `/api/trips/[id]/panic` | Panic alert trigger |
| `GET` | `/api/trips/[id]/stream` | SSE stream for trip events |
| `GET` | `/api/trips/active` | Fetch active trip for current user |
| `GET` | `/api/trips/history` | Fetch completed/cancelled trips |

### Driver
| Method | Path | Description |
|---|---|---|
| `GET/PUT` | `/api/driver/availability` | Toggle online status |
| `GET/PUT` | `/api/driver/route` | Set daily route start/end |
| `GET` | `/api/driver/me` | Fetch driver profile |
| `GET/POST` | `/api/driver/documents` | Upload / list documents |
| `GET/DELETE` | `/api/driver/documents/[id]` | Single document operations |

### Maps (Gebeta proxy)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/maps/geocode` | Forward geocoding |
| `GET` | `/api/maps/matrix` | Distance/duration matrix |
| `GET` | `/api/gebeta/search` | Place search |
| `GET` | `/api/gebeta/revgeocode` | Reverse geocoding |

### Admin
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Dashboard summary metrics |
| `GET` | `/api/admin/active-users` | Currently online users |
| `GET` | `/api/admin/active-trips` | In-progress trips |
| `GET` | `/api/admin/alerts` | All unresolved panic alerts |
| `POST` | `/api/admin/alerts/[id]/resolve` | Mark alert resolved |
| `GET/POST` | `/api/admin/admins` | List / create admin accounts |
| `GET` | `/api/admin/me` | Current admin session |

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # All API routes
│   ├── admin/                # Admin dashboard pages
│   ├── driver/               # Driver dashboard
│   ├── passenger/            # Passenger ride-request page
│   ├── trip/[id]/            # Active trip tracking page
│   ├── trips/                # Trip history (driver & passenger)
│   ├── login/                # Telegram login page
│   ├── onboarding/           # Role selection & driver onboarding
│   └── layout.tsx / page.tsx
├── components/
│   ├── app-map.tsx           # Gebeta map wrapper (lazy-loaded)
│   ├── map-inner.tsx         # Inner map component with markers
│   ├── bottom-nav.tsx        # Mobile navigation bar
│   ├── profile-sheet.tsx     # Slide-up profile panel
│   └── ui/                   # shadcn/ui primitives
├── db/
│   ├── index.ts              # Drizzle DB client
│   ├── schema.ts             # All table definitions
│   ├── migrations/           # SQL migration files
│   └── seed.ts               # Dev seed data
└── lib/
    ├── auth.ts               # Passenger Better Auth instance
    ├── auth-driver.ts        # Driver Better Auth instance
    ├── auth-admin.ts         # Admin Better Auth instance
    ├── auth-client.ts        # Client-side auth helpers
    ├── auth-role.ts          # Role resolution utilities
    ├── gebeta.ts             # Gebeta Maps API client
    ├── pusher-server.ts      # Pusher server-side trigger
    ├── pusher-client.ts      # Pusher browser subscription
    ├── score-route.ts        # Driver–passenger route matching score
    ├── state-machine.ts      # Trip lifecycle state machine
    ├── trip-events.ts        # Pusher event name constants
    ├── generate-id.ts        # Nanoid-based ID generator
    └── api-error.ts          # Typed API error helpers
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Pusher account (free tier works)
- Gebeta Maps API key ([gebeta.app](https://gebeta.app/))
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

```bash
git clone <repo-url>
cd ecrp
npm install
```

### Database Setup

```bash
# Copy and fill in environment variables
cp .env.example .env.local

# Push schema to your database
npm run db:push

# (Optional) Seed development data
npm run db:seed
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Telegram OAuth note:** Telegram requires a real public domain for the login widget. For local development use [ngrok](https://ngrok.com/) or a similar tunnel and register that domain with your bot via `/setdomain` in BotFather.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ecrp

# Better Auth secret — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000

# Gebeta Maps API key (used for map tiles + fallback geocoding)
NEXT_PUBLIC_GEBETA_API_KEY=your-gebeta-api-key

# PositionStack API key (primary geocoding — get one at positionstack.com)
POSITIONSTACK_API_KEY=your-positionstack-api-key

# Telegram Bot credentials (from @BotFather)
TELEGRAM_BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=YourBotUsername

# Pusher credentials (from pusher.com dashboard)
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=your-cluster
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:unit:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with V8 coverage report |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:push` | Push schema directly to DB (dev) |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `npm run db:seed` | Seed development data |
