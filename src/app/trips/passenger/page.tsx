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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type TripStatus = "completed" | "cancelled";

interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driver: string;
  vehicle: string;
  duration: string;
  distance: string;
  score: number;
  status: TripStatus;
}

const ALL_TRIPS: Trip[] = [
  { id: "t01", from: "Bole Medhanialem", to: "Meskel Square",  date: "Apr 10", time: "8:20 AM",  driver: "Dawit A.",  vehicle: "Toyota Corolla",  duration: "14 min", distance: "3.2 km", score: 4, status: "completed" },
  { id: "t02", from: "CMC",              to: "Piazza",         date: "Apr 8",  time: "7:55 AM",  driver: "Yonas T.",  vehicle: "Hyundai Accent",  duration: "22 min", distance: "6.1 km", score: 5, status: "completed" },
  { id: "t03", from: "Kazanchis",        to: "Megenagna",      date: "Apr 5",  time: "9:10 AM",  driver: "Sara M.",   vehicle: "Nissan Sunny",    duration: "18 min", distance: "4.8 km", score: 5, status: "completed" },
  { id: "t04", from: "Sarbet",           to: "Arat Kilo",      date: "Apr 3",  time: "8:05 AM",  driver: "Abel K.",   vehicle: "Toyota Vitz",     duration: "25 min", distance: "5.9 km", score: 3, status: "completed" },
  { id: "t05", from: "Gerji",            to: "Stadium",        date: "Apr 1",  time: "7:40 AM",  driver: "Hiwot B.",  vehicle: "Hyundai i10",     duration: "19 min", distance: "4.4 km", score: 5, status: "completed" },
  { id: "t06", from: "Ayat",             to: "Bole Atlas",     date: "Mar 28", time: "8:30 AM",  driver: "Meron T.",  vehicle: "Toyota Corolla",  duration: "28 min", distance: "7.2 km", score: 4, status: "completed" },
  { id: "t07", from: "Olympia",          to: "Aware",          date: "Mar 25", time: "9:00 AM",  driver: "Nati S.",   vehicle: "Nissan March",    duration: "11 min", distance: "2.8 km", score: 5, status: "completed" },
  { id: "t08", from: "Mexico",           to: "CMC",            date: "Mar 22", time: "8:15 AM",  driver: "Abebe G.",  vehicle: "Toyota Vitz",     duration: "30 min", distance: "8.1 km", score: 0, status: "cancelled" },
  { id: "t09", from: "Mercato",          to: "Kolfe",          date: "Mar 20", time: "7:50 AM",  driver: "Liya F.",   vehicle: "Hyundai Accent",  duration: "16 min", distance: "3.7 km", score: 4, status: "completed" },
  { id: "t10", from: "Lebu",             to: "Meskel Square",  date: "Mar 18", time: "8:45 AM",  driver: "Dawit A.",  vehicle: "Toyota Corolla",  duration: "35 min", distance: "9.4 km", score: 0, status: "cancelled" },
];

type Filter = "all" | "completed" | "cancelled";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function PassengerTripsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = filter === "all" ? ALL_TRIPS : ALL_TRIPS.filter((t) => t.status === filter);

  const completed = ALL_TRIPS.filter((t) => t.status === "completed");
  const totalDistance = completed.reduce(
    (sum, t) => sum + parseFloat(t.distance),
    0
  );
  const avgRating =
    completed.length > 0
      ? (completed.reduce((s, t) => s + t.score, 0) / completed.length).toFixed(1)
      : "—";

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/passenger" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <BrandIconHomeLink />
            <span className="font-semibold tracking-tight text-foreground text-sm">My Trips</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-border text-muted-foreground font-normal">
            Passenger
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex flex-col px-5 py-5 gap-5 overflow-y-auto pb-24">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Trips",    value: String(completed.length), icon: Car },
            { label: "Avg Rating",     value: String(avgRating),        icon: Star },
            { label: "km Travelled",   value: `${totalDistance.toFixed(1)}`, icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border p-3 flex flex-col items-center justify-center gap-1 text-center">
              <s.icon className="w-4 h-4 text-muted-foreground" />
              <p className="font-bold text-lg tracking-tighter text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
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
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{trip.date} · {trip.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{trip.driver} · {trip.vehicle}</p>
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
                          s <= trip.score ? "text-foreground fill-foreground" : "text-muted-foreground"
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

      <BottomNav role="passenger" />
    </main>
  );
}
