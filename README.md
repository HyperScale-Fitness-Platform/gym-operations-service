# gym-operations-service

Part of the HyperScale Fitness Platform microservices architecture. This service owns three merged modules that together handle the day-to-day operational side of running the gym:

- **Booking** — classes, class sessions, trainer availability, and bookings (class + 1:1 PT sessions)
- **Membership** — plans, subscriptions, freeze/unfreeze, PT session benefits, paid PT packages
- **Occupancy** — real-time gym check-in/check-out tracking (Redis-backed)

These three were originally scoped as separate microservices but were deliberately merged into one deployable service, sharing one PostgreSQL database, since they're tightly coupled operationally (a booking needs to check membership credit; occupancy needs to check membership status). See [Architecture](#architecture) below for the reasoning.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
  - [Booking Module](#booking-module)
  - [Membership Module](#membership-module)
  - [Occupancy Module](#occupancy-module)
- [Postman Collection](#postman-collection)
- [Known Limitations](#known-limitations--open-todos)
- [Team Ownership](#team-ownership)
- [Branching Workflow](#branching-workflow)

---

## Architecture

```
gym-operations-service
├── Booking module    ─┐
├── Membership module   ├─► one PostgreSQL database (gym_operations_db)
└── Occupancy module   ─┘
                         └─► Redis (live check-in/check-out state)
```

- **Database per service** is preserved at the *service* boundary — this service owns its own database exclusively; no other microservice (Auth, Payment, Profile, etc.) connects to it directly.
- **Within** this service, Booking and Membership talk to each other via direct in-process function calls (not HTTP), since they're modules in the same codebase — see `MembershipService` injected into `BookingService`.
- **Occupancy** uses Redis for the live "who's in the gym right now" counter, and Postgres (`occupancies` table) for a permanent check-in/check-out log.
- Cross-service communication with the rest of the platform (Payment, Auth, Profile) happens via REST calls and an event bus (Kafka), following the same pattern as the rest of the platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| ORM | TypeORM |
| Database | PostgreSQL |
| Cache / real-time | Redis (`ioredis`, `@nestjs-modules/ioredis`) |
| Validation | `class-validator`, `class-transformer` |
| Scheduled jobs | `@nestjs/schedule` (membership expiration) |
| Config | `@nestjs/config`, `dotenv` |

---

## Prerequisites

- Node.js (LTS) and npm
- PostgreSQL (local install, pgAdmin, or Docker)
- Redis (local install or Docker)
- Docker (optional, but recommended for Redis)

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/HyperScale-Fitness-Platform/gym-operations-service.git
cd gym-operations-service

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# edit .env with your local Postgres + Redis connection details

# install redis
npm install ioredis
npm install @nestjs-modules/ioredis

# 4. Start Redis (if not already running)
docker run -d --name gym-redis -p 6379:6379 redis

# 5. Create the database
# (in pgAdmin or psql)

CREATE DATABASE gym_operations_db;

# (in container)

```bash
docker run -d \
  --name gym-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=123456 \
  -e POSTGRES_DB=gym_operations_db \
  -p 5432:5432 \
  postgres:16

```
# 6. Run migrations — creates all tables (do this BEFORE starting the app)
npm run migration:run

# 7. Start the app
npm run start:dev
```

The API will be available at `http://localhost:3004` (or whatever `PORT` is set to in `.env`).

---

## Environment Variables

```dotenv
# Postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_operations_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis
REDIS_URL=redis://localhost:6379

# App
PORT=3004
```

See `.env.example` for a template. `.env` itself is gitignored — never commit real credentials.

---

## Database Migrations

**⚠️ `synchronize` is turned off.** All schema changes go through TypeORM migrations, not automatic sync — this avoids the schema silently drifting from what's checked into git.

```bash
# Generate a migration after editing an entity
npm run migration:generate -- src/migrations/DescriptiveName

# Review the generated file, then run it
npm run migration:run

# Undo the most recent migration, if needed
npm run migration:revert

# See which migrations have run
npm run migration:show
```

> **Note:** the partial unique index enforcing "only one active booking per trainer slot" (`unique_active_trainer_slot_booking`) can't be expressed via TypeORM decorators — it's manually added into the migration file's `up()`/`down()` methods. If you regenerate the initial migration from scratch, remember to re-add it:
> ```sql
> CREATE UNIQUE INDEX "unique_active_trainer_slot_booking"
> ON "bookings" ("trainer_slot_id")
> WHERE "status" = 'confirmed' AND "trainer_slot_id" IS NOT NULL;
> ```

---

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── data-source.ts              # used only by the migration CLI
├── events/
│   └── publishers.ts            # SessionBooked, SessionCancelled, etc.
├── migrations/
│   └── *.ts
└── modules/
    ├── booking/
    │   ├── entities/             # Class, ClassSession, TrainerSlot, Booking
    │   ├── dto/
    │   ├── booking.controller.ts
    │   ├── booking.service.ts
    │   └── booking.module.ts
    ├── membership/
    │   ├── entities/             # MembershipPlan, Membership, MembershipBenefit,
    │   │                          # CustomerBenefit, MembershipFreeze, PtPackage
    │   ├── dto/
    │   ├── membership.controller.ts
    │   ├── membership.service.ts
    │   └── membership.module.ts
    └── occupancy/
        ├── entities/              # Occupancy
        ├── occupancy.controller.ts
        ├── occupancy.service.ts
        └── occupancy.module.ts
```

---

## API Documentation

Base URL: `http://localhost:3004`

### Booking Module

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/classes` | — | List all classes in the catalog |
| POST | `/classes` | `{ name, type, capacity }` | Admin: create a class type |
| GET | `/classes/:id/sessions` | — | List scheduled sessions for a class |
| POST | `/classes/:id/sessions` | `{ trainerId, startTime, endTime }` | Admin/trainer: schedule a session |
| GET | `/trainers/:id/slots` | — | List a trainer's open PT slots |
| POST | `/trainers/:id/slots` | `{ startTime, endTime }` | Trainer: open a PT availability slot |
| GET | `/trainers/:id/schedule` | — | Trainer's full schedule (class sessions + PT slots) |
| GET | `/pt-packages/:packageId/available-slots` | — | Slots restricted to the trainer a PT package is locked to |
| GET | `/customers/:id/bookings` | — | A customer's bookings |
| POST | `/bookings` | see below | Create a class or PT session booking |
| PATCH | `/bookings/:id/reschedule` | `{ newClassSessionId? , newTrainerSlotId? }` | Reschedule a confirmed booking |
| DELETE | `/bookings/:id` | — | Cancel a booking |

**`POST /bookings` body shapes:**

Class booking:
```json
{
  "customerId": "uuid",
  "type": "class",
  "classSessionId": "uuid"
}
```

PT session, using free membership-included sessions (any trainer):
```json
{
  "customerId": "uuid",
  "type": "pt_session",
  "trainerSlotId": "uuid",
  "sessionSource": "membership"
}
```

PT session, using a paid package (locked to one specific trainer):
```json
{
  "customerId": "uuid",
  "type": "pt_session",
  "trainerSlotId": "uuid",
  "sessionSource": "package",
  "ptPackageId": "uuid"
}
```

**Business rules enforced:**
- A class session can't be booked past its `capacity`.
- A trainer slot can only have one active (`confirmed`) booking at a time — enforced by a database-level partial unique index, not just application logic.
- A PT package can only be used to book the trainer it was purchased for (`400` otherwise).
- Only `confirmed` bookings can be rescheduled; rescheduling marks the old booking `rescheduled` and creates a new `confirmed` one (full history preserved, not overwritten).
- Cancelling a booking frees its trainer slot and refunds the PT credit (membership benefit or package session, depending on `sessionSource`).

---

### Membership Module

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/plans` | `{ name, price, durationInDays, maxFreezes }` | Admin: create a membership plan |
| GET | `/membership/plans` | — | List active plans |
| GET | `/plans/:id` | — | Get a plan with its benefits |
| POST | `/plans/:id/benefits` | `{ benefitName, benefitValue }` | Add a benefit to a plan (e.g. `PT_SESSIONS`) |
| POST | `/memberships/subscribe` | `{ customerId, planId }` | Subscribe a customer to a plan |
| GET | `/customers/:id/membership` | — | Get a customer's current membership |
| POST | `/memberships/:id/freeze` | `{ days }` | Freeze a membership, extending its end date |
| POST | `/memberships/:id/unfreeze` | — | Unfreeze a membership early |
| GET | `/pt-packages/types` | — | Catalog of PT package sizes (20/40/60) |
| POST | `/pt-packages/purchase` | `{ customerId, trainerId, packageType }` | Purchase a PT package, locked to one trainer |
| GET | `/customers/:id/pt-packages` | — | A customer's PT packages |

**Business rules enforced:**
- A customer can only have one `ACTIVE`/`FROZEN` membership at a time (`409` on duplicate subscribe attempts).
- Freezing extends the membership's `endDate` by the freeze duration — the customer doesn't lose paid-for days.
- Freeze count is capped at the plan's `maxFreezes`.
- A scheduled job (`@nestjs/schedule`) automatically flips `ACTIVE` memberships to `EXPIRED` once `endDate` passes.
- PT packages start as `PENDING_PAYMENT` and must be manually activated (see [Known Limitations](#known-limitations--open-todos)) before they can be used for booking.

---

### Occupancy Module

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/checkin` | `{ customerId }` | Check a customer into the gym (requires active membership) |
| POST | `/checkout` | `{ customerId }` | Check a customer out |
| GET | `/current` | — | List everyone currently checked in |

---

## Postman Collection

A full collection covering all three modules — Setup, Browse, Membership Flow, PT Packages, Occupancy, Booking Flow, and Edge Cases — is checked into this repo at:

```
docs/postman/gym-operations-service.postman_collection.json
```

### How to export your own updated copy from Postman

1. In Postman, right-click the collection name (**"Gym Operations Service — Booking Module"** or similar) in the left sidebar
2. Click **Export**
3. Choose **Collection v2.1** format (the current standard)
4. Save it as `gym-operations-service.postman_collection.json`
5. Move the exported file into `docs/postman/` in this repo, replacing the old one
6. Commit it:
   ```bash
   git add docs/postman/gym-operations-service.postman_collection.json
   git commit -m "Update Postman collection"
   git push
   ```

### How to import it (for a new team member, or after pulling updates)

1. Open Postman
2. Click **Import** (top left)
3. Select `docs/postman/gym-operations-service.postman_collection.json` from this repo
4. Set the `baseUrl` collection variable to match your local server (default: `http://localhost:3004`)
5. Run folders in order — later requests depend on collection variables set by earlier ones (e.g. `classId`, `ptPackageId`)

### Manual steps required before some tests will pass

- **`planIdRaw`** — the Membership module's `planId` is a numeric `SERIAL` id, not a UUID. After running "Create a Plan," manually copy the numeric `id` from the response into the `planIdRaw` collection variable (used unquoted in the subscribe request body).
- **PT package activation** — packages start as `PENDING_PAYMENT`. There's currently no activation endpoint (see below), so activate manually in pgAdmin before running package-based booking tests:
  ```sql
  UPDATE pt_packages SET status = 'ACTIVE' WHERE id = 'your-package-id';
  ```

---

## Known Limitations / Open TODOs

- **No PT package activation endpoint.** Packages are created as `PENDING_PAYMENT` and have no way to become `ACTIVE` without a manual database update. This is expected to be resolved once Payment Service exists and can fire a `PaymentSucceeded` event for this service to react to, the same pattern used for membership subscriptions and bookings.
- **`GET /customers/:id/membership` doesn't return PT session balance.** The endpoint only loads the `plan` relation, not `customerBenefits` — so `remainingValue` (PT sessions left) currently can't be read through the API and must be checked directly in the database. Needs a one-line fix adding the relation.
- **Error propagation is inconsistent between modules.** Membership's internal lookups throw `NotFoundException` (`404`) for things like "no active membership found," while Booking's own validation mostly throws `BadRequestException` (`400`). When Booking calls into Membership and Membership throws, that `404` propagates straight through rather than being normalized to a `400`. Worth deciding on a consistent convention.
- **`sessionSource` column is `camelCase`** (`sessionSource`) while every other column in the schema is `snake_case` — a naming inconsistency from an early entity definition, left as-is to avoid an extra migration; cosmetic only, doesn't affect functionality.
- **Occupancy currently persists every check-in/check-out to Postgres**, in addition to Redis. Confirm with the Occupancy module owner whether this is intentional (historical log for analytics) or should be Redis-only for performance.

---

## Team Ownership

| Module | Owner |
|---|---|
| Booking | Person 1 |
| Membership | Person 2 |
| Occupancy | Person 2 |

The two modules communicate via a small, explicit function contract (`MembershipService` methods called from `BookingService`) rather than reaching into each other's internals — see `membership.service.ts` for the agreed function signatures.

---

## Branching Workflow

- `main` — integration branch, protected
- `feat/<feature-name>` — one branch per feature (e.g. `feat/Booking-Module`)
- Open a PR into `main` when a feature is ready for review
- Run `npm run migration:run` locally after pulling `main` if new migrations were added — do **not** rely on `synchronize`
