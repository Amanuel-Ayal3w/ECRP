"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  Clock,
  History,
  MapPin,
  Navigation,
  Search,
  Star,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandHomeLink } from "@/components/brand-home-link";
import AppMap from "@/components/app-map";
import BottomNav from "@/components/bottom-nav";
import ProfileSheet from "@/components/profile-sheet";
import { usePassengerSession } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type RideStatus = "idle" | "searching" | "matched";

type RideRecord = {
  id: string;
  pickup: string;
  destination: string;
  status: string;
  createdAt: string;
};

type RideMatch = {
  driverId: string;
  name: string;
  email: string;
  routeStart: string | null;
  routeEnd: string | null;
  score: number;
};

type HistoryTrip = {
  id: string;
  pickup: string;
  destination: string;
  status: string;
  endedAt: string | null;
};

const LOCATIONS = [
  "Bole Medhanialem",
  "Bole Atlas",
  "Meskel Square",
  "Piazza",
  "Megenagna",
  "CMC",
  "Kazanchis",
  "Arat Kilo",
  "Semen Hotel",
  "Mexico",
  "Stadium",
  "Lebu",
  "Teklehaimanot",
  "Mercato",
  "Gotera",
  "Gerji",
  "Ayat",
  "Sarbet",
  "Olympia",
  "Aware",
  "Kolfe",
  "Asco",
];

