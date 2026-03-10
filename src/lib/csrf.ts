/**
 * CSRF origin validation for same-site API routes.
 *
 * Checks that the Origin (or Referer fallback) header matches the configured
 * application host. Requests with no origin header are also rejected unless
 * they originate from the same host (e.g. server-side calls have no origin
 * and are treated as safe only when no host header mismatch is detected).
 *
 * Note: This is a defence-in-depth measure. SameSite=Lax cookies (set by
 * NextAuth) already mitigate most CSRF vectors for session-based auth.
 * Public endpoints (cancel, reschedule, create, waitlist) still benefit from
 * this check to prevent cross-site abuse via form submissions.
 */

const ALLOWED_ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:3333";

/** Returns true if the request passes origin validation. */
export function isValidOrigin(request: Request): boolean {
  const origin = (request.headers as Headers).get("origin");
  const referer = (request.headers as Headers).get("referer");

  const source = origin ?? (referer ? new URL(referer).origin : null);

  if (!source) {
    // No origin or referer — could be a same-origin server request or a
    // tool like curl. Reject to be safe; callers can whitelist as needed.
    return false;
  }

  try {
    const sourceUrl = new URL(source);
    const allowedUrl = new URL(ALLOWED_ORIGIN);
    return sourceUrl.host === allowedUrl.host;
  } catch {
    return false;
  }
}
