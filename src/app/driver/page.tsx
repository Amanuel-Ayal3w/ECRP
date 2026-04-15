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
import { BrandHomeLink } from "@/components/brand-home-link";
import AppMap from "@/components/app-map";
import { ThemeToggle } from "@/components/theme-toggle";
import BottomNav from "@/components/bottom-nav";
import ProfileSheet from "@/components/profile-sheet";
import { useDriverSession } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type DriverStatus = "offline" | "online" | "incoming";

type DriverTrip = {
  id: string;
  pickup: string;
  destination: string;
  passengerId: string;
  status: string;
};

/* Popular Addis Ababa locations for autocomplete */
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
  "Akaki",
  "Kaliti",
  "Teklehaimanot",
  "Mercato",
  "Gotera",
  "Gerji",
  "Ayat",
  "Sarbet",
  "Olympia",
  "Aware",
  "Kolfe",
  "Kality",
  "Asco",
];

type HistoryTrip = {
  id: string;
  pickup: string;
  destination: string;
  status: string;
  endedAt: string | null;
};

function LocationInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  id,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id: string;
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
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <Label htmlFor={id} className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative">
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
    </div>
  );
}

function initials(name: string | undefined | null) {
  if (!name) return null;
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function DriverDashboard() {
  const router = useRouter();
  const { data: session, isPending } = useDriverSession();
  const userInitials = initials(session?.user?.name);

  // Auth guard: redirect to login if no driver session
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login?as=driver");
    }
  }, [isPending, session, router]);

  const [driverStatus, setDriverStatus] = useState<DriverStatus>("offline");
  const [routeStart, setRouteStart] = useState("");
  const [routeEnd, setRouteEnd] = useState("");
  const [routeSaved, setRouteSaved] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTrip, setActiveTrip] = useState<DriverTrip | null>(null);
  const [historyTrips, setHistoryTrips] = useState<HistoryTrip[]>([]);
  const [serviceScore, setServiceScore] = useState<number | null>(null);
  const [tripsCompleted, setTripsCompleted] = useState<number | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/trips/history", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { trips?: HistoryTrip[] };
      setHistoryTrips(data.trips ?? []);
    } catch {
      setHistoryTrips([]);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/driver/me", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        user?: { serviceScore?: number; tripsCompleted?: number };
      };
      if (data.user) {
        setServiceScore(data.user.serviceScore ?? 0);
        setTripsCompleted(data.user.tripsCompleted ?? 0);
      }
    } catch { /* silent */ }
  };

  const loadDriverState = async () => {
    try {
      const [routeRes, availabilityRes, activeTripRes] = await Promise.all([
        fetch("/api/driver/route", { credentials: "include" }),
        fetch("/api/driver/availability", { credentials: "include" }),
        fetch("/api/trips/active", { credentials: "include" }),
      ]);

      const routeData = (await routeRes.json().catch(() => ({}))) as {
        route?: { routeStart?: string | null; routeEnd?: string | null };
      };
      const availabilityData = (await availabilityRes.json().catch(() => ({}))) as {
        availability?: { isOnline?: boolean };
      };
      const activeTripData = (await activeTripRes.json().catch(() => ({}))) as {
        trip?: DriverTrip | null;
      };

      const savedStart = routeData.route?.routeStart ?? "";
      const savedEnd = routeData.route?.routeEnd ?? "";
      setRouteStart(savedStart);
      setRouteEnd(savedEnd);
      setRouteSaved(Boolean(savedStart && savedEnd));

      const trip = activeTripData.trip ?? null;
      setActiveTrip(trip);

      if (trip?.status === "matched") {
        setDriverStatus("incoming");
      } else if (availabilityData.availability?.isOnline) {
        setDriverStatus("online");
      } else {
        setDriverStatus("offline");
      }
    } catch {
      // ignore transient fetch issues
    }
  };

  useEffect(() => {
    void loadDriverState();
    void fetchHistory();
    void fetchProfile();
  }, []);

  useEffect(() => {
    if (driverStatus === "offline") return;
    const timer = window.setInterval(() => {
      void loadDriverState();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [driverStatus]);

  const handleSaveRoute = async () => {
    if (!routeStart.trim() || !routeEnd.trim()) {
      toast.error("Please fill in both start and end points.");
      return;
    }
    if (routeStart.trim() === routeEnd.trim()) {
      toast.error("Start and end points cannot be the same.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/driver/route", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ routeStart: routeStart.trim(), routeEnd: routeEnd.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not save route.");
        return;
      }
      setRouteSaved(true);
      toast.success("Route saved!", { description: `${routeStart} → ${routeEnd}` });
    } finally {
      setBusy(false);
    }
  };

  const toggleOnline = async () => {
    if (!routeSaved) {
      toast.warning("Set your route first before going online.");
      return;
    }

    const nextOnline = driverStatus === "offline";
    setBusy(true);
    try {
      const res = await fetch("/api/driver/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isOnline: nextOnline }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not update status.");
        return;
      }

      if (nextOnline) {
        setDriverStatus("online");
        toast("You're now online", { description: "Scanning for passengers on your route…" });
      } else {
        setDriverStatus("offline");
        toast("You're now offline");
      }
      await loadDriverState();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!activeTrip) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rides/${activeTrip.id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not decline ride.");
        return;
      }
      toast("Ride declined");
      await loadDriverState();
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!activeTrip) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rides/${activeTrip.id}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not accept ride.");
        return;
      }
      toast.success("Ride accepted");
      router.push(`/trip/${activeTrip.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
        <BrandHomeLink variant="nav" />
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

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} role="driver" />

      {/* Map — inset to match card width */}
      <div className="px-5 pt-5">
        <AppMap
          heightClass="h-72"
          zoom={12}
          className="rounded-xl overflow-hidden border border-border"
          markers={
            routeSaved
              ? [
                  { id: "start", lngLat: [38.7685, 9.0161], color: "#ffffff" },
                  { id: "end",   lngLat: [38.7869, 9.0372], color: "#888888" },
                ]
              : []
          }
        />
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
              disabled={busy}
              aria-label={driverStatus !== "offline" ? "Go offline" : "Go online"}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                driverStatus !== "offline" ? "bg-foreground" : "bg-secondary border border-border"
              } cursor-pointer`}
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
        {driverStatus === "incoming" && activeTrip && (
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
                <p className="font-semibold text-sm text-foreground">Passenger {activeTrip.passengerId.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">Matched request</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-5 text-xs bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="w-3 h-3" />
                <span>{activeTrip.pickup}</span>
              </div>
              <div className="pl-[5px] ml-[3px] border-l border-dashed border-border h-3" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Navigation className="w-3 h-3" />
                <span>{activeTrip.destination}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-border"
                onClick={handleReject}
                disabled={busy}
              >
                <X className="w-4 h-4" />
                Decline
              </Button>
              <div className="flex-1">
                <Button className="w-full gap-1.5" onClick={handleAccept} disabled={busy}>
                  <Check className="w-4 h-4" />
                  Accept
                </Button>
              </div>
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
            <LocationInput
              id="route-start"
              label="Start Point"
              icon={MapPin}
              value={routeStart}
              onChange={(v) => { setRouteStart(v); setRouteSaved(false); }}
              placeholder="Your starting location"
            />
            <LocationInput
              id="route-end"
              label="End Point"
              icon={Navigation}
              value={routeEnd}
              onChange={(v) => { setRouteEnd(v); setRouteSaved(false); }}
              placeholder="Your destination"
            />
          </div>

          <Button
            variant={routeSaved ? "outline" : "default"}
            className="w-full"
            onClick={handleSaveRoute}
            disabled={!routeStart.trim() || !routeEnd.trim() || busy}
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

          {serviceScore === null ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 w-24 bg-secondary rounded" />
              <div className="h-1.5 bg-secondary rounded" />
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-bold tracking-tighter text-foreground">{serviceScore}</span>
                <span className="text-sm text-muted-foreground mb-1">/ 1000 pts</span>
              </div>

              <Progress value={Math.min(100, (serviceScore / 1000) * 100)} className="h-1.5 bg-secondary mb-3" />

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: "Trips Completed", value: String(tripsCompleted ?? 0) },
                  { label: "Score", value: `${serviceScore} pts` },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-2 rounded-md bg-secondary">
                    <p className="font-bold text-sm text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>


        {/* Trip history */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Recent Trips</p>
          </div>

          <div className="flex flex-col gap-2">
            {historyTrips.length === 0 && (
              <div className="text-xs text-muted-foreground border border-border bg-card rounded-lg p-3">
                No completed or cancelled trips yet.
              </div>
            )}
            {historyTrips.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {t.pickup} → {t.destination}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {t.endedAt ? new Date(t.endedAt).toLocaleDateString() : "-"}
                  </p>
                  <div className="flex items-center justify-end gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${
                          s <= (t.status === "completed" ? 4 : 2) ? "text-foreground fill-foreground" : "text-muted-foreground"
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

      <BottomNav role="driver" />
    </main>
  );
}
