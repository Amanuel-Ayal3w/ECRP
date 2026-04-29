"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BrandIconHomeLink } from "@/components/brand-home-link";
import BottomNav from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  Car,
  Clock,
  MapPin,
  Navigation,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type TripStatus = "completed" | "cancelled";

interface Trip {
  id: string;
  passengerId: string;
  pickup: string;
  destination: string;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

type Filter = "all" | "completed" | "cancelled";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All",       value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function calcDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function DriverTripsPage() {
  const [filter, setFilter]   = useState<Filter>("all");
  const [trips, setTrips]     = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceScore, setServiceScore]     = useState<number | null>(null);
  const [tripsCompleted, setTripsCompleted] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/trips/history", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/driver/me",     { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([historyData, profileData]: [{ trips?: Trip[] }, { user?: { serviceScore?: number; tripsCompleted?: number } }]) => {
        setTrips((historyData.trips ?? []) as Trip[]);
        setServiceScore(profileData.user?.serviceScore ?? 0);
        setTripsCompleted(profileData.user?.tripsCompleted ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === "all" ? trips : trips.filter((t) => t.status === filter);
  const uniquePassengers = new Set(trips.filter((t) => t.status === "completed").map((t) => t.passengerId)).size;

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/driver" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <BrandIconHomeLink />
            <span className="font-semibold tracking-tight text-foreground text-sm">My Trips</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-border text-muted-foreground font-normal">
            Driver
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex flex-col px-5 py-5 gap-5 overflow-y-auto pb-24">
        {/* Stats row */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Trips Completed", value: String(tripsCompleted ?? 0),  icon: Car },
              { label: "Service Score",   value: `${serviceScore ?? 0} pts`,   icon: TrendingUp },
              { label: "Passengers",      value: String(uniquePassengers),      icon: Users },
              { label: "Pts Per Trip",    value: "10 pts",                      icon: Clock },
            ].map((s) => (
              <Card key={s.label} className="bg-card border-border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="font-bold text-xl tracking-tighter text-foreground leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Trip list */}
        <div className="flex flex-col gap-3">
          {loading && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="bg-card border-border p-4 h-28 animate-pulse" />
              ))}
            </div>
          )}
          {!loading && visible.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No trips found.</p>
          )}
          {!loading && visible.map((trip) => {
            const duration = calcDuration(trip.startedAt, trip.endedAt);
            return (
              <Card key={trip.id} className="bg-card border-border p-4">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">
                      Passenger {trip.passengerId.slice(0, 8).toUpperCase()}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(trip.endedAt ?? trip.createdAt)} · {formatTime(trip.endedAt ?? trip.createdAt)}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium border border-border text-muted-foreground"
                  >
                    {trip.status === "completed" ? "Completed" : "Cancelled"}
                  </Badge>
                </div>

                {/* Route */}
                <div className="flex flex-col gap-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">{trip.pickup}</p>
                  </div>
                  <div className="ml-[6px] h-3 border-l border-dashed border-border" />
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">{trip.destination}</p>
                  </div>
                </div>

                <Separator className="bg-border mb-3" />

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      #{trip.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  {trip.status === "completed" && (
                    <span className="text-xs font-semibold text-foreground">+10 pts</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <BottomNav role="driver" />
    </main>
  );
}
