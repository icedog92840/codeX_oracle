import { Info } from "lucide-react";
import type { MetricCardValue } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

// MetricCard renders one compact portfolio KPI with an icon and small trend label.
export function MetricCard({ metric }: { metric: MetricCardValue }) {
  const Icon = metric.icon;

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="group relative inline-flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
              aria-label={`${metric.fullTitle}: ${metric.description}`}
            >
              {metric.label}
              <Info className="size-3" aria-hidden="true" />
            </button>
            <div className="pointer-events-none absolute left-0 top-6 z-30 hidden w-64 rounded-xl border bg-[#191929] p-3 text-left normal-case text-foreground shadow-[0_18px_45px_rgba(0,0,0,0.32)] group-focus-within:block group-hover:block">
              <p className="text-xs font-semibold uppercase text-primary">{metric.fullTitle}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.description}</p>
            </div>
          </div>
          <p className="mt-2 font-mono text-xl font-semibold tracking-normal">{metric.value}</p>
        </div>
        <div className="soft-pulse flex size-8 items-center justify-center rounded-xl bg-secondary text-primary shadow-[0_0_18px_rgba(56,213,255,0.14)]">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-xs",
          metric.tone === "positive" && "text-emerald-300",
          metric.tone === "neutral" && "text-muted-foreground",
          metric.tone === "warning" && "text-violet-300",
        )}
      >
        {metric.delta}
      </p>
    </section>
  );
}
