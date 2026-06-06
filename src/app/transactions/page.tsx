import { TransactionsTable } from "@/components/tables/transactions-table";
import { getTransactionHistoryData, parseTransactionHistoryQuery } from "@/lib/data/transaction-history";

// TransactionsPage renders a CSV-backed verification table for Robinhood rows.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const transactionQuery = parseTransactionHistoryQuery((await searchParams) ?? {});
  const transactionHistory = getTransactionHistoryData(transactionQuery);

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Transaction History</h1>
          <p className="text-sm text-muted-foreground">Search, filter, and verify parsed Robinhood CSV rows</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{transactionHistory.totalRows.toLocaleString()} CSV rows</p>
      </div>
      <TransactionsTable
        transactionHistory={transactionHistory}
      />
    </div>
  );
}
