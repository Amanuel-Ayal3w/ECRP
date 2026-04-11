"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Car, Check, ChevronRight, Clock, MapPin, Shield, Star, Users, Zap } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
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

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Role</span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-5 h-5 rounded-full border border-border text-muted-foreground flex items-center justify-center text-[10px]">2</span>
              <span>Profile</span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-5 h-5 rounded-full border border-border text-muted-foreground flex items-center justify-center text-[10px]">3</span>
              <span>Done</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              How will you use ECRP?
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose your role — you can change it later from your profile.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Passenger card */}
            <div className="border border-border rounded-xl bg-card flex flex-col overflow-hidden">
              {/* Card header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Users className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p
                      className="font-bold text-base text-foreground"
                      style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                    >
                      Passenger
                    </p>
                    <p className="text-xs text-muted-foreground">I need a ride</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Request rides from volunteer drivers in your area. Match with commuters
                  heading your way and track every trip live.
                </p>
              </div>

              {/* Perks */}
              <div className="p-5 flex flex-col gap-2.5 flex-1">
                {[
                  { icon: <Zap className="w-3.5 h-3.5" />, text: "Instant ride matching" },
                  { icon: <MapPin className="w-3.5 h-3.5" />, text: "Live GPS tracking" },
                  { icon: <Shield className="w-3.5 h-3.5" />, text: "In-trip panic button" },
                  { icon: <Star className="w-3.5 h-3.5" />, text: "Rate your driver" },
                ].map((p) => (
                  <div key={p.text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="text-foreground flex-shrink-0">{p.icon}</span>
                    {p.text}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="p-5 pt-0">
                <Link href="/dashboard/passenger">
                  <Button
                    variant="outline"
                    className="w-full border-border gap-2 font-medium text-sm h-10"
                  >
                    Join as Passenger
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Driver card */}
            <div className="border-2 border-foreground rounded-xl bg-card flex flex-col overflow-hidden relative">
              {/* Popular badge */}
              <div className="absolute top-3.5 right-3.5">
                <span className="text-[9px] bg-foreground text-background rounded-full px-2 py-0.5 font-semibold tracking-widest uppercase">
                  Popular
                </span>
              </div>

              {/* Card header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
                    <Car className="w-5 h-5 text-background" />
                  </div>
                  <div>
                    <p
                      className="font-bold text-base text-foreground"
                      style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                    >
                      Driver
                    </p>
                    <p className="text-xs text-muted-foreground">I have spare seats</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Offer empty seats on your daily commute. Help your community, earn
                  service score, and keep your vehicle on the road contributing.
                </p>
              </div>

              {/* Perks */}
              <div className="p-5 flex flex-col gap-2.5 flex-1">
                {[
                  { icon: <Check className="w-3.5 h-3.5" />, text: "Set your own daily route" },
                  { icon: <Check className="w-3.5 h-3.5" />, text: "Accept or decline requests" },
                  { icon: <Clock className="w-3.5 h-3.5" />, text: "Go online only when ready" },
                  { icon: <Star className="w-3.5 h-3.5" />, text: "Build your service score" },
                ].map((p) => (
                  <div key={p.text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="text-foreground flex-shrink-0">{p.icon}</span>
                    {p.text}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="p-5 pt-0">
                <Link href="/onboarding/driver">
                  <Button className="w-full gap-2 font-medium text-sm h-10">
                    Join as Driver
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
