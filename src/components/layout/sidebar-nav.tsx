"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, History, LayoutDashboard, Repeat2, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items map the prompt's required pages to file-based routes.
const navItems = [
  { href: "/", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/dividends", label: "Dividends", mobileLabel: "Divs", icon: ChartNoAxesCombined },
  { href: "/drip", label: "DRIP", mobileLabel: "DRIP", icon: Repeat2 },
  { href: "/transactions", label: "Transactions", mobileLabel: "History", icon: History },
  { href: "/analyzer", label: "Analyzer", mobileLabel: "Scan", icon: ScanSearch },
];

// SidebarNav highlights the active route in either desktop sidebar or mobile bottom-bar form.
export function SidebarNav({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-2xl border bg-[#191929]/95 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
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
