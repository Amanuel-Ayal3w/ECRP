"use client";

import { BrandHomeLink } from "@/components/brand-home-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { parseAuthRole } from "@/lib/auth-role";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";

const BOT_USERNAME = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const TELEGRAM_REQUEST_ACCESS = (process.env.NEXT_PUBLIC_TELEGRAM_REQUEST_ACCESS ?? "read").toLowerCase();

function TelegramAuthForm() {
  const searchParams = useSearchParams();
  const role = parseAuthRole(searchParams.get("as")) ?? "passenger";
  const redirect = searchParams.get("redirect");
  const containerRef = useRef<HTMLDivElement>(null);

  const callbackParams = new URLSearchParams({ role });
  if (redirect) callbackParams.set("redirect", redirect);

  const callbackPath = `/api/telegram/callback?${callbackParams.toString()}`;
  const callbackUrl = APP_ORIGIN ? `${APP_ORIGIN}${callbackPath}` : callbackPath;

  useEffect(() => {
    if (!containerRef.current || !BOT_USERNAME) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", callbackUrl);
    // Default to read-only login to avoid Telegram message confirmation bottlenecks.
    script.setAttribute("data-request-access", TELEGRAM_REQUEST_ACCESS === "write" ? "write" : "read");
    script.async = true;
    containerRef.current.appendChild(script);
  }, [callbackUrl]);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(circle, oklch(0.5 0 0 / 12%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-10 border-b border-border px-5 py-3.5 flex items-center justify-between">
        <BrandHomeLink variant="header" />
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-10">
            <BrandHomeLink variant="hero" />
          </div>

          <div className="border border-border rounded-xl bg-card p-7 shadow-[var(--shadow-elevation-sm)] dark:shadow-none text-center">
            <h1
              className="text-xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Continue with Telegram
            </h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed font-light">
              Tap the button below to authenticate using your Telegram account.
            </p>

            {BOT_USERNAME ? (
              <div ref={containerRef} className="flex justify-center" />
            ) : (
              <p className="text-sm text-destructive">
                Telegram bot is not configured. Set{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> in your environment.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TelegramAuthPage() {
  return (
    <Suspense>
      <TelegramAuthForm />
    </Suspense>
  );
}
