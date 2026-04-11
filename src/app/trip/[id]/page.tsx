"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Car, ChevronDown, MapPin, Navigation, Phone, Star, User } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

export default function ActiveTripPage() {
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicSent, setPanicSent] = useState(false);
  const [tripProgress] = useState(38);

  const handlePanic = () => {
    setPanicSent(true);
    setTimeout(() => {
      setPanicOpen(false);
      setPanicSent(false);
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
            <Car className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold tracking-tight text-foreground text-sm">Live Trip</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
            In Progress
          </span>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground font-normal">
            #TRP-8821
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {/* Map */}
      <div className="relative w-full h-64 bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(oklch(1 0 0 / 5%) 1px, transparent 1px),
              linear-gradient(90deg, oklch(1 0 0 / 5%) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Animated route line */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3/4 relative">
            <div className="h-px bg-foreground/20 w-full" />
            <div
              className="absolute top-0 left-0 h-px bg-foreground transition-all duration-1000"
              style={{ width: `${tripProgress}%` }}
            />
            <div className="absolute -top-1.5 left-0 w-3 h-3 rounded-full bg-foreground flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-background" />
            </div>
            <div
              className="absolute -top-2 transition-all duration-1000"
              style={{ left: `calc(${tripProgress}% - 8px)` }}
            >
              <Car className="w-4 h-4 text-foreground" />
            </div>
            <div className="absolute -top-1.5 right-0 w-3 h-3 rounded-full border border-foreground" />
          </div>
        </div>

        {/* Location labels */}
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 rounded px-2 py-1 backdrop-blur-sm">
          Bole Medhanialem
        </div>
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-card/80 rounded px-2 py-1 backdrop-blur-sm">
          Meskel Square
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Trip progress</span>
          <span className="font-medium text-foreground">{tripProgress}%</span>
        </div>
        <Progress value={tripProgress} className="h-1 bg-secondary" />
      </div>

      <div className="flex-1 flex flex-col px-5 py-5 gap-4 overflow-y-auto pb-6">
        {/* ETA card */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "ETA", value: "8 min", icon: <Navigation className="w-3.5 h-3.5" /> },
            { label: "Distance", value: "3.2 km", icon: <MapPin className="w-3.5 h-3.5" /> },
            { label: "Duration", value: "12 min", icon: <Car className="w-3.5 h-3.5" /> },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                {s.icon}
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="font-bold text-sm text-foreground">{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Driver/Passenger info */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Dawit Alemu</p>
              <p className="text-xs text-muted-foreground">Toyota Corolla · AA 3-45678</p>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${s <= 4 ? "text-foreground fill-foreground" : "text-muted-foreground"}`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-0.5">4.8</span>
              </div>
            </div>
            <button className="w-9 h-9 rounded-full border border-border bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
              <Phone className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </Card>

        {/* Route summary */}
        <Card className="bg-card border-border p-4">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">
            Route Summary
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-foreground flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Bole Medhanialem</p>
                <p className="text-xs text-muted-foreground">Pickup · 9:12 AM</p>
              </div>
            </div>
            <div className="ml-[3px] pl-4 border-l border-dashed border-border h-4" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full border border-foreground flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Meskel Square</p>
                <p className="text-xs text-muted-foreground">Destination · ~9:24 AM</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Panic button */}
        <Button
          variant="outline"
          className="w-full h-14 border-2 border-foreground/30 hover:border-foreground hover:bg-secondary gap-2 font-semibold text-sm transition-all"
          onClick={() => setPanicOpen(true)}
        >
          <AlertTriangle className="w-5 h-5" />
          Emergency Panic Button
        </Button>

        <Link href="/dashboard/passenger">
          <Button variant="outline" className="w-full border-border text-muted-foreground gap-1.5 text-sm">
            <ChevronDown className="w-4 h-4" />
            End Trip Early
          </Button>
        </Link>
      </div>

      {/* Panic modal */}
      <Dialog open={panicOpen} onOpenChange={setPanicOpen}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5" />
              Emergency Alert
            </DialogTitle>
          </DialogHeader>

          {!panicSent ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This will immediately send your current GPS coordinates and trip details to the admin
                dashboard and emergency contacts.
              </p>
              <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Trip #TRP-8821</p>
                <p>Location: Bole — Meskel Square</p>
                <p>Driver: Dawit Alemu · AA 3-45678</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => setPanicOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-foreground text-background"
                  onClick={handlePanic}
                >
                  Send Alert Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full border-2 border-foreground flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-foreground" />
              </div>
              <p className="font-semibold text-foreground">Alert Sent</p>
              <p className="text-sm text-muted-foreground text-center">
                Emergency services and admin have been notified. Stay calm.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
