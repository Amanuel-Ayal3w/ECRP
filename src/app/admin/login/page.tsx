"use client";

import { BrandHomeLink } from "@/components/brand-home-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminAuthClient } from "@/lib/auth-client";
import { Lock, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("That doesn’t look like a valid email.");
      return;
    }
    if (!password) {
      toast.error("Enter your password.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    await adminAuthClient.signIn.email(
      { email: trimmed, password },
      {
        onSuccess: () => {
          toast.success("Welcome", { description: "Administrator session started." });
          router.push(redirectTo.startsWith("/admin") ? redirectTo : "/admin");
        },
        onError: (ctx) => {
          setSubmitting(false);
          toast.error(ctx.error.message ?? "Sign-in failed. Try again.");
        },
      },
    );
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.35] dark:opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(90deg, oklch(0.5 0 0 / 8%) 1px, transparent 1px), linear-gradient(oklch(0.5 0 0 / 8%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-10 border-b border-border px-5 py-3.5 flex items-center justify-between">
        <BrandHomeLink variant="header" />
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-border bg-card shadow-[var(--shadow-elevation-sm)] dark:shadow-none">
              <Shield className="h-7 w-7 text-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Restricted area
              </p>
              <h1
                className="mt-1 text-2xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
              >
                Admin sign-in
              </h1>
              <p className="mt-2 text-sm text-muted-foreground font-light max-w-sm mx-auto leading-relaxed">
                Sign in with an administrator account. Passenger and driver accounts cannot access this
                console.
              </p>
            </div>
          </div>

          <div className="border-2 border-border rounded-2xl bg-card p-8 shadow-[var(--shadow-elevation-md)] dark:shadow-none">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Admin email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="admin@yourdomain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-semibold gap-2 mt-1" disabled={submitting}>
                <Lock className="w-3.5 h-3.5" />
                {submitting ? "Signing in…" : "Sign in to console"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Not an admin?{" "}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
                Passenger / driver login
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Unauthorized access attempts may be logged.
          </p>
        </div>
      </div>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-10 h-10 border-2 border-border rounded-xl animate-pulse bg-muted" />
      <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
