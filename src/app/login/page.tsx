"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Car, Send } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(circle, oklch(0.5 0 0 / 12%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
            <Car className="w-3.5 h-3.5 text-background" />
          </div>
          <span
            className="font-bold text-base text-foreground"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            ECRP
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Centered content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-10">
            <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-background" />
            </div>
            <span
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
            >
              ECRP
            </span>
          </div>

          {/* Card */}
          <div className="border border-border rounded-xl bg-card p-7">
            <div className="mb-7 text-center">
              <h1
                className="text-xl font-bold text-foreground mb-1.5"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Sign in with Telegram to access the community ride platform.
              </p>
            </div>

            <Link href="/onboarding">
              <Button className="w-full h-11 text-sm font-semibold gap-2">
                <Send className="w-3.5 h-3.5" />
                Continue with Telegram
              </Button>
            </Link>

            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                By continuing, you agree to our{" "}
                <span className="text-foreground underline underline-offset-2 cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-foreground underline underline-offset-2 cursor-pointer">
                  Privacy Policy
                </span>
                .
              </p>
            </div>
          </div>

          {/* Pills */}
          <div className="flex gap-2 justify-center mt-5">
            {["Secure", "No password", "Instant"].map((label) => (
              <span
                key={label}
                className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