function LocationInput({
  id,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = value.trim().length > 0
    ? LOCATIONS.filter((l) => l.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : LOCATIONS.slice(0, 6);

  const showDropdown = focused && open;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        id={id}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setFocused(false); } }}
        className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground/50"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={`${id}-list`}
        role="combobox"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-[var(--shadow-elevation-md)] overflow-hidden"
        >
          {suggestions.map((s) => (
            <li
              key={s}
              role="option"
              aria-selected={value === s}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground cursor-pointer hover:bg-secondary transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
                setFocused(false);
              }}
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function initials(name: string | undefined | null) {
  if (!name) return null;
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function PassengerDashboard() {
  const { data: session, isPending } = usePassengerSession();
  const router = useRouter();
  const userInitials = initials(session?.user?.name);

  // Auth guard: redirect to login if no passenger session
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login?as=passenger");
    }
  }, [isPending, session, router]);

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState<RideStatus>("idle");
  const [profileOpen, setProfileOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeRide, setActiveRide] = useState<RideRecord | null>(null);
  const [match, setMatch] = useState<RideMatch | null>(null);
  const [historyTrips, setHistoryTrips] = useState<HistoryTrip[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/trips/history", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { trips?: HistoryTrip[] };
      setHistoryTrips(data.trips ?? []);
    } catch {
      setHistoryTrips([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshMatch = async (rideId: string) => {
    try {
      const res = await fetch(`/api/rides/matches?rideId=${encodeURIComponent(rideId)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { matches?: RideMatch[] };
      setMatch(data.matches?.[0] ?? null);
    } catch {
      // ignore transient polling failures
    }
  };

  const loadActiveTrip = async () => {
    try {
      const res = await fetch("/api/trips/active", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { trip?: RideRecord | null; actor?: string };
      const trip = data.trip ?? null;
      setActiveRide(trip);

      if (!trip) {
        setStatus("idle");
        setMatch(null);
        return;
      }

      setPickup(trip.pickup);
      setDestination(trip.destination);

      if (trip.status === "requested") setStatus("searching");
      if (trip.status === "matched" || trip.status === "accepted" || trip.status === "in_progress") {
        setStatus("matched");
        await refreshMatch(trip.id);
      }
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    void loadActiveTrip();
    void fetchHistory();
  }, []);

  useEffect(() => {
    if (status !== "searching" || !activeRide) return;
    const timer = window.setInterval(() => {
      void loadActiveTrip();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [status, activeRide]);

  const handleSearch = async () => {
    if (!pickup.trim() || !destination.trim()) {
      toast.error("Please fill in both pickup and destination.");
      return;
    }
    if (pickup.trim() === destination.trim()) {
      toast.error("Pickup and destination cannot be the same.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pickup: pickup.trim(), destination: destination.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ride?: RideRecord;
        matched?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ride) {
        toast.error(data.error ?? "Failed to request ride.");
        return;
      }

      setActiveRide(data.ride);
      if (data.matched) {
        setStatus("matched");
        toast.success("Driver candidates found.");
        await refreshMatch(data.ride.id);
      } else {
        setStatus("searching");
        setMatch(null);
        toast("Searching for drivers…", { description: `${pickup} → ${destination}` });
      }
      await fetchHistory();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRide) {
      setStatus("idle");
      setPickup("");
      setDestination("");
      return;
    }

    const res = await fetch(`/api/trips/${activeRide.id}/cancel`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Could not cancel ride.");
      return;
    }

    setStatus("idle");
    setActiveRide(null);
    setMatch(null);
    setPickup("");
    setDestination("");
    toast("Ride request cancelled.");
    await fetchHistory();
  };

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
        <BrandHomeLink variant="nav" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-border text-muted-foreground font-normal">
            Passenger
          </Badge>
          <ThemeToggle />
          <button
            className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
            onClick={() => setProfileOpen(true)}
            aria-label="Open profile"
          >
            {userInitials ? (
              <span className="text-[11px] font-bold text-background leading-none">{userInitials}</span>
            ) : (
              <User className="w-4 h-4 text-background" />
            )}
          </button>
        </div>
      </header>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} role="passenger" />

      {/* Map — inset to match card width */}
      <div className="px-5 pt-5">
        <AppMap
          heightClass="h-72"
          zoom={13}
          className="rounded-xl overflow-hidden border border-border"
          markers={
            status === "matched"
              ? [
                  { id: "pickup", lngLat: [38.7685, 9.0161], color: "#ffffff" },
                  { id: "dest",   lngLat: [38.7611, 9.0054], color: "#888888" },
                ]
              : []
          }
        />
      </div>

      <div className="flex-1 flex flex-col px-5 py-5 gap-5">
        {/* Ride Request Card */}
        {status === "idle" && (
          <Card className="bg-card border-border p-5">
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">
              Request a Ride
            </p>

            <div className="flex flex-col gap-2 mb-4">
              <LocationInput
                id="pickup"
                icon={MapPin}
                value={pickup}
                onChange={setPickup}
                placeholder="Pickup location"
              />
              <div className="flex items-center gap-2 px-3">
                <div className="w-px flex-1 bg-border" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <LocationInput
                id="destination"
                icon={Navigation}
                value={destination}
                onChange={setDestination}
                placeholder="Destination"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleSearch}
              disabled={!pickup.trim() || !destination.trim() || submitting}
            >
              <Search className="w-4 h-4" />
              {submitting ? "Requesting…" : "Find a Driver"}
            </Button>
          </Card>
        )}

        {/* Searching state */}
        {status === "searching" && (
          <Card className="bg-card border-border p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-muted-foreground tracking-widest uppercase">
                Finding drivers…
              </p>
              <button onClick={handleCancel} aria-label="Cancel search">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-24 bg-secondary" />
                    <Skeleton className="h-2.5 w-36 bg-secondary" />
                  </div>
                  <Skeleton className="h-3 w-12 bg-secondary" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4 animate-pulse">
              Matching with nearby drivers… this refreshes automatically.
            </p>
          </Card>
        )}

        {/* Matched state */}
        {status === "matched" && (
          <Card className="bg-card border-border p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
                  Driver Found
                </p>
                <Badge className="bg-foreground text-background text-xs font-medium">
                  Waiting for acceptance
                </Badge>
              </div>
              <button onClick={handleCancel} aria-label="Cancel ride">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center">
                <User className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Dawit Alemu</p>
                <p className="text-xs text-muted-foreground">
                  {match ? `${match.email} · route ${match.routeStart ?? "-"} → ${match.routeEnd ?? "-"}` : "Driver details pending"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= (match ? 4 : 3) ? "text-foreground fill-foreground" : "text-muted-foreground"}`}
                    />
                  ))}
                    <span className="text-xs text-muted-foreground ml-1">{match ? "4.0" : "3.0"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="font-bold text-foreground">{match ? "5 min" : "--"}</p>
              </div>
            </div>

            <Separator className="bg-border mb-4" />

            <div className="flex flex-col gap-2 mb-5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                <span>{pickup}</span>
              </div>
              <div className="pl-[9px] border-l border-dashed border-border ml-[2px]">
                <div className="h-3" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full border border-foreground" />
                <span>{destination}</span>
              </div>
            </div>

            <Link href={activeRide ? `/trip/${activeRide.id}` : "/trip"}>
              <Button className="w-full" size="sm">
                View Live Trip
              </Button>
            </Link>
          </Card>
        )}

        {/* Past rides */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Recent Rides</p>
          </div>

          <div className="flex flex-col gap-2">
            {!historyLoading && historyTrips.length === 0 && (
              <div className="text-xs text-muted-foreground border border-border bg-card rounded-lg p-3">
                No completed or cancelled trips yet.
              </div>
            )}
            {historyTrips.map((ride) => (
              <div
                key={ride.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {ride.pickup} → {ride.destination}
                  </p>
                  <p className="text-xs text-muted-foreground">{ride.status}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ride.endedAt ? new Date(ride.endedAt).toLocaleDateString() : "-"}
                  </p>
                  <div className="flex items-center justify-end gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${
                          s <= (ride.status === "completed" ? 4 : 2) ? "text-foreground fill-foreground" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav role="passenger" />
    </main>
  );
}
