"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Activity,
  AlertTriangle,
  Bell,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  FileUp,
  MapPin,
  Menu,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

/* ─── Data ─────────────────────────────────────────────── */
const ACTIVE_TRIPS = [
  { id: "TRP-8821", passenger: "Meron Tadesse", driver: "Dawit Alemu", from: "Bole Medhanialem", to: "Meskel Square", progress: 38, duration: "4 min", status: "active" },
  { id: "TRP-8819", passenger: "Abel Kebede", driver: "Yonas Tadesse", from: "CMC", to: "Stadium", progress: 72, duration: "11 min", status: "active" },
  { id: "TRP-8815", passenger: "Sara Mekonnen", driver: "Liya Bekele", from: "Piazza", to: "Kazanchis", progress: 95, duration: "18 min", status: "completing" },
];

const ALERTS = [
  { id: "a1", trip: "TRP-8800", user: "Anonymous Passenger", location: "Bole Road, near Edna Mall", coords: "9.0192° N, 38.7525° E", time: "2 min ago", severity: "high", resolved: false },
  { id: "a2", trip: "TRP-8790", user: "Abel Kebede", location: "Ring Road, Semit area", coords: "9.0321° N, 38.7612° E", time: "1 hr ago", severity: "medium", resolved: true },
  { id: "a3", trip: "TRP-8761", user: "Hana Girma", location: "Gerji, near Friendship Park", coords: "9.0254° N, 38.8011° E", time: "3 hr ago", severity: "low", resolved: true },
];

const USERS = [
  { id: "u1", name: "Dawit Alemu",   initials: "DA", role: "Driver",    trips: 47, score: 840, status: "online",  joined: "Jan 2026" },
  { id: "u2", name: "Yonas Tadesse", initials: "YT", role: "Driver",    trips: 31, score: 680, status: "online",  joined: "Feb 2026" },
  { id: "u3", name: "Meron Tadesse", initials: "MT", role: "Passenger", trips: 12, score: null, status: "riding", joined: "Mar 2026" },
  { id: "u4", name: "Sara Mekonnen", initials: "SM", role: "Driver",    trips: 58, score: 920, status: "riding",  joined: "Dec 2025" },
  { id: "u5", name: "Abel Kebede",   initials: "AK", role: "Passenger", trips: 8,  score: null, status: "riding", joined: "Mar 2026" },
  { id: "u6", name: "Liya Bekele",   initials: "LB", role: "Driver",    trips: 22, score: 510, status: "offline", joined: "Feb 2026" },
  { id: "u7", name: "Hana Girma",    initials: "HG", role: "Passenger", trips: 19, score: null, status: "offline", joined: "Jan 2026" },
];

const ACTIVITY = [
  { icon: <Car className="w-3 h-3" />,          text: "TRP-8821 started", sub: "Bole → Meskel Sq",    time: "1 min ago" },
  { icon: <AlertTriangle className="w-3 h-3" />, text: "Alert on TRP-8800", sub: "Bole Road",           time: "2 min ago" },
  { icon: <CheckCircle className="w-3 h-3" />,  text: "TRP-8809 completed", sub: "CMC → Megenagna",    time: "6 min ago" },
  { icon: <User className="w-3 h-3" />,          text: "New driver joined", sub: "Tesfaye Hailu",       time: "12 min ago" },
  { icon: <Car className="w-3 h-3" />,          text: "TRP-8815 started", sub: "Piazza → Kazanchis",   time: "18 min ago" },
  { icon: <CheckCircle className="w-3 h-3" />,  text: "TRP-8801 completed", sub: "Gerji → Bole",       time: "22 min ago" },
];

type Section = "overview" | "trips" | "users" | "alerts" | "csv";

const NAV = [
  { id: "overview" as Section, label: "Overview",     icon: <Activity className="w-4 h-4" /> },
  { id: "trips"    as Section, label: "Live Trips",   icon: <Car className="w-4 h-4" /> },
  { id: "users"    as Section, label: "Users",        icon: <Users className="w-4 h-4" /> },
  { id: "alerts"   as Section, label: "Alerts",       icon: <AlertTriangle className="w-4 h-4" />, badge: true },
  { id: "csv"      as Section, label: "CSV Import",   icon: <FileUp className="w-4 h-4" /> },
];

