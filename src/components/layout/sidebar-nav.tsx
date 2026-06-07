"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, ChevronUp, Database, History, LayoutDashboard, Repeat2, ScanSearch, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items map every app route to the desktop sidebar.
const navItems = [
  { href: "/", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/dividends", label: "Dividends", mobileLabel: "Divs", icon: ChartNoAxesCombined },
  { href: "/drip", label: "DRIP", mobileLabel: "DRIP", icon: Repeat2 },
  { href: "/transactions", label: "Transactions", mobileLabel: "History", icon: History },
  { href: "/analyzer", label: "Analyzer", mobileLabel: "Scan", icon: ScanSearch },
  { href: "/data-providers", label: "Data Providers", mobileLabel: "Data", icon: Database },
];

// mobilePrimaryItems stay visible in the bottom bar so core portfolio routes are always one tap away.
const mobilePrimaryItems = [
  { href: "/", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/dividends", label: "Dividends", mobileLabel: "Divs", icon: ChartNoAxesCombined },
  { href: "/transactions", label: "Transactions", mobileLabel: "History", icon: History },
];

// mobileToolItems expand above the Tools button so future utilities can be added without crowding the bar.
const mobileToolItems = [
  { href: "/drip", label: "DRIP", mobileLabel: "DRIP", icon: Repeat2 },
  { href: "/analyzer", label: "Analyzer", mobileLabel: "Scan", icon: ScanSearch },
  { href: "/data-providers", label: "Data Providers", mobileLabel: "Data", icon: Database },
];

// SidebarNav highlights the active route in either desktop sidebar or mobile bottom-bar form.
export function SidebarNav({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    const isToolRoute = mobileToolItems.some((item) => item.href === pathname);

    return (
      <nav
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1 rounded-2xl border bg-[#191929]/95 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground shadow-[0_0_22px_rgba(56,213,255,0.14)]"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", isActive && "text-primary")} aria-hidden="true" />
              <span className="truncate">{item.mobileLabel}</span>
            </Link>
          );
        })}
        <details className="group relative min-w-0">
          <summary
            className={cn(
              "flex h-full cursor-pointer list-none flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors outline-none [&::-webkit-details-marker]:hidden",
              isToolRoute
                ? "bg-secondary text-foreground shadow-[0_0_22px_rgba(56,213,255,0.14)]"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            <Wrench className={cn("size-4", isToolRoute && "text-primary")} aria-hidden="true" />
            <span className="truncate">Tools</span>
            <ChevronUp className="absolute -top-1 right-2 size-3 opacity-55 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="absolute bottom-[calc(100%+10px)] right-0 grid w-28 gap-1 rounded-2xl border bg-[#191929]/98 p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.42)] ring-1 ring-primary/10">
            {mobileToolItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", isActive && "text-primary")} aria-hidden="true" />
                  <span>{item.mobileLabel}</span>
                </Link>
              );
            })}
          </div>
        </details>
      </nav>
    );
  }

  return (
    <nav className="mt-3 flex min-w-0 flex-col gap-1" aria-label="Main navigation">
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
                ? "bg-secondary text-foreground shadow-[inset_3px_0_0_#38d5ff,0_8px_24px_rgba(0,0,0,0.18)]"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
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
