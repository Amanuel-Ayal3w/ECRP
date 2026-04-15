"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { driverAuthClient, passengerAuthClient } from "@/lib/auth-client";
import {
  Car,
  CheckCircle,
  Clock,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string | Date;
};

type DriverDoc = {
  id: string;
  docType: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  status: string;
  uploadedAt: string | Date;
};

const DOC_META: Record<string, { label: string; hint: string }> = {
  license:      { label: "Driver's License",     hint: "Front page of your license (JPEG, PNG, PDF — max 10 MB)" },
  registration: { label: "Vehicle Registration", hint: "Registration document / Libre (JPEG, PNG, PDF — max 10 MB)" },
  insurance:    { label: "Insurance",            hint: "Valid insurance certificate (JPEG, PNG, PDF — max 10 MB)" },
};
const DOC_ORDER = ["license", "registration", "insurance"] as const;

function StatusBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
        <ShieldCheck className="w-3 h-3" /> Verified
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Clock className="w-3 h-3" /> Pending review
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center text-background font-bold text-xl flex-shrink-0">
      {initials || <User className="w-7 h-7" />}
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border border-border bg-secondary text-foreground">
      {role === "driver" ? <Car className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {role}
    </span>
  );
}

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: "passenger" | "driver";
}

export default function ProfileSheet({ open, onOpenChange, role }: ProfileSheetProps) {
  const router  = useRouter();
  const apiBase = role === "driver" ? "/api/driver" : "/api/passenger";
  const client  = role === "driver" ? driverAuthClient : passengerAuthClient;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // name edit
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // password change
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // documents (driver only)
  const [docs, setDocs] = useState<DriverDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // docType uploading
  const [deleting, setDeleting] = useState<string | null>(null);   // doc id deleting
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // logout
  const [loggingOut, setLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/me`, { credentials: "include" });
      const data = (await r.json()) as { user?: UserProfile };
      if (data.user) {
        setProfile(data.user);
        setNameValue(data.user.name);
        if (data.user.role === "driver") {
          void loadDocs();
        }
      }
    } catch {
      toast.error("Could not load your profile.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const r = await fetch("/api/driver/documents", { credentials: "include" });
      const data = (await r.json()) as { documents?: DriverDoc[] };
      setDocs(data.documents ?? []);
    } catch {
      /* silent */
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadProfile();
  }, [open, loadProfile]);

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    setSavingName(true);
    try {
      const r = await fetch(`${apiBase}/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(data.error ?? "Could not update name.");
        return;
      }
      setProfile((p) => p ? { ...p, name: nameValue.trim() } : p);
      setEditingName(false);
      toast.success("Name updated.");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error("New passwords don't match.");
      return;
    }
    setSavingPwd(true);
    try {
      const r = await fetch(`${apiBase}/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(data.error ?? "Password change failed.");
        return;
      }
      toast.success("Password changed.", { description: "Use your new password next time you sign in." });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setShowPwd(false);
    } finally {
      setSavingPwd(false);
    }
  };

  const handleUploadDoc = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", docType);
      const r = await fetch("/api/driver/documents", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string; document?: DriverDoc };
      if (!r.ok) {
        toast.error(data.error ?? "Upload failed.");
        return;
      }
      toast.success(`${DOC_META[docType]?.label ?? docType} uploaded.`, {
        description: "Pending admin review.",
      });
      setDocs((prev) => {
        const filtered = prev.filter((d) => d.docType !== docType);
        return data.document ? [...filtered, data.document] : filtered;
      });
    } finally {
      setUploading(null);
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType]!.value = "";
      }
    }
  };

  const handleDeleteDoc = async (doc: DriverDoc) => {
    setDeleting(doc.id);
    try {
      const r = await fetch(`/api/driver/documents/${doc.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Delete failed.");
        return;
      }
      toast.success(`${DOC_META[doc.docType]?.label ?? doc.docType} removed.`);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await client.signOut();
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm p-0 flex flex-col bg-background border-border"
      >
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle
            className="text-base font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            My profile
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground text-sm">
              <div className="w-16 h-16 rounded-full bg-secondary animate-pulse" />
              <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
              <div className="h-2.5 w-40 bg-secondary rounded animate-pulse" />
            </div>
          ) : profile ? (
            <>
              {/* ── Avatar + identity ── */}
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar name={profile.name} />
                <div>
                  <p
                    className="text-lg font-bold text-foreground"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
                  >
                    {profile.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <RoleBadge role={profile.role} />
                    {joinedDate && (
                      <span className="text-[10px] text-muted-foreground">
                        Joined {joinedDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* ── Name ── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Display name
                  </p>
                  {!editingName && (
                    <button
                      onClick={() => setEditingName(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      autoFocus
                      className="h-9 text-sm bg-input border-border flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveName();
                        if (e.key === "Escape") { setEditingName(false); setNameValue(profile.name); }
                      }}
                    />
                    <Button size="sm" className="h-9 px-3" onClick={handleSaveName} disabled={savingName || !nameValue.trim()}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 px-3 border-border" onClick={() => { setEditingName(false); setNameValue(profile.name); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-foreground">{profile.name}</p>
                )}
              </div>

              {/* ── Email (read-only) ── */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Email
                </p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-foreground">{profile.email}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">Email cannot be changed here.</p>
              </div>

              <Separator className="bg-border" />

              {/* ── Password change ── */}
              <div className="flex flex-col gap-3">
                <button
                  className="flex items-center justify-between w-full group"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium group-hover:text-foreground transition-colors">
                      Change password
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{showPwd ? "▲" : "▼"}</span>
                </button>

                {showPwd && (
                  <form onSubmit={handleChangePassword} className="flex flex-col gap-3 pl-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="current-pwd" className="text-xs text-muted-foreground uppercase tracking-wider">
                        Current password
                      </Label>
                      <Input
                        id="current-pwd"
                        type="password"
                        autoComplete="current-password"
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        className="h-9 text-sm bg-input border-border"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pwd" className="text-xs text-muted-foreground uppercase tracking-wider">
                        New password
                      </Label>
                      <Input
                        id="new-pwd"
                        type="password"
                        autoComplete="new-password"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className="h-9 text-sm bg-input border-border"
                        placeholder="Min 8 characters"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-pwd" className="text-xs text-muted-foreground uppercase tracking-wider">
                        Confirm new password
                      </Label>
                      <Input
                        id="confirm-pwd"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        className="h-9 text-sm bg-input border-border"
                        placeholder="Repeat new password"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full h-9"
                      disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                    >
                      {savingPwd ? "Saving…" : "Update password"}
                    </Button>
                  </form>
                )}
              </div>

              {/* ── Driver documents (driver-only) ── */}
              {profile.role === "driver" && (
                <>
                  <Separator className="bg-border" />

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Documents
                      </p>
                    </div>

                    <p className="text-[11px] text-muted-foreground -mt-2">
                      Upload your license, registration, and insurance for admin verification before you go live.
                    </p>

                    {docsLoading ? (
                      <div className="flex flex-col gap-3">
                        {DOC_ORDER.map((t) => (
                          <div key={t} className="h-16 rounded-lg bg-secondary animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {DOC_ORDER.map((docType) => {
                          const meta  = DOC_META[docType];
                          const doc   = docs.find((d) => d.docType === docType);
                          const busy  = uploading === docType || (!!doc && deleting === doc.id);

                          return (
                            <div
                              key={docType}
                              className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-foreground">{meta.label}</p>
                                {doc && <StatusBadge status={doc.status} />}
                              </div>

                              {doc ? (
                                <div className="flex items-center gap-2">
                                  {doc.mimeType.startsWith("image/") ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={doc.filePath}
                                      alt={meta.label}
                                      className="w-12 h-12 rounded-md object-cover border border-border flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center border border-border flex-shrink-0">
                                      <FileText className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-foreground truncate">{doc.originalName}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {(doc.fileSize / 1024).toFixed(0)} KB ·{" "}
                                      {new Date(doc.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>

                                  <div className="flex gap-1 flex-shrink-0">
                                    {/* Re-upload */}
                                    <button
                                      className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                                      title="Replace"
                                      disabled={busy}
                                      onClick={() => fileInputRefs.current[docType]?.click()}
                                    >
                                      <Upload className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                    {/* Delete */}
                                    <button
                                      className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                                      title="Remove"
                                      disabled={busy}
                                      onClick={() => handleDeleteDoc(doc)}
                                    >
                                      {deleting === doc.id
                                        ? <span className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
                                        : <Trash2 className="w-3 h-3 text-muted-foreground" />
                                      }
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="flex items-center gap-2 w-full rounded-md border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                                  disabled={busy}
                                  onClick={() => fileInputRefs.current[docType]?.click()}
                                >
                                  {uploading === docType ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
                                      Uploading…
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3.5 h-3.5" />
                                      {meta.hint}
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Hidden file input */}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden"
                                ref={(el) => { fileInputRefs.current[docType] = el; }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleUploadDoc(docType, f);
                                }}
                              />

                              {doc?.status === "verified" && (
                                <p className="text-[10px] text-foreground flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified by admin
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Could not load profile.</p>
          )}
        </div>

        {/* ── Footer: logout ── */}
        <div className="px-5 py-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full gap-2 border-border"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
