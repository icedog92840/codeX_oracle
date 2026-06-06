import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Search, X } from "lucide-react";
import type { TransactionHistoryQuery, TransactionHistoryResult, TransactionSortKey } from "@/lib/data/transaction-history";
import { cn } from "@/lib/utils";

// SortKey lists the transaction fields that can be sorted from the table header.
type SortKey = TransactionSortKey;

// ColumnDefinition connects table headers to row fields and sort behavior.
type ColumnDefinition = {
  key: SortKey;
  label: string;
  align?: "left" | "right";
};

// Columns define the transaction table layout.
const columns: ColumnDefinition[] = [
  { key: "date", label: "Date" },
  { key: "code", label: "Code" },
  { key: "category", label: "Category" },
  { key: "ticker", label: "Ticker" },
  { key: "description", label: "Description" },
  { key: "quantity", label: "Quantity", align: "right" },
  { key: "price", label: "Price", align: "right" },
  { key: "amount", label: "Amount", align: "right" },
];

// TransactionsTable renders one server-paged slice of parsed Robinhood CSV rows.
export function TransactionsTable({ transactionHistory }: { transactionHistory: TransactionHistoryResult }) {
  const { rows, filterCodes, categories, query } = transactionHistory;

  return (
    <section className="overflow-hidden rounded-xl border bg-card/90 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex flex-col gap-3 border-b px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Robinhood CSV Transactions</h2>
          <p className="text-xs text-muted-foreground">
            Showing {transactionHistory.firstVisibleRow.toLocaleString()}-{transactionHistory.lastVisibleRow.toLocaleString()} of {transactionHistory.filteredRows.toLocaleString()} filtered rows
          </p>
        </div>
        <form className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_180px_auto]" action="/transactions">
          <label className="flex items-center gap-2 rounded-xl border bg-[#191929] px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search transactions</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              name="q"
              placeholder="Search ticker, code, description"
              defaultValue={query.query}
            />
            {query.query ? (
              <Link
                className="rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear transaction search"
                href={buildHref(query, { query: "", page: 1 })}
              >
                <X className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </label>
          <input type="hidden" name="sort" value={query.sort} />
          <input type="hidden" name="direction" value={query.direction} />
          <input type="hidden" name="code" value={query.code} />
          <input type="hidden" name="category" value={query.category} />
          <ThemedFilterDropdown
            label="Code"
            value={query.code}
            options={["All", ...filterCodes]}
            getHref={(value) => buildHref(query, { code: value, page: 1 })}
          />
          <ThemedFilterDropdown
            label="Category"
            value={query.category}
            options={["All", ...categories]}
            getHref={(value) => buildHref(query, { category: value, page: 1 })}
          />
          <button type="submit" className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-secondary">
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-2 p-3 md:hidden">
        {rows.map((row) => (
          <TransactionMobileCard key={row.id} row={row} />
        ))}
      </div>
      <div className="hidden md:block">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[78px]" />
            <col className="w-[54px]" />
            <col className="w-[104px]" />
            <col className="w-[62px]" />
            <col />
            <col className="w-[78px]" />
            <col className="w-[76px]" />
            <col className="w-[92px]" />
          </colgroup>
          <thead className="bg-secondary/95 text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-2 py-2 font-medium", column.align === "right" ? "text-right" : "text-left")}>
                  <Link
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
                      column.align === "right" && "justify-end",
                    )}
                    aria-label={`Sort transactions by ${column.label}`}
                    href={buildHref(query, {
                      sort: column.key,
                      direction: query.sort === column.key && query.direction === "asc" ? "desc" : "asc",
                      page: 1,
                    })}
                  >
                    {column.label}
                    <SortIcon isActive={query.sort === column.key} direction={query.direction} />
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t transition-colors hover:bg-secondary/45">
                <td className="truncate px-2 py-2 font-mono">{row.date}</td>
                <td className="truncate px-2 py-2 font-mono">{row.code}</td>
                <td className="truncate px-2 py-2 text-muted-foreground">{row.category}</td>
                <td className="truncate px-2 py-2 font-semibold">{row.ticker}</td>
                <td className="truncate px-2 py-2 text-muted-foreground" title={row.description}>
                  {row.description}
                </td>
                <td className="truncate px-2 py-2 text-right font-mono">{row.quantity}</td>
                <td className="truncate px-2 py-2 text-right font-mono">{row.price}</td>
                <td className={cn("truncate px-2 py-2 text-right font-mono", getAmountTone(row.amountValue))}>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono">
          Page {transactionHistory.page.toLocaleString()} of {transactionHistory.totalPages.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <PaginationLink disabled={transactionHistory.page === 1} href={buildHref(query, { page: transactionHistory.page - 1 })}>
            Previous
          </PaginationLink>
          <PaginationLink disabled={transactionHistory.page === transactionHistory.totalPages} href={buildHref(query, { page: transactionHistory.page + 1 })}>
            Next
          </PaginationLink>
        </div>
      </div>
    </section>
  );
}

