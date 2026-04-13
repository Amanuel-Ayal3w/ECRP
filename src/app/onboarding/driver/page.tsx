"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandHomeLink } from "@/components/brand-home-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function DriverSetupPage() {
  const [form, setForm] = useState({
    plate: "",
    capacity: "",
    model: "",
    licenseNumber: "",
  });

  const isComplete =
    form.plate.trim() &&
    form.capacity.trim() &&
    form.model.trim() &&
    form.licenseNumber.trim();

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(circle, oklch(0.5 0 0 / 12%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border px-5 py-3.5 flex items-center justify-between">
        <BrandHomeLink variant="header" />
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="border border-border rounded-xl bg-card p-8">
          <div className="mb-8">
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">
              Step 2 of 2
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Vehicle details
            </h1>
            <p className="text-sm text-muted-foreground">
              Your vehicle info helps passengers identify you.
            </p>
          </div>

          <div className="flex flex-col gap-5 mb-8">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plate" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Plate Number
              </Label>
              <Input
                id="plate"
                placeholder="e.g. AA 3-45678"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="model" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vehicle Model
              </Label>
              <Input
                id="model"
                placeholder="e.g. Toyota Corolla 2019"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Passenger Capacity
              </Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={8}
                placeholder="e.g. 3"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                License Number
              </Label>
              <Input
                id="license"
                placeholder="e.g. ETH-2024-XXXX"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground/30"
              />
            </div>
          </div>

          <Link href="/driver">
            <Button
              className="w-full gap-2"
              disabled={!isComplete}
              size="lg"
            >
              Activate Driver Profile
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Your data is only shared with matched passengers.
        </p>
      </div>
      </div>
    </main>
  );
}
