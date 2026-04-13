import { isAdminPanelRole } from "@/lib/admin-role";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/passenger", "/driver", "/trips", "/trip"];

function isAdminLoginPath(pathname: string) {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}

function isAdminProtectedPath(pathname: string) {
  if (isAdminLoginPath(pathname)) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  const isAdminOnly = isAdminProtectedPath(pathname);

  // Fast cookie check for regular protected routes
  if (isProtected) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Dedicated admin login page — public; admins go straight to dashboard
  if (isAdminLoginPath(pathname)) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (isAdminPanelRole(session?.user.role)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Full session + role check for other admin routes
  if (isAdminOnly) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdminPanelRole(session.user.role)) {
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
