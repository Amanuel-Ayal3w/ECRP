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
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type TripStatus = "completed" | "cancelled";

interface Trip {
  id: string;
  passenger: string;
  from: string;
  to: string;
  date: string;
  time: string;
  duration: string;
  distance: string;
  passengerScore: number;
  status: TripStatus;
}

const ALL_TRIPS: Trip[] = [
  { id: "d01", passenger: "Sara M.",   from: "Bole Medhanialem", to: "Meskel Square",  date: "Apr 10", time: "8:20 AM",  duration: "14 min", distance: "3.2 km", passengerScore: 5, status: "completed" },
  { id: "d02", passenger: "Abel K.",   from: "CMC",              to: "Stadium",        date: "Apr 8",  time: "7:55 AM",  duration: "22 min", distance: "6.1 km", passengerScore: 5, status: "completed" },
  { id: "d03", passenger: "Meron T.",  from: "Kazanchis",        to: "Megenagna",      date: "Apr 5",  time: "9:10 AM",  duration: "18 min", distance: "4.8 km", passengerScore: 4, status: "completed" },
  { id: "d04", passenger: "Liya F.",   from: "Sarbet",           to: "Arat Kilo",      date: "Apr 3",  time: "8:05 AM",  duration: "25 min", distance: "5.9 km", passengerScore: 5, status: "completed" },
  { id: "d05", passenger: "Nati S.",   from: "Gerji",            to: "Stadium",        date: "Apr 1",  time: "7:40 AM",  duration: "19 min", distance: "4.4 km", passengerScore: 5, status: "completed" },
  { id: "d06", passenger: "Hiwot B.",  from: "Ayat",             to: "Bole Atlas",     date: "Mar 28", time: "8:30 AM",  duration: "28 min", distance: "7.2 km", passengerScore: 4, status: "completed" },
  { id: "d07", passenger: "Abebe G.",  from: "Olympia",          to: "Aware",          date: "Mar 25", time: "9:00 AM",  duration: "11 min", distance: "2.8 km", passengerScore: 5, status: "completed" },
  { id: "d08", passenger: "Selam D.",  from: "Mexico",           to: "Piazza",         date: "Mar 22", time: "8:15 AM",  duration: "20 min", distance: "4.9 km", passengerScore: 0, status: "cancelled" },
  { id: "d09", passenger: "Kiya M.",   from: "Mercato",          to: "Kolfe",          date: "Mar 20", time: "7:50 AM",  duration: "16 min", distance: "3.7 km", passengerScore: 4, status: "completed" },
  { id: "d10", passenger: "Tesfaye W.",from: "Lebu",             to: "Meskel Square",  date: "Mar 18", time: "8:45 AM",  duration: "35 min", distance: "9.4 km", passengerScore: 5, status: "completed" },
  { id: "d11", passenger: "Ruth A.",   from: "Asco",             to: "CMC",            date: "Mar 15", time: "8:00 AM",  duration: "27 min", distance: "6.8 km", passengerScore: 0, status: "cancelled" },
  { id: "d12", passenger: "Biruk H.",  from: "Teklehaimanot",    to: "Bole Atlas",     date: "Mar 12", time: "9:20 AM",  duration: "32 min", distance: "8.5 km", passengerScore: 4, status: "completed" },
];

type Filter = "all" | "completed" | "cancelled";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All",       value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function DriverTripsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = filter === "all" ? ALL_TRIPS : ALL_TRIPS.filter((t) => t.status === filter);

  const completed = ALL_TRIPS.filter((t) => t.status === "completed");
  const totalDistance = completed.reduce((sum, t) => sum + parseFloat(t.distance), 0);
  const avgRating =
    completed.length > 0
      ? (completed.reduce((s, t) => s + t.passengerScore, 0) / completed.length).toFixed(1)
      : "—";
  const uniquePassengers = new Set(completed.map((t) => t.passenger)).size;

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
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Trips",    value: String(completed.length), icon: Car },
            { label: "Avg Rating",     value: String(avgRating),        icon: Star },
            { label: "km Driven",      value: totalDistance.toFixed(1), icon: TrendingUp },
            { label: "Passengers",     value: String(uniquePassengers), icon: Users },
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
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No trips found.</p>
          )}
          {visible.map((trip) => (
            <Card key={trip.id} className="bg-card border-border p-4">
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">{trip.passenger}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{trip.date} · {trip.time}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium border ${
                    trip.status === "completed"
                      ? "border-border text-muted-foreground"
                      : "border-border text-muted-foreground/60"
                  }`}
                >
                  {trip.status === "completed" ? "Completed" : "Cancelled"}
                </Badge>
              </div>

              {/* Route */}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-foreground shrink-0" />
                  <p className="text-sm font-medium text-foreground truncate">{trip.from}</p>
                </div>
                <div className="ml-[6px] h-3 border-l border-dashed border-border" />
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground truncate">{trip.to}</p>
                </div>
              </div>

              <Separator className="bg-border mb-3" />

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {trip.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {trip.distance}
                  </span>
                </div>
                {trip.status === "completed" && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= trip.passengerScore
                            ? "text-foreground fill-foreground"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav role="driver" />
    </main>
  );
}
