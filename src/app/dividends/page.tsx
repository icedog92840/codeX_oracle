// DividendsPage reserves the route required for the Phase 4 dividend tracker.
export default function DividendsPage() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-normal">Dividend Tracking</h1>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-[120px_repeat(6,minmax(72px,1fr))_96px] border-b bg-secondary text-xs uppercase text-muted-foreground">
          <span className="px-3 py-2">Asset</span>
          {months.map((month) => (
            <span key={month} className="px-3 py-2 font-mono">
              {month}
            </span>
          ))}
          <span className="px-3 py-2 font-mono">Total</span>
        </div>
        {["SCHD", "JPM", "MSFT"].map((ticker, index) => (
          <div key={ticker} className="grid grid-cols-[120px_repeat(6,minmax(72px,1fr))_96px] border-b text-sm last:border-b-0">
            <span className="px-3 py-2 font-semibold">{ticker}</span>
            {months.map((month, monthIndex) => (
              <span key={`${ticker}-${month}`} className="px-3 py-2 font-mono">
                ${(18 + index * 7 + monthIndex * 1.35).toFixed(2)}
              </span>
            ))}
            <span className="px-3 py-2 font-mono font-semibold">${(128 + index * 44).toFixed(2)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
