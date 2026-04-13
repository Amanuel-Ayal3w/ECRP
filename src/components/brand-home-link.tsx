import Link from "next/link";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  header: {
    box: "w-7 h-7 rounded-sm",
    car: "w-3.5 h-3.5",
    text: "text-base font-bold tracking-tight",
    gap: "gap-2",
  },
  hero: {
    box: "w-10 h-10 rounded-lg",
    car: "w-5 h-5",
    text: "text-2xl font-extrabold tracking-tight",
    gap: "gap-2.5",
  },
  nav: {
    box: "w-7 h-7 rounded-sm",
    car: "w-4 h-4",
    text: "text-sm font-semibold tracking-tight",
    gap: "gap-2",
  },
} as const;

/** Full ECRP wordmark → `/` */
export function BrandHomeLink({
  variant = "nav",
  className,
}: {
  variant?: keyof typeof variants;
  className?: string;
}) {
  const v = variants[variant];
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:opacity-90 transition-opacity",
        v.gap,
        className
      )}
      aria-label="ECRP home"
    >
      <div className={cn("bg-foreground flex items-center justify-center shrink-0", v.box)}>
        <Car className={cn(v.car, "text-background")} />
      </div>
      <span
        className={cn("text-foreground", v.text)}
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
      >
        ECRP
      </span>
    </Link>
  );
}

/** Car chip only → `/` (use beside “Live Trip”, “My Trips”, etc.) */
export function BrandIconHomeLink({
  className,
  carClassName = "w-4 h-4",
}: {
  className?: string;
  carClassName?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:opacity-90 transition-opacity",
        className
      )}
      aria-label="ECRP home"
    >
      <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
        <Car className={cn(carClassName, "text-background")} />
      </div>
    </Link>
  );
}
