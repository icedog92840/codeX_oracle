import { parseCsvRecords, type CsvRecord } from "@/lib/parsing/csv";
import type { NormalizedTransaction, RobinhoodCsvRow } from "@/lib/types/transactions";

// parseRobinhoodCsv converts the raw Robinhood export text into normalized transactions.
export function parseRobinhoodCsv(csvText: string): NormalizedTransaction[] {
  return parseCsvRecords(csvText).map((record, index) => normalizeRobinhoodRow(record, index));
}

// normalizeRobinhoodRow maps one Robinhood CSV record into the app's internal transaction shape.
export function normalizeRobinhoodRow(record: CsvRecord, index: number): NormalizedTransaction {
  const row = record as RobinhoodCsvRow;
  const ticker = row.Instrument.trim().toUpperCase();
  const date = parseRobinhoodDate(row["Activity Date"]);

  return {
    id: `${row["Activity Date"]}-${row["Trans Code"]}-${ticker || "cash"}-${index}`,
    activityDate: row["Activity Date"],
    processDate: row["Process Date"],
    settleDate: row["Settle Date"],
    date,
    ticker,
    description: row.Description.trim(),
    transCode: row["Trans Code"].trim(),
    quantity: parseNumericCell(row.Quantity),
    price: parseMoneyCell(row.Price),
    amount: parseMoneyCell(row.Amount),
    raw: row,
  };
}

// parseMoneyCell converts Robinhood money strings, including parentheses, into signed numbers.
export function parseMoneyCell(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isNegative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const cleaned = trimmed.replace(/[($),]/g, "").replace(/\)/g, "").replace(/\$/g, "");
  const parsed = Number.parseFloat(cleaned);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return isNegative ? -parsed : parsed;
}

// parseNumericCell converts Robinhood quantity strings into plain numbers.
export function parseNumericCell(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // Robinhood appends "S" to corporate-action quantities that move shares out.
  const sign = trimmed.endsWith("S") ? -1 : 1;
  const cleaned = trimmed.replace(/S$/i, "").replace(/,/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : sign * parsed;
}

// parseRobinhoodDate keeps date handling isolated from UI components.
function parseRobinhoodDate(value: string): Date {
  const [month, day, year] = value.split("/").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}