/* ─── Sub-components ────────────────────────────────────── */

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "online" || status === "riding"
      ? "bg-foreground animate-pulse"
      : "bg-border";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />;
}

function SidebarContent({
  active,
  setActive,
  alertCount,
}: {
  active: Section;
  setActive: (s: Section) => void;
  alertCount: number;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border flex items-center gap-2.5">
        <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center flex-shrink-0">
          <Car className="w-3.5 h-3.5 text-background" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            ECRP
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">Navigation</p>
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all text-left ${
              active === item.id
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && alertCount > 0 && (
              <span className={`ml-auto text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${active === item.id ? "bg-background text-foreground" : "bg-foreground text-background"}`}>
                {alertCount}
              </span>
            )}
            {active === item.id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-secondary">
          <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
            <Shield className="w-3 h-3 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Super Admin</p>
            <p className="text-[10px] text-muted-foreground truncate">admin@ecrp.eth</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section views ─────────────────────────────────────── */

function OverviewSection({ alerts, onResolve }: { alerts: typeof ALERTS; onResolve: (id: string) => void }) {
  const openAlerts = alerts.filter((a) => !a.resolved);
  const stats = [
    { label: "Active Trips",   value: "3",  delta: "+1",  up: true,  icon: <Car className="w-4 h-4" /> },
    { label: "Online Users",   value: "12", delta: "+3",  up: true,  icon: <Users className="w-4 h-4" /> },
    { label: "Today's Trips",  value: "28", delta: "+6",  up: true,  icon: <Activity className="w-4 h-4" /> },
    { label: "Open Alerts",    value: String(openAlerts.length), delta: openAlerts.length > 0 ? "urgent" : "0", up: false, icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Emergency banner */}
      {openAlerts.length > 0 && (
        <div className="rounded-lg border border-foreground/20 bg-secondary p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-background" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground mb-0.5">
              {openAlerts.length} unresolved emergency alert{openAlerts.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">{openAlerts[0].location} · {openAlerts[0].time}</p>
          </div>
          <Button size="sm" className="h-7 text-xs gap-1.5 flex-shrink-0" onClick={() => onResolve(openAlerts[0].id)}>
            <CheckCircle className="w-3 h-3" />
            Resolve
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">{s.icon}</span>
              <span className={`text-[10px] flex items-center gap-0.5 font-medium ${s.up ? "text-foreground" : "text-muted-foreground"}`}>
                {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.delta}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Body: trips + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live trips mini-table */}
        <div className="lg:col-span-2 border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Live Trips</p>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              {ACTIVE_TRIPS.length} active
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Route</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden md:table-cell">Driver</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Progress</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVE_TRIPS.map((t, i) => (
                <tr key={t.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-secondary/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{t.id}</td>
                  <td className="px-4 py-3 text-foreground hidden sm:table-cell">{t.from} → {t.to}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.driver}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={t.progress} className="w-16 h-1 bg-secondary" />
                      <span className="text-muted-foreground tabular-nums">{t.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                      t.status === "completing"
                        ? "border-foreground/40 text-foreground bg-foreground/10"
                        : "border-border text-muted-foreground"
                    }`}>
                      {t.status === "active" && <span className="w-1 h-1 rounded-full bg-foreground animate-pulse" />}
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activity feed */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Activity Feed</p>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-tight">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TripsSection() {
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Live Trips</p>
          <p className="text-xs text-muted-foreground mt-0.5">{ACTIVE_TRIPS.length} trips currently in progress</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
          Live
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Trip ID</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Passenger</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Driver</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Route</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Progress</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Duration</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ACTIVE_TRIPS.map((t, i) => (
              <tr key={t.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{t.id}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-foreground flex-shrink-0">
                      {t.passenger.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span className="text-sm text-foreground whitespace-nowrap">{t.passenger}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-[9px] font-bold text-background flex-shrink-0">
                      {t.driver.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span className="text-sm text-foreground whitespace-nowrap">{t.driver}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{t.from} → {t.to}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Progress value={t.progress} className="w-20 h-1.5 bg-secondary" />
                    <span className="text-xs text-muted-foreground tabular-nums">{t.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border ${
                    t.status === "completing"
                      ? "bg-foreground/10 border-foreground/30 text-foreground"
                      : "bg-secondary border-border text-muted-foreground"
                  }`}>
                    {t.status === "active" && <span className="w-1 h-1 rounded-full bg-foreground animate-pulse" />}
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersSection() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | "Driver" | "Passenger">("All");

  const filtered = USERS.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Users</p>
          <p className="text-xs text-muted-foreground mt-0.5">{USERS.length} total members</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-44 bg-secondary border-border"
            />
          </div>
          <div className="flex border border-border rounded-md overflow-hidden">
            {(["All", "Driver", "Passenger"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs transition-colors ${roleFilter === r ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">User</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Role</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Trips</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Score</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${u.role === "Driver" ? "bg-foreground text-background" : "bg-secondary border border-border text-foreground"}`}>
                      {u.initials}
                    </div>
                    <span className="font-medium text-foreground text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${u.role === "Driver" ? "bg-foreground/10 border-foreground/20 text-foreground" : "bg-secondary border-border text-muted-foreground"}`}>
                    {u.role === "Driver" ? <Car className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-foreground tabular-nums">{u.trips}</td>
                <td className="px-5 py-3.5">
                  {u.score ? (
                    <div className="flex items-center gap-2">
                      <Progress value={(u.score / 1000) * 100} className="w-14 h-1 bg-secondary" />
                      <span className="text-xs text-foreground tabular-nums">{u.score}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StatusDot status={u.status} />
                    <span className="capitalize">{u.status}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground">{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No users match your filters.</div>
        )}
      </div>
    </div>
  );
}

function AlertsSection({ alerts, onResolve }: { alerts: typeof ALERTS; onResolve: (id: string) => void }) {
  const open = alerts.filter((a) => !a.resolved);
  const closed = alerts.filter((a) => a.resolved);

  return (
    <div className="flex flex-col gap-4">
      {open.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Open Alerts — {open.length}
          </p>
          <div className="flex flex-col gap-3">
            {open.map((a) => (
              <div key={a.id} className="border-2 border-foreground/20 rounded-lg bg-card overflow-hidden">
                <div className="px-5 py-1.5 bg-foreground/5 border-b border-foreground/10 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                    {a.severity === "high" ? "High Priority" : a.severity === "medium" ? "Medium Priority" : "Low Priority"}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{a.time}</span>
                </div>
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-foreground">{a.user}</p>
                      <span className="text-xs font-mono text-muted-foreground">#{a.trip}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{a.location}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{a.coords}</p>
                  </div>
                  <Button size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0" onClick={() => onResolve(a.id)}>
                    <CheckCircle className="w-3 h-3" />
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Resolved — {closed.length}
          </p>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Trip</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">User</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Location</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Time</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 opacity-60">
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">#{a.trip}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{a.user}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">{a.location}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{a.time}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3" />Resolved
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg bg-card">
          <CheckCircle className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground mt-1">No open emergency alerts.</p>
        </div>
      )}
    </div>
  );
}

function CsvSection() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [csvProcessed, setCsvProcessed] = useState(false);

  const handleProcessCsv = () => {
    if (!csvFile) return;
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setCsvProcessed(true); }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Upload */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Upload Penalty Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">CSV from Traffic Authorities</p>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-foreground/30 hover:bg-secondary/30 transition-all"
            onClick={() => document.getElementById("csv-input")?.click()}
          >
            <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
            {csvFile ? (
              <div>
                <p className="text-sm font-medium text-foreground">{csvFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(csvFile.size / 1024).toFixed(1)} KB · Ready to process</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Drop CSV file here</p>
                <p className="text-xs text-muted-foreground">or click to browse · .csv files only</p>
              </div>
            )}
            <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => { setCsvFile(e.target.files?.[0] ?? null); setCsvProcessed(false); }} />
          </div>

          {csvProcessed ? (
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-secondary border border-border">
              <CheckCircle className="w-4 h-4 text-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Processed successfully</p>
                <p className="text-xs text-muted-foreground mt-0.5">3 driver scores adjusted</p>
              </div>
            </div>
          ) : (
            <Button className="w-full gap-2 h-10" onClick={handleProcessCsv} disabled={!csvFile || processing}>
              {processing ? (
                <><Zap className="w-3.5 h-3.5 animate-pulse" />Processing…</>
              ) : (
                <><FileUp className="w-3.5 h-3.5" />Process & Apply Penalties</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Format reference */}
      <div className="flex flex-col gap-4">
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Expected Format</p>
            <p className="text-xs text-muted-foreground mt-0.5">Required CSV column structure</p>
          </div>
          <div className="p-5">
            <div className="bg-secondary rounded-md p-4 font-mono text-xs text-muted-foreground leading-relaxed">
              <p className="text-foreground">plate_number,violation_type,penalty_points,date</p>
              <p>AA 3-45678,Speed Violation,-20,2026-04-10</p>
              <p>AA 1-12345,Red Light,-15,2026-04-09</p>
              <p>AA 7-98765,No Seatbelt,-5,2026-04-08</p>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-3">Processing Rules</p>
          <div className="flex flex-col gap-2.5">
            {[
              "Plate numbers are matched against registered drivers",
              "Penalty points are subtracted from the driver's Service Score",
              "Unmatched plate numbers are flagged in a report",
              "All imports are logged with timestamp and admin ID",
            ].map((rule) => (
              <div key={rule} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <ChevronRight className="w-3 h-3 text-foreground flex-shrink-0 mt-0.5" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page shell ────────────────────────────────────────── */

const SECTION_TITLES: Record<Section, { title: string; sub: string }> = {
  overview: { title: "Overview",   sub: "Platform health at a glance" },
  trips:    { title: "Live Trips", sub: "All rides currently in progress" },
  users:    { title: "Users",      sub: "Registered passengers and drivers" },
  alerts:   { title: "Alerts",     sub: "Emergency incidents and resolutions" },
  csv:      { title: "CSV Import", sub: "Traffic authority penalty ingestion" },
};

export default function AdminDashboard() {
  const [active, setActive] = useState<Section>("overview");
  const [alerts, setAlerts] = useState(ALERTS);

  const openAlertCount = alerts.filter((a) => !a.resolved).length;

  const resolveAlert = (id: string) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));

  const { title, sub } = SECTION_TITLES[active];

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent active={active} setActive={setActive} alertCount={openAlertCount} />
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border px-5 py-3.5 flex items-center gap-4">
          {/* Mobile sidebar trigger */}
          <Sheet>
            <SheetTrigger className="md:hidden w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground">
              <Menu className="w-4 h-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 bg-card border-border">
              <SidebarContent active={active} setActive={setActive} alertCount={openAlertCount} />
            </SheetContent>
          </Sheet>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            {/* Bell */}
            <button className="relative w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-3.5 h-3.5" />
              {openAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-foreground rounded-full flex items-center justify-center text-background text-[9px] font-bold">
                  {openAlertCount}
                </span>
              )}
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-background" />
            </div>
          </div>
        </header>

        {/* Page header */}
        <div className="px-6 py-5 border-b border-border">
          <h1
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>

        {/* Content */}
        <main className="flex-1 px-6 py-6">
          {active === "overview" && <OverviewSection alerts={alerts} onResolve={resolveAlert} />}
          {active === "trips"    && <TripsSection />}
          {active === "users"    && <UsersSection />}
          {active === "alerts"   && <AlertsSection alerts={alerts} onResolve={resolveAlert} />}
          {active === "csv"      && <CsvSection />}
        </main>
      </div>
    </div>
  );
}
