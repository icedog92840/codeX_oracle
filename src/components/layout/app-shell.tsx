import type { ReactNode } from "react";
import { Activity } from "lucide-react";
import { InsightRibbon } from "@/components/layout/insight-ribbon";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { getInsightRibbonData } from "@/lib/data/insight-ribbon";

// AppShell provides the shared navigation, top bar, and responsive content frame.
export function AppShell({ children }: { children: ReactNode }) {
  const insightRibbonData = getInsightRibbonData();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="hidden min-w-0 overflow-hidden border-r bg-card/85 px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64">
          <div className="flex items-center gap-2 px-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#38d5ff,#7c3aed)] text-white shadow-[0_0_24px_rgba(56,213,255,0.24)]">
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
          <header className="sticky top-0 z-20 border-b bg-background/80 px-3 py-2 backdrop-blur md:px-5">
            <InsightRibbon data={insightRibbonData} />
          </header>

          <main className="flex-1 px-3 py-4 pb-24 md:px-5 lg:px-6 lg:pb-4">{children}</main>
        </div>
      </div>
      <SidebarNav variant="mobile" />
    </div>
  );
}
