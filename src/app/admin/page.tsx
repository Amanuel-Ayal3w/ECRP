"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminAuthClient, useAdminSession } from "@/lib/auth-client";
import { isSuperAdmin } from "@/lib/admin-role";
import {
  Activity,
  AlertTriangle,
  Bell,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  FileUp,
  LogOut,
  MapPin,
  Menu,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Section = "overview" | "trips" | "users" | "admins" | "alerts" | "csv";

type AdminStat = {
  label: string;
  value: number;
  delta: string;
  up: boolean;
};

type ActiveTripRow = {
  id: string;
  passenger: string;
  driver: string;
  vehicle: string;
  from: string;
  to: string;
  progress: number;
  duration: string;
  status: "active" | "completing";
};

type ActivityRow = {
  id: string;
  icon: "trip" | "alert";
  text: string;
  sub: string;
  time: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "Driver" | "Passenger";
  trips: number;
  score: number | null;
  status: "online" | "riding" | "offline";
  joined: string;
};

type AlertRow = {
  id: string;
  trip: string;
  user: string;
  location: string;
  coords: string;
  time: string;
  severity: "high" | "medium" | "low" | string;
  resolved: boolean;
};

type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string | Date;
};

type PenaltyJob = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  processedRows: number;
  affectedDrivers: number;
  errorMessage: string | null;
  createdAt: string | Date;
};

