"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { Car, ChevronRight, Menu, Shield, Users, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "onboarding",  href: "/onboarding" },
  { label: "Safety",       href: "#how-it-works" },
];

function RoleAuthDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "signin" | "signup";
}) {
  const router = useRouter();
  const go = (as: "passenger" | "driver") => {
    onOpenChange(false);
    const path = mode === "signin" ? "/login" : "/signup";
    router.push(`${path}?as=${as}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "signin" ? "Sign in as" : "Sign up as"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Pick how you use ECRP. You can update this later in your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            className="w-full h-12 justify-between gap-2 px-4 font-medium"
            onClick={() => go("passenger")}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4 shrink-0" />
              Passenger
            </span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 justify-between gap-2 px-4 font-medium border-border"
            onClick={() => go("driver")}
          >
            <span className="flex items-center gap-2.5">
              <Car className="w-4 h-4 shrink-0" />
              Driver
            </span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LandingHeader({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-200 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
              <Car className="w-3.5 h-3.5 text-background" />
            </div>
            <span
              className="font-bold text-base text-foreground"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              ECRP
            </span>
          </Link>

          {/* Desktop nav — centred */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-all"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
           <div className="flex items-center gap-2 flex-shrink-0">
             <ThemeToggle />
             <Button type="button" size="sm" className="h-8 px-3 text-xs font-medium" onClick={onSignIn}>
               Sign In
             </Button>
            {/* Mobile hamburger */}
            <button
              className="md:hidden w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-5 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-all"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 mt-1 border-t border-border flex flex-col gap-2">
              <Button
                type="button"
                className="w-full h-9 text-sm"
                size="sm"
                onClick={() => {
                  setMenuOpen(false);
                  onSignIn();
                }}
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Spacer so content doesn't hide under fixed header */}
      <div className="h-14" />
    </>
  );
}

const FEATURES = [
  {
    num: "01",
    icon: <Users className="w-4 h-4" />,
    title: "Telegram Login",
    desc: "Sign in instantly with your Telegram account. No passwords, no KYC, no friction — your identity is already verified.",
    tag: "Auth",
  },
  {
    num: "02",
    icon: <Car className="w-4 h-4" />,
    title: "Smart Matching",
    desc: "Our algorithm uses live map data to pair passengers with nearby drivers whose declared routes naturally align with the destination.",
    tag: "Routing",
  },
  {
    num: "03",
    icon: <Zap className="w-4 h-4" />,
    title: "Live Tracking",
    desc: "Follow every trip in real-time. Drivers share GPS updates every few seconds so passengers always know exactly where the ride is.",
    tag: "Real-Time",
  },
  {
    num: "04",
    icon: <Shield className="w-4 h-4" />,
    title: "Safety First",
    desc: "A persistent panic button on every active trip sends GPS coordinates and trip details to admins instantly, keeping all parties safe.",
    tag: "Safety",
  },
];

function HeroHeading() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const strokeColor = !mounted || theme === "dark"
    ? "oklch(0.97 0 0 / 28%)"
    : "oklch(0.1 0 0 / 22%)";

  return (
    <h1
      className="text-[clamp(2rem,5.5vw,3.6rem)] font-extrabold leading-[1.0] mb-7 text-foreground"
      style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
    >
      Rides that move
      <br />
      <span
        className="text-transparent select-none"
        style={{ WebkitTextStroke: `1.5px ${strokeColor}` }}
      >
        communities
      </span>{" "}
      <span className="text-foreground">forward.</span>
    </h1>
  );
}

export default function LandingPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [rolePicker, setRolePicker] = useState<{
    open: boolean;
    mode: "signin" | "signup";
  }>({ open: false, mode: "signup" });

  useEffect(() => setMounted(true), []);

  const openSignIn = () => setRolePicker({ open: true, mode: "signin" });

  const dotColor = !mounted || theme === "dark"
    ? "oklch(1 0 0 / 15%)"
    : "oklch(0 0 0 / 10%)";

  const glowColor = !mounted || theme === "dark"
    ? "oklch(1 0 0 / 5%)"
    : "oklch(0 0 0 / 3%)";

  return (
    <main className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Full-page dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[360px] pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at top, ${glowColor} 0%, transparent 70%)`,
        }}
      />

      <LandingHeader onSignIn={openSignIn} />

      <RoleAuthDialog
        open={rolePicker.open}
        mode={rolePicker.mode}
        onOpenChange={(open) => setRolePicker((s) => ({ ...s, open }))}
      />

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-2xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 border border-border rounded-full px-3.5 py-1 text-xs text-muted-foreground mb-8 bg-card/50 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
          Community-Driven Ride Sharing
        </div>

        <HeroHeading />

        <p className="text-muted-foreground text-[0.875rem] leading-relaxed max-w-sm mb-10 font-light">
          ECRP connects everyday commuters with volunteer drivers. No fares, no contracts — just
          people helping people get from A to B.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[260px]">
          <Button type="button" className="w-full h-10 text-sm font-medium flex-1" onClick={openSignIn}>
            Sign In
          </Button>
          <Link href="#how-it-works" className="flex-1">
            <Button variant="outline" className="w-full h-10 text-sm border-border">
              How it works
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-14 pt-6 border-t border-border w-full justify-center">
          {[
            { value: "2,400+", label: "Trips" },
            { value: "340", label: "Drivers" },
            { value: "4.9★", label: "Rating" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                {s.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="relative z-10 border-t border-border">
        <div className="px-6 py-8 max-w-xl mx-auto">
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mb-1">
            How It Works
          </p>
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            Four steps to a better commute.
          </h2>
        </div>

        <div className="max-w-xl mx-auto border-t border-border">
          {FEATURES.map((f, i) => {
            const isEven = i % 2 === 1;
            return (
              <div
                key={f.num}
                className={`border-b border-border ${isEven ? "bg-secondary/50" : "bg-transparent"}`}
              >
                <div className="px-6 py-6 flex items-start gap-5">
                  {/* Step number */}
                  <span
                    className="text-xs font-bold text-muted-foreground/50 select-none flex-shrink-0 w-6 pt-0.5 tabular-nums"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {f.num}
                  </span>

                  {/* Icon chip */}
                  <div className="w-8 h-8 rounded-md bg-secondary border border-border/60 flex items-center justify-center text-foreground flex-shrink-0">
                    {f.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="font-semibold text-sm text-foreground"
                        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                      >
                        {f.title}
                      </h3>
                      <span className="text-[9px] bg-secondary border border-border/60 text-muted-foreground rounded-full px-2 py-0.5 tracking-widest uppercase flex-shrink-0">
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-border">
        <div className="max-w-xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h2
              className="text-xl font-bold text-foreground mb-1"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Ready to join?
            </h2>
            <p className="text-sm text-muted-foreground font-light">
              Create an account or sign in — pick passenger or driver first, then continue.
            </p>
          </div>
          <Button
            type="button"
            className="h-10 px-6 text-sm font-medium flex-shrink-0"
            onClick={openSignIn}
          >
            Sign In →
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-5 py-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>© 2026 ECRP</span>
        <span>Community Ride Platform</span>
      </footer>
    </main>
  );
}
