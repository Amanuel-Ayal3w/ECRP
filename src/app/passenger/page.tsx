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
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type RideStatus = "idle" | "searching" | "matched";

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

const PAST_RIDES = [
  { id: "r1", from: "Bole Medhanialem", to: "Meskel Square", date: "Apr 10", driver: "Dawit A.", score: 4 },
  { id: "r2", from: "CMC", to: "Piazza", date: "Apr 8", driver: "Yonas T.", score: 5 },
  { id: "r3", from: "Kazanchis", to: "Megenagna", date: "Apr 5", driver: "Sara M.", score: 5 },
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

export default function PassengerDashboard() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState<RideStatus>("idle");

  const handleSearch = () => {
    if (!pickup.trim() || !destination.trim()) {
      toast.error("Please fill in both pickup and destination.");
      return;
    }
    if (pickup.trim() === destination.trim()) {
      toast.error("Pickup and destination cannot be the same.");
      return;
    }
    setStatus("searching");
    toast("Searching for drivers…", { description: `${pickup} → ${destination}` });
    setTimeout(() => {
      setStatus("matched");
      toast.success("Driver found!", { description: "Dawit Alemu is 4 min away." });
    }, 2500);
  };

  const handleCancel = () => {
    setStatus("idle");
    setPickup("");
    setDestination("");
    toast("Ride request cancelled.");
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
          <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

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
              disabled={!pickup.trim() || !destination.trim()}
            >
              <Search className="w-4 h-4" />
              Find a Driver
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
              Matching with nearby drivers…
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
                <p className="text-xs text-muted-foreground">Toyota Corolla · AA 3-45678</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= 4 ? "text-foreground fill-foreground" : "text-muted-foreground"}`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">4.8</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="font-bold text-foreground">4 min</p>
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

            <Link href="/trip/demo-trip-id">
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
            {PAST_RIDES.map((ride) => (
              <div
                key={ride.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {ride.from} → {ride.to}
                  </p>
                  <p className="text-xs text-muted-foreground">{ride.driver}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ride.date}
                  </p>
                  <div className="flex items-center justify-end gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${
                          s <= ride.score ? "text-foreground fill-foreground" : "text-muted-foreground"
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
