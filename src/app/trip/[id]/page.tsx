"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, MapPin, Navigation, X } from "lucide-react";
import AppMap from "@/components/app-map";
import BottomNav from "@/components/bottom-nav";
import { useDriverSession, usePassengerSession } from "@/lib/auth-client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getPusherClient } from "@/lib/pusher-client";

type TripData = {
  id: string;
  pickup: string;
  destination: string;
  status: string;
  passengerId: string;
  matchedDriverId: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
};

export default function ActiveTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: driverSession } = useDriverSession();
  const { data: passengerSession } = usePassengerSession();

  // Prefer the explicit ?as= param so a user with both sessions stored in the
  // browser (common during testing) still lands on the correct dashboard.
  const asParam = searchParams.get("as");
  const actor: "driver" | "passenger" | null =
    asParam === "driver" || asParam === "passenger"
      ? asParam
      : driverSession
      ? "driver"
      : passengerSession
      ? "passenger"
      : null;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicSent, setPanicSent] = useState(false);
  const [ending, setEnding] = useState(false);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/trips/active", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { trip?: TripData | null }) => {
        setTrip(data.trip ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Passenger: subscribe to Pusher channel for live driver location
  useEffect(() => {
    if (actor !== "passenger") return;
    let channel: ReturnType<typeof getPusherClient>["subscribe"] extends (...a: never[]) => infer R ? R : never;
    try {
      const pusher = getPusherClient();
      channel = pusher.subscribe(`private-trip.${id}`);
      channel.bind("location_update", (data: { lat: number; lng: number }) => {
        setDriverLocation([data.lng, data.lat]);
      });
    } catch (err) {
      console.error("[pusher] subscription failed", err);
    }
    return () => {
      try { getPusherClient().unsubscribe(`private-trip.${id}`); } catch { /* ignore */ }
    };
  }, [id, actor]);

  // Driver: POST GPS location every 6 seconds while trip is in_progress
  useEffect(() => {
    if (actor !== "driver") return;
    if (!trip || trip.status !== "in_progress") return;
    if (!navigator?.geolocation) return;

    const postLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setDriverLocation([lng, lat]);
          await fetch(`/api/trips/${id}/location`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 8_000 },
      );
    };

    postLocation();
    locationIntervalRef.current = setInterval(postLocation, 6_000);
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [id, actor, trip]);

  const handleClose = () => {
    router.push(actor === "driver" ? "/driver" : "/passenger");
  };

  const handlePanic = async () => {
    try {
      await fetch(`/api/trips/${id}/panic`, { method: "POST", credentials: "include" });
    } catch { /* best-effort */ }
    setPanicSent(true);
    setTimeout(() => { setPanicOpen(false); setPanicSent(false); }, 3000);
  };

  const handleFinishTrip = async () => {
    setEnding(true);
    try {
      const res = await fetch(`/api/trips/${id}/complete`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Could not finish trip.");
        return;
      }
      toast.success("Trip completed! Score awarded.");
      router.push("/driver");
    } finally {
      setEnding(false);
    }
  };

  const handleCancelTrip = async () => {
    setEnding(true);
    try {
      const res = await fetch(`/api/trips/${id}/cancel`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Could not cancel trip.");
        return;
      }
      toast("Trip cancelled.");
      router.push(actor === "driver" ? "/driver" : "/passenger");
    } finally {
      setEnding(false);
    }
  };

  const shortId = id.slice(0, 8).toUpperCase();

  return (
    /* Full-screen canvas — map fills everything, UI floats on top */
    <div className="fixed inset-0 z-50 flex flex-col max-w-md mx-auto bg-background">

      {/* ── Top bar ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-4 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">Live Trip</span>
          {!loading && trip && (
            <Badge variant="outline" className="text-xs border-border text-muted-foreground font-normal">
              #{shortId}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!loading && trip && (
            <span className="flex items-center gap-1.5 text-xs text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              {trip.status === "in_progress"
                ? "In Progress"
                : trip.status === "accepted"
                ? "Confirmed"
                : trip.status}
            </span>
          )}
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

      {/* ── Map tile ── */}
      <div className="flex-shrink-0 px-5 pt-4">
        <AppMap
          heightClass="h-64"
          zoom={13}
          className="rounded-xl overflow-hidden border border-border"
          markers={driverLocation ? [{ id: "driver", lngLat: driverLocation, color: "#000000" }] : []}
        />
      </div>

      {/* ── Info panel ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {loading && (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-4 bg-secondary rounded w-2/3" />
            <div className="h-4 bg-secondary rounded w-1/2" />
          </div>
        )}

        {!loading && !trip && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">No active trip found.</p>
            <Button variant="outline" size="sm" onClick={handleClose}>Go Back</Button>
          </div>
        )}

        {!loading && trip && (
          <>
            {/* Route card */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Route</p>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <div className="w-2 h-2 rounded-full bg-foreground flex-shrink-0" />
                  <div className="w-px h-6 border-l border-dashed border-border" />
                  <div className="w-2 h-2 rounded-full border border-foreground flex-shrink-0" />
                </div>
                <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                  <div>
                    <p className="text-xs font-medium text-foreground truncate">{trip.pickup}</p>
                    <p className="text-[10px] text-muted-foreground">Pickup</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground truncate">{trip.destination}</p>
                    <p className="text-[10px] text-muted-foreground">Destination</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="bg-secondary rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">You are the</span>
              <Badge variant="outline" className="text-xs capitalize border-border">
                {actor ?? "—"}
              </Badge>
            </div>

            {/* Panic */}
            <Button
              variant="outline"
              className="w-full h-12 border-2 border-foreground/25 hover:border-foreground hover:bg-secondary gap-2 font-semibold text-sm transition-all"
              onClick={() => setPanicOpen(true)}
            >
              <AlertTriangle className="w-4 h-4" />
              Emergency Panic Button
            </Button>

            {/* Trip actions */}
            {actor === "driver" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-border text-muted-foreground text-sm"
                  onClick={handleCancelTrip}
                  disabled={ending}
                >
                  Cancel Trip
                </Button>
                <Button
                  className="bg-foreground text-background text-sm font-semibold"
                  onClick={handleFinishTrip}
                  disabled={ending}
                >
                  {ending ? "Finishing…" : "Finish Trip"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground text-sm"
                onClick={handleCancelTrip}
                disabled={ending}
              >
                Cancel Trip
              </Button>
            )}
          </>
        )}
      </div>

      {actor && <BottomNav role={actor} />}

      {/* ── Panic modal ── */}
      <Dialog open={panicOpen} onOpenChange={setPanicOpen}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto z-[60]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5" />
              Emergency Alert
            </DialogTitle>
          </DialogHeader>

          {!panicSent ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This will immediately send your GPS coordinates and trip details to the admin dashboard.
              </p>
              {trip && (
                <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Trip #{shortId}</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{trip.pickup}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Navigation className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{trip.destination}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setPanicOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-foreground text-background" onClick={handlePanic}>
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
    </div>
  );
}
