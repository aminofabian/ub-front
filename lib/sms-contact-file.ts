/**
 * Reading and writing contact lists for the SMS Hub: numbers typed or pasted by staff,
 * a CSV or text file, and the download of the contact list. Pure functions; the server
 * decides which numbers are valid.
 */
import type { SmsContactImportRow, SmsContactRow, SmsReach } from "@/lib/sms-hub-api";

const SEPARATORS = /[,;\t]/;

/** Quotes are dropped rather than parsed: a quoted "Kamau, J" still yields the name Kamau J. */
function unquote(cell: string): string {
  return cell.split('"').join("").trim();
}

function hasLetter(value: string): boolean {
  return /[A-Za-z\u00C0-\u024F]/.test(value);
}

/** A cell that could be a phone number: digits with the usual punctuation, no letters. */
function looksLikePhone(value: string): boolean {
  if (hasLetter(value)) return false;
  const digits = value.replace(/\D+/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isKenyanMobile(value: string): boolean {
  return !hasLetter(value) && /^(254|0)?[17]\d{8}$/.test(value.replace(/\D+/g, ""));
}

/**
 * One contact per line: a number, optionally with a name before or after it, separated
 * by a comma, semicolon or tab ("0712345678, Wanjiku Kamau"). Lines with no digits at
 * all (a header row, blank lines) are ignored; a line with digits but no usable number
 * is passed on so the server can report it.
 */
export function parseContactLines(text: string): SmsContactImportRow[] {
  const rows: SmsContactImportRow[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !/\d/.test(line)) continue;
    const cells = line.split(SEPARATORS).map(unquote).filter((c) => c.length > 0);
    // A Kenyan mobile wins over any other run of digits, such as a date column.
    const phone = cells.find(isKenyanMobile) ?? cells.find(looksLikePhone);
    if (!phone) {
      rows.push({ phone: line.slice(0, 100) });
      continue;
    }
    const names = cells.filter((c) => c !== phone && hasLetter(c));
    const name = names.join(" ").trim().slice(0, 200);
    rows.push(name ? { name, phone } : { phone });
  }
  return rows;
}

const REACH_TEXT: Record<SmsReach, string> = {
  CAN_TEXT: "Agreed to offers",
  RECEIPTS_ONLY: "Receipts only",
  OPTED_OUT: "Opted out",
  NO_NUMBER: "No number",
};

/** Spreadsheets run a cell that starts with = + - @ as a formula; a name must never do that. */
function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.split('"').join('""')}"`;
}

/** 0712345678 becomes 254712345678, so a spreadsheet does not drop the leading zero. */
function internationalDigits(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D+/g, "");
  return digits.startsWith("0") && digits.length === 10 ? `254${digits.slice(1)}` : digits;
}

export function contactsToCsv(rows: SmsContactRow[]): string {
  const header = ["Name", "Phone", "SMS", "Last bought", "Purchases"];
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.name ?? ""),
        csvCell(internationalDigits(row.phone)),
        csvCell(REACH_TEXT[row.reach] ?? row.reach),
        csvCell(row.lastPurchaseAt ? row.lastPurchaseAt.slice(0, 10) : ""),
        String(row.purchaseCount ?? 0),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // The byte-order mark makes Excel read names with accents correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
