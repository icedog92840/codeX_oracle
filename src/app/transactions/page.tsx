// TransactionsPage reserves the route required for the Phase 6 transaction table.
export default function TransactionsPage() {
  const rows = [
    ["2026-01-08", "Buy", "SCHD", "12.00", "$73.10"],
    ["2026-02-14", "Dividend", "JPM", "-", "$24.45"],
    ["2026-03-22", "Buy", "MSFT", "2.00", "$421.30"],
  ];

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-normal">Transaction History</h1>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              {["Date", "Type", "Ticker", "Shares", "Amount"].map((heading) => (
                <th key={heading} className="px-3 py-2 text-left font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row[0]}-${row[1]}-${row[2]}`} className="border-t">
                {row.map((cell) => (
                  <td key={cell} className="px-3 py-2 font-mono">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
