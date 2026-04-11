"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Car,
  Check,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  Star,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

type DriverStatus = "offline" | "online" | "incoming";

const TRIPS = [
  { id: "t1", passenger: "Sara M.", from: "Bole", to: "Meskel Square", time: "Today, 8:20 AM", score: 5 },
  { id: "t2", passenger: "Abel K.", from: "CMC", to: "Stadium", time: "Yesterday", score: 4 },
];

export default function DriverDashboard() {
  const [driverStatus, setDriverStatus] = useState<DriverStatus>("offline");
  const [routeStart, setRouteStart] = useState("");
  const [routeEnd, setRouteEnd] = useState("");
  const [routeSaved, setRouteSaved] = useState(false);

  const handleSaveRoute = () => {
    if (routeStart.trim() && routeEnd.trim()) {
      setRouteSaved(true);
    }
  };

  const toggleOnline = () => {
    if (!routeSaved) return;
    if (driverStatus === "offline") {
      setDriverStatus("online");
      setTimeout(() => setDriverStatus("incoming"), 4000);
    } else {
      setDriverStatus("offline");
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
            <Car className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold tracking-tight text-foreground text-sm">ECRP</span>
        </div>
        <div className="flex items-center gap-3">
          {driverStatus !== "offline" && (
            <span className="flex items-center gap-1.5 text-xs text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              Live
            </span>
          )}
          <Badge variant="outline" className="text-xs border-border text-muted-foreground font-normal">
            Driver
          </Badge>
          <ThemeToggle />
          <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

      {/* Map */}
      <div className="relative w-full h-48 bg-secondary flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(oklch(1 0 0 / 5%) 1px, transparent 1px),
              linear-gradient(90deg, oklch(1 0 0 / 5%) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        {routeSaved && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2/3 h-px bg-foreground/20 relative">
              <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-foreground" />
              <div className="absolute right-0 -top-1 w-2 h-2 rounded-full border border-foreground" />
              <div
                className={`absolute left-0 -top-1 h-2 rounded-full bg-foreground/60 transition-all duration-1000 ${
                  driverStatus !== "offline" ? "w-1/2" : "w-0"
                }`}
              />
            </div>
          </div>
        )}
        <div className="relative z-10 text-center">
          {!routeSaved && (
            <>
              <Navigation className="w-7 h-7 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">Set your route to activate map</p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 py-5 gap-5 overflow-y-auto pb-8">
        {/* Status + Toggle */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
                Driver Status
              </p>
              <p className="font-semibold text-sm text-foreground capitalize">
                {driverStatus === "incoming" ? "Ride Request Incoming" : driverStatus}
              </p>
            </div>

            <button
              onClick={toggleOnline}
              disabled={!routeSaved}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                driverStatus !== "offline" ? "bg-foreground" : "bg-secondary border border-border"
              } ${!routeSaved ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${
                  driverStatus !== "offline"
                    ? "left-8 bg-background"
                    : "left-1 bg-muted-foreground"
                }`}
              />
            </button>
          </div>

          {!routeSaved && (
            <p className="text-xs text-muted-foreground">
              Set your route below before going online.
            </p>
          )}
          {routeSaved && driverStatus === "offline" && (
            <p className="text-xs text-muted-foreground">
              Toggle to go online and start receiving ride requests.
            </p>
          )}
          {driverStatus === "online" && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Scanning for passengers on your route…
            </p>
          )}
        </Card>

        {/* Incoming ride request */}
        {driverStatus === "incoming" && (
          <Card className="bg-card border-2 border-foreground p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-foreground" />
              <p className="text-sm font-semibold text-foreground">New Ride Request</p>
              <Badge className="ml-auto bg-foreground text-background text-xs">Now</Badge>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Meron Tadesse</p>
                <p className="text-xs text-muted-foreground">★ 4.9 · 12 trips</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-5 text-xs bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="w-3 h-3" />
                <span>Bole Medhanialem</span>
              </div>
              <div className="pl-[5px] ml-[3px] border-l border-dashed border-border h-3" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Navigation className="w-3 h-3" />
                <span>Meskel Square</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-border"
                onClick={() => setDriverStatus("online")}
              >
                <X className="w-4 h-4" />
                Decline
              </Button>
              <Link href="/trip/demo-trip-id" className="flex-1">
                <Button className="w-full gap-1.5">
                  <Check className="w-4 h-4" />
                  Accept
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Route setup */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Daily Route</p>
            {routeSaved && (
              <span className="flex items-center gap-1 text-xs text-foreground">
                <CheckCircle className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Start Point
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Your starting location"
                  value={routeStart}
                  onChange={(e) => { setRouteStart(e.target.value); setRouteSaved(false); }}
                  className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                End Point
              </Label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Your destination"
                  value={routeEnd}
                  onChange={(e) => { setRouteEnd(e.target.value); setRouteSaved(false); }}
                  className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>

          <Button
            variant={routeSaved ? "outline" : "default"}
            className="w-full"
            onClick={handleSaveRoute}
            disabled={!routeStart.trim() || !routeEnd.trim()}
          >
            {routeSaved ? "Update Route" : "Save Route"}
          </Button>
        </Card>

        {/* Service score */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-foreground" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Service Score</p>
          </div>

          <div className="flex items-end gap-3 mb-3">
            <span className="text-4xl font-bold tracking-tighter text-foreground">840</span>
            <span className="text-sm text-muted-foreground mb-1">/ 1000 pts</span>
          </div>

          <Progress value={84} className="h-1.5 bg-secondary mb-3" />

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Trips", value: "47" },
              { label: "Avg Rating", value: "4.8" },
              { label: "This month", value: "+120" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-2 rounded-md bg-secondary">
                <p className="font-bold text-sm text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Trip history */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Recent Trips</p>
          </div>

          <div className="flex flex-col gap-2">
            {TRIPS.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {t.from} → {t.to}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.passenger}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                  <div className="flex items-center justify-end gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${
                          s <= t.score ? "text-foreground fill-foreground" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border" />

        <p className="text-xs text-muted-foreground text-center pb-4">
          ECRP · Driver Dashboard · v1.0
        </p>
      </div>
    </main>
  );
}
