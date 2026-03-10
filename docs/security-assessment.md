# Security Assessment Report
**BookFlow — Appointment Booking System**
**Date:** 2026-03-10 | **Assessor:** Senior Cyber Security Expert | **Status:** ⛔ NOT PRODUCTION READY

---

## Executive Summary

The application has **2 critical**, **3 high**, and **12 medium** severity findings. The two critical issues (unauthenticated booking modification and a weak hardcoded secret) represent immediate attack surface that would allow an adversary to cancel or reschedule any booking in the system without credentials. All critical and high findings must be resolved before any production deployment.

---

## Findings

### 🔴 CRITICAL-1 — Unauthenticated Cancel & Reschedule Endpoints

**Files:** `src/app/api/bookings/[id]/cancel/route.ts`, `src/app/api/bookings/[id]/reschedule/route.ts`

Neither endpoint verifies the identity of the caller. The only lookup is by booking ID, which is a short predictable string in the URL.

```typescript
// cancel/route.ts — no auth check anywhere
export async function POST(request, { params }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  // proceeds to cancel with no session check
```

**Attack scenario:** An attacker who knows (or enumerates) a booking ID can cancel any appointment in the system. No credentials required. A simple loop against a range of IDs constitutes a complete denial-of-service against the business.

**Required fix:** Verify caller owns the booking — either require a signed token sent in the confirmation email, or validate a matching email parameter against `booking.customer.email`.

---

### 🔴 CRITICAL-2 — Weak / Placeholder NEXTAUTH\_SECRET

**File:** `.env`

```
NEXTAUTH_SECRET="super-secret-change-in-production"
```

This literal string is publicly known (it appears in documentation, templates, and now this report). If this value is ever deployed to production, all JWT session tokens can be forged offline — an attacker crafts a valid admin session token without logging in.

**Required fix:** Generate a cryptographically random 32-byte secret (`openssl rand -base64 32`) and store it in the deployment environment's secrets manager, never in a file.

---

### 🟠 HIGH-1 — Customer Data Exposed Without Authentication

**File:** `src/app/api/bookings/lookup/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  // Returns full booking history for any email — no auth
  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id },
    include: { service: true, staff: { select: { name: true } } },
  });
```

Anyone who knows (or guesses) a customer's email can retrieve their complete appointment history including service names, payment totals, deposit statuses, and staff names. There is no rate limiting, so email enumeration is trivial.

**Required fix:** Issue a time-limited signed token via email when the customer requests their booking history. Validate that token on every subsequent request.

---

### 🟠 HIGH-2 — Tenant Isolation Failure in Admin Actions

**Files:** `src/app/admin/staff/actions.ts`, `src/app/admin/settings/actions.ts`, `src/app/admin/branches/actions.ts`

`requireAdmin()` only verifies role, not tenant membership. An admin of Business A, if they can reach these server actions (e.g., through a compromised browser session replay), could modify staff records that belong to Business B.

```typescript
// auth-guard.ts
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/admin");
  return session;  // businessId from session — never cross-verified
}

// staff/actions.ts — updateStaff email uniqueness check
const existing = await prisma.user.findFirst({
  where: {
    email: parsed.data.email,
    id: { not: parsed.data.id },
    // ← businessId NOT in where clause
  },
});
```

**Required fix:** Every admin database query that reads or modifies a resource must include `businessId` from the session in its `where` clause.

---

### 🟠 HIGH-3 — No Email Verification for Public Bookings

**File:** `src/app/api/bookings/create/route.ts`

```typescript
customer = await prisma.customer.create({
  data: { businessId, email: parsed.customerEmail, name: parsed.customerName, ... }
});
// booking immediately created — no email confirmation
```

An attacker can create bookings for arbitrary email addresses, fill a business's calendar, and the actual email owner receives no notification that allows them to deny it. With `autoConfirmBookings: true`, the calendar is directly blocked.

**Required fix:** After creation, send a confirmation link. Bookings remain in `PENDING` status until the email owner clicks the link. Set the link to expire after 24 hours.

---

### 🟡 MEDIUM-1 — No Rate Limiting on Any Public Endpoint

**Files:** All routes under `src/app/api/`

No request throttling is implemented anywhere. The following abuse scenarios are all trivially possible:

| Endpoint | Abuse |
|---|---|
| `POST /api/bookings/create` | Flood calendar with fake bookings |
| `GET /api/bookings/lookup` | Enumerate all customer emails |
| `POST /api/waitlist/join` | Spam waitlist |
| `POST /api/bookings/[id]/cancel` | Cancel bookings in bulk |

