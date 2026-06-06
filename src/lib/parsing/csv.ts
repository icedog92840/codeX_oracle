// CsvRecord stores one parsed CSV row as a string dictionary keyed by header name.
export type CsvRecord = Record<string, string>;

// parseCsvRecords reads CSV text with quoted commas and quoted newlines preserved.
export function parseCsvRecords(csvText: string): CsvRecord[] {
  const rows = parseCsvRows(csvText);
  const headers = rows[0] ?? [];

  return rows.slice(1).map((row) =>
    headers.reduce<CsvRecord>((record, header, index) => {
      // Trim header whitespace while preserving the raw cell value for downstream parsers.
      record[header.trim()] = row[index] ?? "";
      return record;
    }, {}),
  );
}

// parseCsvRows performs the character-level CSV scan used by parseCsvRecords.
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"" && insideQuotes && nextChar === "\"") {
      // Double quotes inside quoted cells represent one literal quote.
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((parsedRow) => parsedRow.some((value) => value.trim().length > 0));
}
