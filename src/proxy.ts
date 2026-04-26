import { isAdminPanelRole } from "@/lib/admin-role";
import { authAdmin }     from "@/lib/auth-admin";
import { authDriver }    from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { getSessionCookie } from "better-auth/cookies";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

interface RateLimitBucket {
  count: number;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

interface RateLimitRule {
  pattern: RegExp;
  limit: number;
  windowMs: number;
}

const RATE_LIMIT_RULES: RateLimitRule[] = [
  { pattern: /^\/api\/auth\//, limit: 10, windowMs: 60_000 },
  { pattern: /^\/api\/driver-auth\//, limit: 10, windowMs: 60_000 },
  { pattern: /^\/api\/admin-auth\//, limit: 5, windowMs: 60_000 },
  { pattern: /^\/api\/rides\/request$/, limit: 5, windowMs: 60_000 },
  { pattern: /^\/api\/trips\/[^/]+\/location$/, limit: 30, windowMs: 10_000 },
  { pattern: /^\/api\/trips\/[^/]+\/panic$/, limit: 3, windowMs: 60_000 },
];

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function normalizeRateLimitKey(ip: string, pathname: string): string {
  const normalized = pathname
    .replace(/\/[a-z0-9]+-[a-z0-9]+(?=\/|$)/g, "/[id]")
    .replace(/\/$/, "");
  return `${ip}:${normalized}`;
}

function checkRateLimit(ip: string, pathname: string): { limited: boolean; retryAfter: number } {
  for (const rule of RATE_LIMIT_RULES) {
    if (!rule.pattern.test(pathname)) continue;

    const key = normalizeRateLimitKey(ip, pathname);
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      rateLimitStore.set(key, { count: 1, expiresAt: now + rule.windowMs });
      return { limited: false, retryAfter: 0 };
    }

    if (bucket.count >= rule.limit) {
      return { limited: true, retryAfter: Math.ceil((bucket.expiresAt - now) / 1000) };
    }

    bucket.count += 1;
    return { limited: false, retryAfter: 0 };
  }

  return { limited: false, retryAfter: 0 };
}

function isAdminLoginPath(pathname: string) {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}

function isAdminProtectedPath(pathname: string) {
  if (isAdminLoginPath(pathname)) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Which role owns a given pathname.
 * "either" means driver OR passenger (shared trip pages).
 */
function requiredRoleForPath(
  pathname: string,
): "passenger" | "driver" | "either" | null {
  if (
    pathname === "/passenger" ||
    pathname.startsWith("/passenger/") ||
    pathname === "/trips/passenger" ||
    pathname.startsWith("/trips/passenger/")
  )
    return "passenger";

  if (
    pathname === "/driver" ||
    pathname.startsWith("/driver/") ||
    pathname === "/trips/driver" ||
    pathname.startsWith("/trips/driver/")
  )
    return "driver";

  if (
    pathname === "/trips" ||
    pathname.startsWith("/trips/") ||
    pathname === "/trip" ||
    pathname.startsWith("/trip/")
  )
    return "either";

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const { limited, retryAfter } = checkRateLimit(ip, pathname);

    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests.", code: "RATE_LIMITED", status: 429 }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "x-request-id": requestId,
          },
        },
      );
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        requestId,
        method: request.method,
        path: pathname,
        ip,
      }),
    );

    const apiRes = NextResponse.next();
    apiRes.headers.set("x-request-id", requestId);
    return apiRes;
  }

  const h            = await headers();

  const roleRequired = requiredRoleForPath(pathname);
  const isAdminOnly  = isAdminProtectedPath(pathname);

  // ── User-facing protected routes ────────────────────────────────────────────
  if (roleRequired) {
    // Determine which cookie prefix to fast-check
    const cookiePrefix =
      roleRequired === "driver" ? "ba-driver" :
      roleRequired === "passenger" ? "ba-passenger" :
      undefined; // "either" — check both below

    if (cookiePrefix) {
      const sessionCookie = getSessionCookie(request, { cookiePrefix });
      if (!sessionCookie) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Full role-based session validation
    if (roleRequired === "passenger") {
      const session = await authPassenger.api.getSession({ headers: h });
      if (!session) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Admins who somehow land here → push to admin panel
      const adminSession = await authAdmin.api.getSession({ headers: h });
      if (adminSession) return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (roleRequired === "driver") {
      const session = await authDriver.api.getSession({ headers: h });
      if (!session) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      const adminSession = await authAdmin.api.getSession({ headers: h });
      if (adminSession) return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (roleRequired === "either") {
      const [passengerSession, driverSession] = await Promise.all([
        authPassenger.api.getSession({ headers: h }),
        authDriver.api.getSession({ headers: h }),
      ]);
      if (!passengerSession && !driverSession) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ── Admin login page ─────────────────────────────────────────────────────────
  if (isAdminLoginPath(pathname)) {
    const session = await authAdmin.api.getSession({ headers: h });
    if (isAdminPanelRole((session?.user as { role?: string } | undefined)?.role)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    const res = NextResponse.next();
    res.headers.set("x-request-id", requestId);
    return res;
  }

  // ── Other admin routes ───────────────────────────────────────────────────────
  if (isAdminOnly) {
    const session = await authAdmin.api.getSession({ headers: h });
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminPanelRole((session.user as { role?: string }).role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/passenger",
    "/passenger/:path*",
    "/driver",
    "/driver/:path*",
    "/admin",
    "/admin/:path*",
    "/trips/:path*",
    "/trip/:path*",
  ],
};
