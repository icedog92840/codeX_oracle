import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatCurrency, formatShares } from "@/lib/calculations/format";
import { parseRobinhoodCsv } from "@/lib/parsing/robinhood";
import type { NormalizedTransaction } from "@/lib/types/transactions";

// TransactionTableRow is the display-ready shape used by the transaction history table.
export type TransactionTableRow = {
  id: string;
  date: string;
  timestamp: number;
  code: string;
  category: string;
  ticker: string;
  description: string;
  quantity: string;
  quantityValue: number | null;
  price: string;
  priceValue: number | null;
  amount: string;
  amountValue: number | null;
};

// TransactionSortKey lists the fields supported by server-side transaction sorting.
export type TransactionSortKey = "date" | "code" | "category" | "ticker" | "description" | "quantity" | "price" | "amount";

// TransactionHistoryQuery captures URL-driven filters and pagination.
export type TransactionHistoryQuery = {
  query: string;
  code: string;
  category: string;
  sort: TransactionSortKey;
  direction: "asc" | "desc";
  page: number;
};

// TransactionHistoryResult contains only the current page rows plus filter metadata.
export type TransactionHistoryResult = {
  rows: TransactionTableRow[];
  filterCodes: string[];
  categories: string[];
  totalRows: number;
  filteredRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  firstVisibleRow: number;
  lastVisibleRow: number;
  query: TransactionHistoryQuery;
};

// Page size keeps transaction payloads small while preserving enough visible context.
const pageSize = 100;

// getTransactionHistoryData reads, filters, sorts, and pages the local Robinhood CSV.
export function getTransactionHistoryData(query: TransactionHistoryQuery): TransactionHistoryResult {
  const csvText = readFileSync(join(process.cwd(), "Transaction_Log.csv"), "utf-8");
  const transactions = parseRobinhoodCsv(csvText);
  const rows = transactions.map(toTransactionTableRow).sort((left, right) => right.timestamp - left.timestamp);
  const filterCodes = Array.from(new Set(rows.map((row) => row.code))).sort((left, right) => left.localeCompare(right));
  const categories = Array.from(new Set(rows.map((row) => row.category))).sort((left, right) => left.localeCompare(right));
  const filteredRows = filterAndSortRows(rows, query);
  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const page = Math.min(Math.max(query.page, 1), totalPages);
  const firstVisibleRow = filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisibleRow = Math.min(page * pageSize, filteredRows.length);

  return {
    rows: filteredRows.slice((page - 1) * pageSize, page * pageSize),
    filterCodes,
    categories,
    totalRows: rows.length,
    filteredRows: filteredRows.length,
    page,
    pageSize,
    totalPages,
    firstVisibleRow,
    lastVisibleRow,
    query: {
      ...query,
      page,
    },
  };
}

// parseTransactionHistoryQuery normalizes URL search params into a safe query object.
export function parseTransactionHistoryQuery(searchParams: Record<string, string | string[] | undefined>): TransactionHistoryQuery {
  const sort = parseSortKey(getParam(searchParams.sort));
  const direction = getParam(searchParams.direction) === "asc" ? "asc" : "desc";
  const page = Number.parseInt(getParam(searchParams.page) || "1", 10);

  return {
    query: getParam(searchParams.q),
    code: getParam(searchParams.code) || "All",
    category: getParam(searchParams.category) || "All",
    sort,
    direction,
    page: Number.isNaN(page) ? 1 : page,
  };
}

// toTransactionTableRow formats one normalized transaction for dense table display.
function toTransactionTableRow(transaction: NormalizedTransaction): TransactionTableRow {
  return {
    id: transaction.id,
    date: transaction.activityDate,
    timestamp: transaction.date.getTime(),
    code: transaction.transCode || "-",
    category: categorizeTransaction(transaction.transCode),
    ticker: transaction.ticker || "Cash",
    description: transaction.description.replace(/\s+/g, " "),
    quantity: transaction.quantity === null ? "-" : formatShares(transaction.quantity),
    quantityValue: transaction.quantity,
    price: transaction.price === null ? "-" : formatCurrency(transaction.price),
    priceValue: transaction.price,
    amount: transaction.amount === null ? "-" : formatCurrency(transaction.amount),
    amountValue: transaction.amount,
  };
}

// filterAndSortRows applies search, select filters, and stable server-side sorting.
function filterAndSortRows(rows: TransactionTableRow[], query: TransactionHistoryQuery) {
  const normalizedSearch = query.query.trim().toLowerCase();

  return rows
    .filter((row) => {
      const matchesCode = query.code === "All" || row.code === query.code;
      const matchesCategory = query.category === "All" || row.category === query.category;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        row.ticker.toLowerCase().includes(normalizedSearch) ||
        row.code.toLowerCase().includes(normalizedSearch) ||
        row.category.toLowerCase().includes(normalizedSearch) ||
        row.description.toLowerCase().includes(normalizedSearch);

      return matchesCode && matchesCategory && matchesSearch;
    })
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareRows(left.row, right.row, query.sort);

      if (comparison === 0) {
        return left.index - right.index;
      }

      return query.direction === "asc" ? comparison : -comparison;
    })
    .map(({ row }) => row);
}

// compareRows sorts row fields using dates, numeric values, or text comparison.
function compareRows(left: TransactionTableRow, right: TransactionTableRow, sort: TransactionSortKey) {
  if (sort === "date") {
    return left.timestamp - right.timestamp;
  }

  if (sort === "quantity") {
    return compareNullableNumbers(left.quantityValue, right.quantityValue);
  }

  if (sort === "price") {
    return compareNullableNumbers(left.priceValue, right.priceValue);
  }

  if (sort === "amount") {
    return compareNullableNumbers(left.amountValue, right.amountValue);
  }

  return left[sort].localeCompare(right[sort], undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

// compareNullableNumbers keeps blank Robinhood cells below real numeric values.
function compareNullableNumbers(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

// parseSortKey protects the table from unsupported URL sort values.
function parseSortKey(value: string): TransactionSortKey {
  const supportedSorts: TransactionSortKey[] = ["date", "code", "category", "ticker", "description", "quantity", "price", "amount"];

  if (supportedSorts.includes(value as TransactionSortKey)) {
    return value as TransactionSortKey;
  }

  return "date";
}

// getParam unwraps Next.js search param values into one string.
function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

// categorizeTransaction groups Robinhood transaction codes into practical table filters.
function categorizeTransaction(code: string) {
  if (code === "Buy" || code === "Sell") {
    return "Trades";
  }

  if (code === "CDIV") {
    return "Dividends";
  }

  if (code === "ACH") {
    return "Transfers";
  }

  if (["BTO", "BTC", "STO", "STC", "OEXP", "OASGN"].includes(code)) {
    return "Options";
  }

  if (["ACATO", "CONV", "MRGS", "REC", "SDIV", "SOFF", "SPL", "SPR", "SXCH"].includes(code)) {
    return "Corporate Actions";
  }

  if (["AFEE", "CARD", "DFEE", "DTAX", "FEE", "GOLD"].includes(code)) {
    return "Fees";
  }

  if (["GDBP", "INT"].includes(code)) {
    return "Interest";
  }

  return "Other";
}