**Required fix:** Add a middleware-level rate limiter (e.g., Upstash Rate Limit for serverless, or `express-rate-limit` behind a reverse proxy). Suggested limits: 10 req/min per IP for write endpoints, 30 req/min for reads.

---

### 🟡 MEDIUM-2 — Security Headers Not Configured

**File:** `next.config.ts`

```typescript
const nextConfig: NextConfig = {};
export default nextConfig;
```

No HTTP security headers are set. The application is missing:

| Header | Risk Without It |
|---|---|
| `Content-Security-Policy` | XSS via injected scripts |
| `X-Frame-Options: DENY` | Clickjacking |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing attacks |
| `Strict-Transport-Security` | SSL stripping |
| `Referrer-Policy` | Booking data leaked in Referer headers |
| `Permissions-Policy` | Camera/mic/geolocation access |

**Required fix:** Add a `headers()` export to `next.config.ts` or configure a `middleware.ts` to inject these headers on every response.

---

### 🟡 MEDIUM-3 — Weak Password Policy

**File:** `src/app/admin/staff/actions.ts`

```typescript
password: z.string().min(6, "Password must be at least 6 characters"),
```

Admin accounts can be created with `123456`. No uppercase, number, or symbol requirement. A 6-character password has an extremely small search space against offline attacks (if the hash is ever obtained).

**Required fix:** Enforce minimum 10 characters, at least one uppercase, one lowercase, one digit, and one symbol. Consider integrating Have I Been Pwned API to reject known-compromised passwords.

---

### 🟡 MEDIUM-4 — Raw Error Messages Leaked to Clients

**File:** `src/app/api/bookings/create/route.ts`

```typescript
return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
// and:
return NextResponse.json({ error: error.message }, { status: 500 });
```

Zod validation details reveal the internal schema structure. Raw `error.message` in 500 responses can expose Prisma internals, database table names, or file paths.

**Required fix:** Return generic messages to clients (`"Invalid request"`, `"An internal error occurred"`). Log the full error server-side with a correlation ID. Never expose stack traces or ORM errors.

---

### 🟡 MEDIUM-5 — No Pagination on Data Queries

**File:** `src/app/api/bookings/lookup/route.ts`

```typescript
const bookings = await prisma.booking.findMany({
  where: { customerId: customer.id },
  // No take/skip — returns ALL bookings ever
});
```

A customer with years of booking history could trigger a response containing thousands of records, exhausting memory and causing a denial-of-service for that server instance.

**Required fix:** Add `take: 50` and cursor-based pagination to all `findMany` calls in API routes.

---

### 🟡 MEDIUM-6 — Timezone Ambiguity

**File:** `prisma/schema.prisma`

```prisma
date      String  // "2026-03-10"
startTime String  // "09:00"
```

Dates and times are stored as strings with no timezone information. The business has a `timezone` field that is never used in booking calculations. This creates a class of bugs around DST transitions (an 09:00 booking created in summer becomes an 08:00 booking in winter when displayed in UTC), and the inconsistency can be exploited to book slots that appear unavailable to the conflict checker.

**Required fix:** Store booking datetimes as ISO 8601 UTC strings, or at minimum enforce the business timezone consistently in all time arithmetic.

---

### 🟡 MEDIUM-7 — Audit Trail Absent

No logging exists for any privileged operation: admin logins, customer data access, booking modifications, settings changes. This is a compliance requirement under GDPR Article 32 and is expected by PCI-DSS and SOC 2.

**Required fix:** Create an `AuditLog` table. Write a record for every create/update/delete operation on sensitive models, capturing: `actor (userId)`, `action`, `resourceType`, `resourceId`, `changes (JSON diff)`, `timestamp`, `ipAddress`.

---

### 🟡 MEDIUM-8 — No CSRF Configuration

NextAuth provides CSRF token support but it is not explicitly configured. Server Actions in Next.js 14+ include same-origin enforcement by default, but the REST API routes (`/api/**`) have no CSRF protection at all.

**Required fix:** Validate `Origin` and `Referer` headers in API route middleware. For server actions, confirm the built-in same-origin check is not disabled anywhere.

---

### 🟡 MEDIUM-9 — businessSlug Defaults to `"bookflow-demo"`

**File:** `src/app/api/bookings/create/route.ts`

```typescript
businessSlug: z.string().default("bookflow-demo"),
```

Omitting `businessSlug` from the request body silently books against the demo business. This will confuse production tenants and could be exploited to flood the demo/default tenant's calendar.

**Required fix:** Remove the default. Make `businessSlug` required with no fallback.

---

### 🟡 MEDIUM-10 — PII Held in React Client State