const NAV: Array<{ id: Section; label: string; icon: React.ReactNode; badge?: boolean }> = [
  { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
  { id: "trips", label: "Live Trips", icon: <Car className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { id: "admins", label: "Admin Team", icon: <UserCog className="w-4 h-4" /> },
  { id: "alerts", label: "Alerts", icon: <AlertTriangle className="w-4 h-4" />, badge: true },
  { id: "csv", label: "CSV Import", icon: <FileUp className="w-4 h-4" /> },
];

const SECTION_TITLES: Record<Section, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Live operations snapshot" },
  trips: { title: "Live Trips", sub: "Active ride monitoring" },
  users: { title: "Users", sub: "Drivers and passengers" },
  admins: { title: "Admin Team", sub: "Console access management" },
  alerts: { title: "Alerts", sub: "Emergency incidents and response" },
  csv: { title: "CSV Import", sub: "Penalty ingestion and processing jobs" },
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

function statIcon(label: string) {
  if (label.toLowerCase().includes("trip")) return <Car className="w-4 h-4" />;
  if (label.toLowerCase().includes("alert")) return <AlertTriangle className="w-4 h-4" />;
  if (label.toLowerCase().includes("online")) return <Users className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
}

function StatusDot({ status }: { status: string }) {
  const cls = status === "online" || status === "riding" ? "bg-foreground animate-pulse" : "bg-border";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
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
  const router = useRouter();
  const { data: session, isPending } = useAdminSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const role = (session?.user as { role?: string | null } | undefined)?.role;
  const roleLabel = role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminAuthClient.signOut();
      router.push("/admin/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Link
        href="/"
        className="px-5 py-5 border-b border-border flex items-center gap-2.5 hover:bg-secondary/40 transition-colors"
      >
        <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center flex-shrink-0">
          <Car className="w-3.5 h-3.5 text-background" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            ECRP
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Admin Console</p>
        </div>
      </Link>

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
              <span
                className={`ml-auto text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                  active === item.id ? "bg-background text-foreground" : "bg-foreground text-background"
                }`}
              >
                {alertCount}
              </span>
            )}
            {active === item.id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-secondary">
          <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
            <Shield className="w-3 h-3 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{isPending ? "…" : session?.user?.name ?? "Administrator"}</p>
            {roleLabel && <p className="text-[9px] text-foreground/80 font-medium uppercase tracking-wider mt-0.5">{roleLabel}</p>}
            <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email ?? "—"}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full h-9 justify-center gap-2 text-xs font-medium border-border"
          disabled={loggingOut || isPending}
          onClick={handleLogout}
        >
          <LogOut className="w-3.5 h-3.5" />
          {loggingOut ? "Signing out…" : "Log out"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [active, setActive] = useState<Section>("overview");

  const [overviewStats, setOverviewStats] = useState<AdminStat[]>([]);
  const [overviewActivity, setOverviewActivity] = useState<ActivityRow[]>([]);
  const [trips, setTrips] = useState<ActiveTripRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [jobs, setJobs] = useState<PenaltyJob[]>([]);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | "Driver" | "Passenger">("All");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [processingCsv, setProcessingCsv] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const { data: session } = useAdminSession();
  const isCurrentUserSuperAdmin = isSuperAdmin((session?.user as { role?: string } | undefined)?.role);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await requestJson<{ stats: AdminStat[]; activity: ActivityRow[] }>("/api/admin/overview");
      setOverviewStats(data.stats ?? []);
      setOverviewActivity(data.activity ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load overview.");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const data = await requestJson<{ trips: ActiveTripRow[] }>("/api/admin/active-trips");
      setTrips(data.trips ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load live trips.");
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await requestJson<{ users: UserRow[] }>("/api/admin/active-users");
      setUsers(data.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const data = await requestJson<{ alerts: AlertRow[] }>("/api/admin/alerts");
      setAlerts(data.alerts ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load alerts.");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const data = await requestJson<{ admins: AdminRow[] }>("/api/admin/admins");
      setAdmins(data.admins ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load admin team.");
    } finally {
      setAdminsLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const data = await requestJson<{ jobs: PenaltyJob[] }>("/api/admin/penalties/jobs");
      setJobs(data.jobs ?? []);
      if (!selectedJobId && data.jobs?.length) {
        setSelectedJobId(data.jobs[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load penalty jobs.");
    } finally {
      setJobsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    void Promise.all([loadOverview(), loadTrips(), loadUsers(), loadAlerts(), loadAdmins(), loadJobs()]);
  }, [loadOverview, loadTrips, loadUsers, loadAlerts, loadAdmins, loadJobs]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (active === "overview") {
        void Promise.all([loadOverview(), loadTrips(), loadAlerts()]);
      }
      if (active === "trips") void loadTrips();
      if (active === "users") void loadUsers();
      if (active === "alerts") void loadAlerts();
      if (active === "admins") void loadAdmins();
      if (active === "csv") void loadJobs();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [active, loadOverview, loadTrips, loadUsers, loadAlerts, loadAdmins, loadJobs]);

  const resolveAlert = async (id: string) => {
    try {
      await requestJson(`/api/admin/alerts/${id}/resolve`, { method: "POST" });
      toast.success("Alert marked as resolved.");
      await Promise.all([loadAlerts(), loadOverview()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve alert.");
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      toast.error("Fill in name, email and password.");
      return;
    }

    setCreatingAdmin(true);
    try {
      await requestJson("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAdminName.trim(),
          email: newAdminEmail.trim(),
          password: newAdminPassword,
        }),
      });
      toast.success("Admin account created.");
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      await loadAdmins();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create admin.");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const uploadCsv = async () => {
    if (!csvFile) {
      toast.error("Select a CSV file first.");
      return;
    }

    setUploadingCsv(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const data = await requestJson<{ job: PenaltyJob }>("/api/admin/penalties/upload-csv", {
        method: "POST",
        body: formData,
      });
      toast.success("CSV uploaded.");
      setSelectedJobId(data.job.id);
      setCsvFile(null);
      await loadJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV upload failed.");
    } finally {
      setUploadingCsv(false);
    }
  };

  const processCsv = async () => {
    if (!selectedJobId) {
      toast.error("Select a job to process.");
      return;
    }

    setProcessingCsv(true);
    try {
      const data = await requestJson<{ affectedDrivers: number; totalRows: number }>("/api/admin/penalties/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      });
      toast.success("CSV processing finished.", {
        description: `${data.affectedDrivers} drivers updated from ${data.totalRows} rows.`,
      });
      await Promise.all([loadJobs(), loadUsers()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV processing failed.");
    } finally {
      setProcessingCsv(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const openAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);
  const alertCount = openAlerts.length;
  const { title, sub } = SECTION_TITLES[active];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent active={active} setActive={setActive} alertCount={alertCount} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border px-5 py-3.5 flex items-center gap-4">
          <Sheet>
            <SheetTrigger className="md:hidden w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground">
              <Menu className="w-4 h-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 bg-card border-border">
              <SidebarContent active={active} setActive={setActive} alertCount={alertCount} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            <button className="relative w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground">
              <Bell className="w-3.5 h-3.5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-foreground rounded-full flex items-center justify-center text-background text-[9px] font-bold">
                  {alertCount}
                </span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-background" />
            </div>
          </div>
        </header>

        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>

        <main className="flex-1 px-6 py-6">
          {active === "overview" && (
            <div className="flex flex-col gap-5">
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
                  <Button size="sm" className="h-7 text-xs gap-1.5 flex-shrink-0" onClick={() => resolveAlert(openAlerts[0].id)}>
                    <CheckCircle className="w-3 h-3" />
                    Resolve
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(overviewLoading ? [] : overviewStats).map((s) => (
                  <Card key={s.label} className="bg-card border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-muted-foreground">{statIcon(s.label)}</span>
                      <span className={`text-[10px] flex items-center gap-0.5 font-medium ${s.up ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {s.delta}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </Card>
                ))}
                {overviewLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-card border-border p-4 animate-pulse h-[110px]" />
                  ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 border border-border rounded-lg bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Live Trips</p>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                      {trips.length} active
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">ID</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Route</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden md:table-cell">Driver</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.slice(0, 5).map((t, i) => (
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
                        </tr>
                      ))}
                      {!tripsLoading && trips.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No active trips.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Activity Feed</p>
                  </div>
                  <div className="flex flex-col divide-y divide-border">
                    {overviewActivity.map((a) => (
                      <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
                          {a.icon === "alert" ? <AlertTriangle className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground leading-tight">{a.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{a.time}</span>
                      </div>
                    ))}
                    {!overviewLoading && overviewActivity.length === 0 && (
                      <div className="px-4 py-6 text-xs text-muted-foreground">No recent activity.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === "trips" && (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Live Trips</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{trips.length} trips currently in progress</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t, i) => (
                      <tr key={t.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                        <td className="px-5 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{t.id}</td>
                        <td className="px-5 py-4 text-sm text-foreground whitespace-nowrap">{t.passenger}</td>
                        <td className="px-5 py-4 text-sm text-foreground whitespace-nowrap">{t.driver}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.from} → {t.to}</span>
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
                      </tr>
                    ))}
                    {!tripsLoading && trips.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No active trips.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === "users" && (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Users</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{users.length} total members</p>
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
                        className={`px-3 py-1.5 text-xs transition-colors ${
                          roleFilter === r ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-secondary"
                        }`}
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
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              u.role === "Driver" ? "bg-foreground text-background" : "bg-secondary border border-border text-foreground"
                            }`}>
                              {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${
                            u.role === "Driver" ? "bg-foreground/10 border-foreground/20 text-foreground" : "bg-secondary border-border text-muted-foreground"
                          }`}>
                            {u.role === "Driver" ? <Car className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground tabular-nums">{u.trips}</td>
                        <td className="px-5 py-3.5">
                          {typeof u.score === "number" ? (
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(100, Math.max(0, u.score / 10))} className="w-14 h-1 bg-secondary" />
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
                    {!usersLoading && filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No users match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === "admins" && (
            <div className="flex flex-col gap-5">
              {isCurrentUserSuperAdmin && (
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Add admin</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Create a new console operator account.</p>
                  </div>
                  <form onSubmit={createAdmin} className="p-5 max-w-md flex flex-col gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-name" className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
                      <Input id="admin-name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="h-10 bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                      <Input id="admin-email" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="h-10 bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-password" className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                      <Input id="admin-password" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className="h-10 bg-input border-border" />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto h-10" disabled={creatingAdmin}>
                      {creatingAdmin ? "Adding…" : "Add admin"}
                    </Button>
                  </form>
                </div>
              )}

              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Console Operators</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{admins.length} total</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Name</th>
                        <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Email</th>
                        <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Role</th>
                        <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((row, i) => (
                        <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                          <td className="px-5 py-3.5 font-medium text-foreground">{row.name}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">{row.email}</td>
                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                              {row.role === "super_admin" ? "Super Admin" : "Admin"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</td>
                        </tr>
                      ))}
                      {!adminsLoading && admins.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No admin users yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {active === "alerts" && (
            <div className="flex flex-col gap-4">
              {openAlerts.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-3">Open Alerts — {openAlerts.length}</p>
                  <div className="flex flex-col gap-3">
                    {openAlerts.map((a) => (
                      <div key={a.id} className="border-2 border-foreground/20 rounded-lg bg-card overflow-hidden">
                        <div className="px-5 py-1.5 bg-foreground/5 border-b border-foreground/10 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{a.severity} priority</span>
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
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location}</p>
                            <p className="text-xs text-muted-foreground font-mono">{a.coords}</p>
                          </div>
                          <Button size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0" onClick={() => resolveAlert(a.id)}>
                            <CheckCircle className="w-3 h-3" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resolvedAlerts.length > 0 && (
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
                      {resolvedAlerts.map((a) => (
                        <tr key={a.id} className="border-b border-border last:border-0 opacity-60">
                          <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">#{a.trip}</td>
                          <td className="px-5 py-3.5 text-sm text-foreground">{a.user}</td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">{a.location}</td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">{a.time}</td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">Resolved</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!alertsLoading && alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg bg-card">
                  <CheckCircle className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">All clear</p>
                  <p className="text-xs text-muted-foreground mt-1">No emergency alerts found.</p>
                </div>
              )}
            </div>
          )}

          {active === "csv" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Upload Penalty CSV</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload authority file and process deductions.</p>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
                    {csvFile ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{csvFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(csvFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Choose CSV file (.csv)</p>
                    )}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="mt-4 text-xs"
                      onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <Button className="w-full gap-2" onClick={uploadCsv} disabled={!csvFile || uploadingCsv}>
                    <FileUp className="w-4 h-4" />
                    {uploadingCsv ? "Uploading…" : "Upload CSV"}
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="job-select" className="text-xs text-muted-foreground uppercase tracking-wider">Select Job</Label>
                    <select
                      id="job-select"
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      <option value="">Choose uploaded job</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>{j.fileName} ({j.status})</option>
                      ))}
                    </select>
                  </div>

                  <Button className="w-full gap-2" onClick={processCsv} disabled={!selectedJobId || processingCsv}>
                    <Upload className="w-4 h-4" />
                    {processingCsv ? "Processing…" : "Process Selected Job"}
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Import Jobs</p>
                  <Button size="sm" variant="outline" onClick={() => void loadJobs()}>Refresh</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">File</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Rows</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Affected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j, i) => (
                        <tr key={j.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-secondary/20" : ""}`}>
                          <td className="px-4 py-3">
                            <p className="text-foreground truncate max-w-[180px]">{j.fileName}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(j.createdAt)}</p>
                            {j.errorMessage && <p className="text-[10px] text-red-500 mt-1">{j.errorMessage}</p>}
                          </td>
                          <td className="px-4 py-3 uppercase tracking-wider text-[10px] font-semibold text-muted-foreground">{j.status}</td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">{j.processedRows}/{j.totalRows}</td>
                          <td className="px-4 py-3 tabular-nums text-foreground">{j.affectedDrivers}</td>
                        </tr>
                      ))}
                      {!jobsLoading && jobs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No import jobs yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
