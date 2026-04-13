"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, User } from "lucide-react";

type Role = "passenger" | "driver";

interface BottomNavProps {
  role: Role;
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const items = [
    {
      label: "Home",
      href: `/${role}`,
      icon: Home,
    },
    {
      label: "Trips",
      href: `/trips/${role}`,
      icon: ListOrdered,
    },
    {
      label: "Profile",
      href: `#`,
      icon: User,
    },
  ];

  return (
    <nav className="sticky bottom-0 z-20 bg-background border-t border-border">
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={`w-5 h-5 transition-all ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  active ? "opacity-100" : "opacity-60"
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
