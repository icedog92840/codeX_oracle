import type { MetricCardValue } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

// MetricCard renders one compact portfolio KPI with an icon and small trend label.
export function MetricCard({ metric }: { metric: MetricCardValue }) {
  const Icon = metric.icon;

  return (
    <section className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
          <p className="mt-2 font-mono text-xl font-semibold tracking-normal">{metric.value}</p>
        </div>
        <div className="flex size-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-xs",
          metric.tone === "positive" && "text-emerald-700",
          metric.tone === "neutral" && "text-muted-foreground",
          metric.tone === "warning" && "text-amber-700",
        )}
      >
        {metric.delta}
      </p>
    </section>
  );
}
