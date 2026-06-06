"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, History, LayoutDashboard, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items map the prompt's required pages to file-based routes.
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dividends", label: "Dividends", icon: ChartNoAxesCombined },
  { href: "/drip", label: "DRIP", icon: Repeat2 },
  { href: "/transactions", label: "Transactions", icon: History },
];

// SidebarNav highlights the active route and collapses into a horizontal strip on mobile.
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
