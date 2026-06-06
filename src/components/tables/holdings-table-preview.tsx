import type { HoldingPreview } from "@/lib/types/dashboard";

// HoldingsTablePreview establishes the dense financial table layout for future parsed holdings.
export function HoldingsTablePreview({ holdings }: { holdings: HoldingPreview[] }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div>
          <h2 className="text-base font-semibold">Holdings</h2>
          <p className="text-xs text-muted-foreground">Cost basis, weighting, and current value</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{holdings.length} assets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              {["Ticker", "Name", "Shares", "Weight", "Avg Paid", "Total Cost", "Price", "Market Value", "P/L $", "P/L %"].map((heading) => (
                <th key={heading} className="px-3 py-2 text-left font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={holding.ticker} className="border-t">
                <td className="px-3 py-2 font-semibold">{holding.ticker}</td>
                <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">{holding.name}</td>
                <td className="px-3 py-2 font-mono">{holding.shares}</td>
                <td className="px-3 py-2 font-mono">{holding.weight}</td>
                <td className="px-3 py-2 font-mono">{holding.averagePrice}</td>
                <td className="px-3 py-2 font-mono">{holding.totalCost}</td>
                <td className="px-3 py-2 font-mono">{holding.currentPrice}</td>
                <td className="px-3 py-2 font-mono">{holding.marketValue}</td>
                <td className="px-3 py-2 font-mono text-emerald-700">{holding.profitLoss}</td>
                <td className="px-3 py-2 font-mono text-emerald-700">{holding.profitLossPercent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
