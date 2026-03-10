# BookFlow — Appointment Booking System

A full-featured, SaaS-ready appointment booking platform built with Next.js 15, TypeScript, Prisma, and SQLite.

## Features

### Customer-facing
- **Online booking wizard** — 5-step flow: service → date/time/staff → intake form + contact info → review → confirmation
- **Staff selection** — choose a specific staff member or let the system auto-assign
- **Self-service portal** — look up bookings by email, cancel or reschedule within policy windows
- **Waitlist** — join a waitlist for fully-booked slots; auto-notified on cancellation

### Admin panel
- **Dashboard** — live overview of today's bookings and key metrics
- **Booking management** — create, update status, delete bookings; full status lifecycle
- **Calendar view** — day/week view of all scheduled appointments
- **Customer management** — searchable customer directory with booking history
- **Service management** — define services with duration, pricing, buffer times, and deposit rules
- **Staff management** — create staff accounts, assign services, set working hours per day
- **Package management** — session bundles with expiry; auto-deducted on booking completion
- **Waitlist management** — view and manage pending waitlist entries
- **Settings** — business hours per day, holidays, cancellation/reschedule windows, auto-confirm toggle

### Business logic
- **Buffer times** — configurable pre/post-service buffers prevent back-to-back conflicts
- **Conflict detection** — overlapping bookings blocked for both business and per-staff
- **Deposit support** — optional upfront deposits with PAID/REFUNDED tracking
- **Status machine** — enforced transitions: PENDING → CONFIRMED → IN_PROGRESS → COMPLETED; CANCELLED/NO_SHOW
- **Policy windows** — configurable hours required before a customer can cancel or reschedule

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| ORM | Prisma |
| Database | SQLite (dev) |
| Auth | NextAuth.js v4 (credentials + JWT) |
| Validation | Zod |
| Testing | Vitest + @vitest/coverage-v8 |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Database setup

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### Run dev server

```bash
npm run dev
```

App runs at **http://localhost:3333**

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@bookflow.demo | admin123 |
| Staff | alice@bookflow.demo | staff123 |

## Project Structure

```
src/
├── app/
│   ├── admin/              # Admin panel (server components + server actions)
│   │   ├── bookings/
│   │   ├── calendar/
│   │   ├── customers/
│   │   ├── services/
│   │   ├── staff/
│   │   ├── packages/
│   │   ├── waitlist/
│   │   ├── branches/
│   │   └── settings/
│   ├── api/                # API routes (public + admin)
│   │   ├── bookings/
│   │   └── waitlist/
│   ├── book/               # Public booking wizard
│   └── my-bookings/        # Customer self-service
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── auth-guard.ts       # Session helpers
│   ├── booking-utils.ts    # Availability engine, status transitions
│   ├── prisma.ts           # Prisma client singleton
│   └── utils.ts            # Formatting helpers
├── tests/
│   ├── __mocks__/          # Prisma + auth mocks
│   ├── fixtures.ts         # Shared test data factories
│   ├── unit/               # Pure function tests
│   ├── integration/        # Server action tests
│   └── api/                # API route tests
prisma/
├── schema.prisma           # 14-model SQLite schema
└── seed.ts                 # Demo data seeder
```

## Testing

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report (enforces ≥80% threshold)
npm run test:ui           # Vitest UI
```

### Coverage baseline

| Metric | Current |
|---|---|
| Statements | ~93% |
| Branches | ~83% |
| Functions | ~98% |
| Lines | ~93% |

265 tests across 17 test files. Coverage thresholds are enforced — PRs that drop below 80%/75% fail.

## Data Model

Key models in `prisma/schema.prisma`:

- **Business** — top-level tenant; all data scoped by `businessId`
- **Branch** — physical locations within a business
- **User** — staff and admin accounts
- **Service** — bookable services with duration, pricing, buffers
- **Customer** — client records (name, email, phone)
- **Booking** — appointment record with full status lifecycle
- **BusinessHours** — open hours per day per branch
- **Holiday** — closed dates
- **StaffHours** — per-staff working hours
- **Package** / **CustomerPackage** — session bundles
- **WaitlistEntry** — queue for unavailable slots
- **Notification** — outbound notification records
- **Settings** — per-business configuration

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3333"
NEXTAUTH_SECRET="your-secret-here"
```
