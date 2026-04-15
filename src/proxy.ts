import { isAdminPanelRole } from "@/lib/admin-role";
import { authAdmin }     from "@/lib/auth-admin";
import { authDriver }    from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

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
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: [
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
