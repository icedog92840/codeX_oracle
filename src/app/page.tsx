import { AllocationDonutPlaceholder } from "@/components/charts/allocation-donut-placeholder";
import { PortfolioLinePlaceholder } from "@/components/charts/portfolio-line-placeholder";
import { MetricCard } from "@/components/cards/metric-card";
import { HoldingsTablePreview } from "@/components/tables/holdings-table-preview";
import {
  holdingsPreview,
  phaseOneMetrics,
  trajectoryPoints,
} from "@/lib/mock-data/phase-one-dashboard";

// Home renders the main dashboard route with compact portfolio surfaces.
export default function Home() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Portfolio Overview</h1>
          <p className="text-sm text-muted-foreground">Local portfolio value, income, and allocation</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">Updated Jun 05, 2026</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {phaseOneMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <PortfolioLinePlaceholder points={trajectoryPoints} />
        <AllocationDonutPlaceholder />
      </div>

      <HoldingsTablePreview holdings={holdingsPreview} />
    </div>
  );
}