**File:** `src/app/book/booking-wizard.tsx`

Customer name, email, phone number, and intake answers (potentially medical in nature) are stored in plain React `useState` for the duration of the wizard. This data is visible in browser DevTools memory snapshots and will appear in any third-party error reporting tool (Sentry, Datadog) if a crash occurs mid-wizard.

**Required fix:** Minimise PII stored in state. For intake answers, submit incrementally or ensure any error reporting SDK has a PII scrubber configured.

---

### 🟡 MEDIUM-11 — Deleted Booking Records Destroy Audit Trail

**File:** `src/app/admin/bookings/actions.ts`

```typescript
await prisma.booking.deleteMany({
  where: { id: bookingId, businessId, status: { in: ["CANCELLED", "NO_SHOW"] } },
});
```

Hard-deleting booking records removes the payment history, deposit tracking, and any associated notifications. This is a financial record retention problem in addition to a compliance issue.

**Required fix:** Implement soft-delete (add `deletedAt DateTime?` to the model). Never hard-delete booking records.

---

### 🔵 LOW-1 — bcrypt Salt Rounds at 10 (Acceptable, Consider 12)

**File:** `src/app/admin/staff/actions.ts`

```typescript
const passwordHash = await bcrypt.hash(parsed.data.password, 10);
```

OWASP currently recommends bcrypt cost factor of 10 as the minimum. Factor 12 provides significantly better resistance to GPU-based offline attacks at acceptable performance cost (~250ms vs ~65ms per hash).

---

### 🔵 LOW-2 — `bcryptjs` Package Maintenance Status

`bcryptjs@2.4.3` — last published in 2017. While functionally stable, there are no recent security patches. Consider evaluating `argon2` (winner of the Password Hashing Competition) as a modern alternative.

---

### 🔵 LOW-3 — Dependency Audit Not Automated

No Dependabot, `npm audit` CI step, or Snyk integration is configured. Known CVEs in transitive dependencies will go undetected.

---

## Summary Table

| ID | Severity | Title |
|---|---|---|
| CRIT-1 | 🔴 Critical | Unauthenticated cancel & reschedule endpoints |
| CRIT-2 | 🔴 Critical | Weak / placeholder `NEXTAUTH_SECRET` |
| HIGH-1 | 🟠 High | Full booking history exposed without auth |
| HIGH-2 | 🟠 High | Admin tenant isolation failure |
| HIGH-3 | 🟠 High | No email verification for public bookings |
| MED-1 | 🟡 Medium | No rate limiting |
| MED-2 | 🟡 Medium | Security headers missing |
| MED-3 | 🟡 Medium | Weak password policy (min 6 chars) |
| MED-4 | 🟡 Medium | Raw error messages leaked |
| MED-5 | 🟡 Medium | No pagination (memory exhaustion) |
| MED-6 | 🟡 Medium | Timezone ambiguity in booking times |
| MED-7 | 🟡 Medium | No audit trail |
| MED-8 | 🟡 Medium | No CSRF validation on API routes |
| MED-9 | 🟡 Medium | `businessSlug` defaults to demo tenant |
| MED-10 | 🟡 Medium | PII in React client state |
| MED-11 | 🟡 Medium | Hard-delete destroys booking audit trail |
| LOW-1 | 🔵 Low | bcrypt cost factor at minimum (10) |
| LOW-2 | 🔵 Low | `bcryptjs` unmaintained since 2017 |
| LOW-3 | 🔵 Low | No automated dependency vulnerability scanning |

---

## Remediation Priority

```
Week 1 — Before any public access
  CRIT-1  Add ownership verification to cancel/reschedule
  CRIT-2  Rotate NEXTAUTH_SECRET
  HIGH-1  Gate lookup endpoint behind signed token
  HIGH-2  Add businessId to all admin resource queries

Week 2–3 — Before production launch
  HIGH-3  Email verification flow for public bookings
  MED-1   Rate limiting middleware
  MED-2   Security headers in next.config.ts
  MED-3   Strong password policy
  MED-4   Sanitize all error responses
  MED-9   Remove businessSlug default

Month 2 — Ongoing hardening
  MED-5   Pagination
  MED-6   Timezone normalization
  MED-7   Audit log table + writes
  MED-8   CSRF on API routes
  MED-10  PII minimization in wizard
  MED-11  Soft-delete for bookings
  LOW-1–3 Dependency hygiene
```

---

*Assessment performed via static code analysis. Dynamic testing (penetration testing, fuzzing) and infrastructure review (hosting, TLS, network segmentation) are out of scope and should be conducted separately before production launch.*
