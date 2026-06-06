import type { ReactNode } from "react";
import { Activity, Bell, Search } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";

// AppShell provides the shared navigation, top bar, and responsive content frame.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b bg-card/90 px-3 py-3 shadow-sm lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 px-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-5">codeX Oracle</p>
              <p className="text-xs text-muted-foreground">Portfolio tracker</p>
            </div>
          </div>
          <SidebarNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-background/90 px-3 py-2 backdrop-blur md:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="truncate text-sm text-muted-foreground">Search holdings, dividends, transactions</span>
              </div>
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell aria-hidden="true" />
              </Button>
            </div>
          </header>

          <main className="flex-1 px-3 py-4 md:px-5 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
