"use client";

import ProfileSheet from "@/components/profile-sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, User } from "lucide-react";
import { useState } from "react";

type Role = "passenger" | "driver";

interface BottomNavProps {
  role: Role;
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { label: "Home",   href: `/${role}`,        icon: Home },
    { label: "Trips",  href: `/trips/${role}`,   icon: ListOrdered },
  ];

  const isProfileActive = profileOpen;

  return (
    <>
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} role={role} />

      <nav className="sticky bottom-0 z-20 bg-background border-t border-border">
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon
                  className={`w-5 h-5 transition-all ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`}
                />
                <span className={`text-[10px] font-medium tracking-wide ${active ? "opacity-100" : "opacity-60"}`}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-full" />
                )}
              </Link>
            );
          })}

          {/* Profile tab — opens sheet */}
          <button
            onClick={() => setProfileOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative ${
              isProfileActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User
              className={`w-5 h-5 transition-all ${isProfileActive ? "stroke-[2.5]" : "stroke-[1.5]"}`}
            />
            <span className={`text-[10px] font-medium tracking-wide ${isProfileActive ? "opacity-100" : "opacity-60"}`}>
              Profile
            </span>
            {isProfileActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
