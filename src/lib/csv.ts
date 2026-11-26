import type { Transaction } from "./schemas";

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

function escapeCsvCell(raw: string): string {
  const safe = FORMULA_PREFIX_RE.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    "Reference",
    "Date",
    "Title",
    "Counterparty",
    "Kind",
    "Status",
    "Category",
    "Recurrence",
    "Amount",
    "Notes",
  ];

  const rows = transactions.map((tx) => {
    const signed = tx.kind === "expense" ? -tx.amount : tx.amount;
    return [
      escapeCsvCell(tx.referenceCode),
      escapeCsvCell(tx.date),
      escapeCsvCell(tx.title),
      escapeCsvCell(tx.counterparty),
      escapeCsvCell(tx.kind),
      escapeCsvCell(tx.status),
      escapeCsvCell(tx.category),
      escapeCsvCell(tx.recurrence),
      signed.toFixed(2),
      escapeCsvCell(tx.notes ?? ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}
