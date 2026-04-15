"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandHomeLink } from "@/components/brand-home-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { driverAuthClient, passengerAuthClient } from "@/lib/auth-client";
import {
  asQuery,
  parseAuthRole,
  telegramPath,
} from "@/lib/auth-role";
import { Mail, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = parseAuthRole(searchParams.get("as"));
  const q = asQuery(role);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
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
    // Choose client based on the role context (?as=passenger or ?as=driver)
    const client = role === "driver" ? driverAuthClient : passengerAuthClient;
    const dest   = role === "driver" ? "/driver" : "/passenger";

    setSubmitting(true);
    await client.signIn.email(
      { email: trimmed, password },
      {
        onSuccess: () => {
          toast.success("Signed in", { description: "Welcome back to ECRP." });
          router.push(dest);
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

          <div className="border border-border rounded-xl bg-card p-7 shadow-[var(--shadow-elevation-sm)] dark:shadow-none">
            <div className="mb-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <h1
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
                >
                  Welcome back
                </h1>
                {role && (
                  <Badge variant="outline" className="text-[10px] border-border capitalize font-normal">
                    {role}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                {role
                  ? `Sign in as a ${role} with email or Telegram.`
                  : "Sign in with email or Telegram to access the community ride platform."}
              </p>
            </div>

            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="login-password" className="text-xs text-muted-foreground uppercase tracking-wider">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                    onClick={() => toast.message("Password reset will be available when email auth is connected.")}
                  >
                    Forgot?
                  </button>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-semibold gap-2" disabled={submitting}>
                <Mail className="w-3.5 h-3.5" />
                {submitting ? "Signing in…" : "Sign in with email"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-card px-3 text-muted-foreground">Or</span>
              </div>
            </div>

            <Link href={telegramPath(role)}>
              <Button variant="outline" className="w-full h-11 text-sm font-semibold gap-2 border-border">
                <Send className="w-3.5 h-3.5" />
                Continue with Telegram
              </Button>
            </Link>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href={`/signup${q}`} className="font-medium text-foreground underline underline-offset-2">
                Sign up
              </Link>
            </p>

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

          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {["Email or Telegram", "Secure", "Community"].map((label) => (
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

function LoginFallback() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-10 h-10 bg-foreground rounded-lg animate-pulse" />
      <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
