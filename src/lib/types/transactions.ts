// RobinhoodCsvRow mirrors the exact export headers from the local transaction log.
export type RobinhoodCsvRow = {
  "Activity Date": string;
  "Process Date": string;
  "Settle Date": string;
  Instrument: string;
  Description: string;
  "Trans Code": string;
  Quantity: string;
  Price: string;
  Amount: string;
};

// NormalizedTransaction is the app-level transaction model used after CSV parsing.
export type NormalizedTransaction = {
  id: string;
  activityDate: string;
  processDate: string;
  settleDate: string;
  date: Date;
  ticker: string;
  description: string;
  transCode: string;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  raw: RobinhoodCsvRow;
};
