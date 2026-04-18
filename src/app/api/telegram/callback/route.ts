import { db } from "@/db";
import {
  driverAccount,
  driverSession,
  driverUser,
  passengerAccount,
  passengerSession,
  passengerUser,
} from "@/db/schema";
import { createHmac, createHash } from "crypto";
import { generateId } from "better-auth";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const PUBLIC_APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");

// Mirrors the signing done by better-call's setSignedCookie so better-auth's
// getSignedCookie can verify the value: "token.base64(HMAC-SHA256(token))"
async function signSessionToken(token: string): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return `${token}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

// Match the __Secure- prefix better-auth adds when the base URL is HTTPS
const AUTH_BASE_URL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const IS_HTTPS = AUTH_BASE_URL.startsWith("https://");
const COOKIE_SECURE_PREFIX = IS_HTTPS ? "__Secure-" : "";

function resolveAppUrl(req: NextRequest, path: string) {
  const origin = PUBLIC_APP_ORIGIN || req.nextUrl.origin;
  return new URL(path, origin);
}

function sanitizeRedirectTarget(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function verifyTelegramHash(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(checkString).digest("hex");
  return expectedHash === hash;
}

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role") === "driver" ? "driver" : "passenger";
  const redirectTarget = sanitizeRedirectTarget(searchParams.get("redirect")) ?? (role === "driver" ? "/driver" : "/passenger");

  const params: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) {
    if (k !== "role" && k !== "redirect") params[k] = v;
  }

  if (!verifyTelegramHash(params, botToken)) {
    return NextResponse.redirect(resolveAppUrl(req, `/login?as=${role}&error=telegram_invalid`));
  }

  const authDate = parseInt(params.auth_date ?? "0", 10);
  if (Date.now() / 1000 - authDate > 86400) {
    return NextResponse.redirect(resolveAppUrl(req, `/login?as=${role}&error=telegram_expired`));
  }

  const telegramId = params.id;
  const name = [params.first_name, params.last_name].filter(Boolean).join(" ") || params.username || "Telegram User";
  const image = params.photo_url ?? null;
  const syntheticEmail = `tg_${telegramId}@telegram.local`;
  const now = new Date();

  if (role === "driver") {
    // Find or create driver user
    let user = await db.query.driverUser.findFirst({
      where: eq(driverUser.email, syntheticEmail),
    });

    if (!user) {
      const id = generateId();
      await db.insert(driverUser).values({
        id,
        name,
        email: syntheticEmail,
        emailVerified: true,
        image,
        createdAt: now,
        updatedAt: now,
      });
      user = { id, name, email: syntheticEmail, emailVerified: true, image, createdAt: now, updatedAt: now };
    } else {
      await db.update(driverUser).set({ name, image, updatedAt: now }).where(eq(driverUser.id, user.id));
    }

    const existingAccount = await db.query.driverAccount.findFirst({
      where: and(eq(driverAccount.providerId, "telegram"), eq(driverAccount.accountId, telegramId)),
    });
    if (!existingAccount) {
      await db.insert(driverAccount).values({
        id: generateId(),
        providerId: "telegram",
        accountId: telegramId,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    const sessionToken = generateId();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    await db.insert(driverSession).values({
      id: generateId(),
      token: sessionToken,
      userId: user.id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
    });

    const signedToken = await signSessionToken(sessionToken);
    const response = NextResponse.redirect(resolveAppUrl(req, redirectTarget));
    response.cookies.set(`${COOKIE_SECURE_PREFIX}ba-driver.session_token`, signedToken, {
      httpOnly: true,
      secure: IS_HTTPS,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } else {
    // Passenger
    let user = await db.query.passengerUser.findFirst({
      where: eq(passengerUser.email, syntheticEmail),
    });

    if (!user) {
      const id = generateId();
      await db.insert(passengerUser).values({
        id,
        name,
        email: syntheticEmail,
        emailVerified: true,
        image,
        createdAt: now,
        updatedAt: now,
      });
      user = { id, name, email: syntheticEmail, emailVerified: true, image, createdAt: now, updatedAt: now };
    } else {
      await db.update(passengerUser).set({ name, image, updatedAt: now }).where(eq(passengerUser.id, user.id));
    }

    const existingAccount = await db.query.passengerAccount.findFirst({
      where: and(eq(passengerAccount.providerId, "telegram"), eq(passengerAccount.accountId, telegramId)),
    });
    if (!existingAccount) {
      await db.insert(passengerAccount).values({
        id: generateId(),
        providerId: "telegram",
        accountId: telegramId,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    const sessionToken = generateId();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    await db.insert(passengerSession).values({
      id: generateId(),
      token: sessionToken,
      userId: user.id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
    });

    const signedToken = await signSessionToken(sessionToken);
    const response = NextResponse.redirect(resolveAppUrl(req, redirectTarget));
    response.cookies.set(`${COOKIE_SECURE_PREFIX}ba-passenger.session_token`, signedToken, {
      httpOnly: true,
      secure: IS_HTTPS,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  }
}
