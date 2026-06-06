import Link from "next/link";
import { DripCompoundingVisualizer } from "@/components/charts/drip-compounding-visualizer";
import { getDripVisualizerData, parseDripTicker } from "@/lib/data/drip-visualizer";
import { cn } from "@/lib/utils";

// DripPage renders the CSV-backed historical DRIP compounding visualizer.
export default async function DripPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const dripData = getDripVisualizerData(parseDripTicker(resolvedSearchParams));

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">DRIP Visualizer</h1>
          <p className="text-sm text-muted-foreground">CSV-derived compounding comparison with historical and projected points</p>
        </div>
        <TickerDropdown dripData={dripData} />
      </div>

      <DripCompoundingVisualizer dripData={dripData} />
    </div>
  );
}

// TickerDropdown lets the user switch assets without adding manual model inputs.
function TickerDropdown({ dripData }: { dripData: ReturnType<typeof getDripVisualizerData> }) {
  return (
    <details className="group relative w-fit">
      <summary className="flex min-w-48 cursor-pointer list-none items-center justify-between gap-2 rounded-xl border bg-[#191929] px-3 py-2 text-sm outline-none transition-colors hover:border-primary/60 hover:bg-[#24243a] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 group-open:border-primary/70 group-open:bg-[#24243a] [&::-webkit-details-marker]:hidden">
        <span className="font-mono">{dripData.selectedTicker}</span>
        <span className="text-xs text-muted-foreground">change</span>
      </summary>
      <div className="pill-scrollbar absolute right-0 top-[calc(100%+6px)] z-40 max-h-72 w-64 overflow-y-auto rounded-xl border bg-[#191929] p-1 shadow-[0_18px_45px_rgba(0,0,0,0.34)] ring-1 ring-primary/10">
        {dripData.tickerOptions.map((option) => (
          <Link
            key={option.ticker}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[#24243a] hover:text-foreground focus-visible:bg-[#24243a] focus-visible:text-foreground",
              option.ticker === dripData.selectedTicker
                ? "bg-[linear-gradient(135deg,#38d5ff,#7c3aed)] text-white shadow-[0_0_18px_rgba(56,213,255,0.20)] hover:text-white"
                : "text-muted-foreground",
            )}
            href={`/drip?ticker=${option.ticker}`}
          >
            <span className="font-mono font-semibold">{option.ticker}</span>
            <span className="ml-2 truncate text-xs">{option.name}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