// TransactionMobileCard renders one CSV row as stacked fields on narrow screens.
function TransactionMobileCard({ row }: { row: TransactionHistoryResult["rows"][number] }) {
  return (
    <article className="min-w-0 rounded-xl border bg-[#191929] p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{row.date}</p>
          <p className="mt-1 truncate text-sm font-semibold">{row.ticker}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground">{row.code}</p>
          <p className={cn("font-mono text-sm font-semibold", getAmountTone(row.amountValue))}>{row.amount}</p>
        </div>
      </div>
      <p className="mt-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground" title={row.description}>{row.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <TransactionStat label="Category" value={row.category} />
        <TransactionStat label="Quantity" value={row.quantity} />
        <TransactionStat label="Price" value={row.price} />
      </div>
    </article>
  );
}

// TransactionStat renders one compact mobile transaction field.
function TransactionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary/45 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-xs font-semibold">{value}</p>
    </div>
  );
}

// ThemedFilterDropdown replaces native selects so the opened menu matches the dark app theme.
function ThemedFilterDropdown({
  label,
  value,
  options,
  getHref,
}: {
  label: string;
  value: string;
  options: string[];
  getHref: (value: string) => string;
}) {
  const allLabel = getAllFilterLabel(label);

  return (
    <details className="group relative">
      <summary className="flex h-full cursor-pointer list-none items-center justify-between gap-2 rounded-xl border bg-[#191929] px-3 py-2 text-sm outline-none transition-colors hover:border-primary/60 hover:bg-[#24243a] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 group-open:border-primary/70 group-open:bg-[#24243a] [&::-webkit-details-marker]:hidden">
        <span className="truncate">{value === "All" ? allLabel : value}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+6px)] z-30 max-h-72 w-full min-w-48 overflow-auto rounded-xl border bg-[#191929] p-1 shadow-[0_18px_45px_rgba(0,0,0,0.34)] ring-1 ring-primary/10">
        {options.map((option) => (
          <Link
            key={option}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[#24243a] hover:text-foreground focus-visible:bg-[#24243a] focus-visible:text-foreground",
              option === value
                ? "bg-[linear-gradient(135deg,#38d5ff,#7c3aed)] text-white shadow-[0_0_18px_rgba(56,213,255,0.20)] hover:text-white"
                : "text-muted-foreground",
            )}
            href={getHref(option)}
          >
            {option === "All" ? allLabel : option}
          </Link>
        ))}
      </div>
    </details>
  );
}

// getAllFilterLabel keeps dropdown labels readable without relying on naive plural rules.
function getAllFilterLabel(label: string) {
  if (label === "Category") {
    return "All categories";
  }

  return `All ${label.toLowerCase()}s`;
}

// SortIcon shows the active sort direction for a column header.
function SortIcon({ isActive, direction }: { isActive: boolean; direction: TransactionHistoryQuery["direction"] }) {
  if (!isActive) {
    return <ArrowUpDown className="size-3 opacity-45" aria-hidden="true" />;
  }

  if (direction === "asc") {
    return <ArrowUp className="size-3 text-primary" aria-hidden="true" />;
  }

  return <ArrowDown className="size-3 text-primary" aria-hidden="true" />;
}

// PaginationLink renders active links and disabled pagination states consistently.
function PaginationLink({ children, disabled, href }: { children: React.ReactNode; disabled: boolean; href: string }) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-xl border px-3 py-2 opacity-40">
        {children}
      </span>
    );
  }

  return (
    <Link className="rounded-xl border px-3 py-2 transition-colors hover:bg-secondary" href={href}>
      {children}
    </Link>
  );
}

// buildHref preserves current filters while applying one URL query update.
function buildHref(query: TransactionHistoryQuery, updates: Partial<TransactionHistoryQuery>) {
  const nextQuery = {
    ...query,
    ...updates,
  };
  const params = new URLSearchParams();

  if (nextQuery.query) {
    params.set("q", nextQuery.query);
  }

  if (nextQuery.code !== "All") {
    params.set("code", nextQuery.code);
  }

  if (nextQuery.category !== "All") {
    params.set("category", nextQuery.category);
  }

  params.set("sort", nextQuery.sort);
  params.set("direction", nextQuery.direction);
  params.set("page", String(nextQuery.page));

  return `/transactions?${params.toString()}`;
}

// getAmountTone colors positive and negative cash movement without changing neutral blank rows.
function getAmountTone(amount: number | null) {
  if (amount === null || amount === 0) {
    return "text-muted-foreground";
  }

  return amount > 0 ? "text-emerald-300" : "text-rose-300";
}
