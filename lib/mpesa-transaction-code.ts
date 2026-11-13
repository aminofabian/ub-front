/** Safaricom confirmation codes are 10 letters and digits, for example QH7X2K9LMX. */
export const MPESA_TRANSACTION_CODE_LENGTH = 10;

export function normalizeMpesaTransactionCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MPESA_TRANSACTION_CODE_LENGTH);
}

/** A typed M-Pesa code, not a receipt number. Receipts stay all digits. */
export function parseMpesaCodeSearchQuery(query: string): string | null {
  const compact = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length < 6 || compact.length > 20) return null;
  if (/^\d+$/.test(compact)) return null;
  return compact;
}

/** A typed code is stored only when it is complete. A gateway receipt is kept as received. */
export function mpesaCodeForPayment(
  raw: string,
  opts?: { verified?: boolean },
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (opts?.verified) return trimmed;
  const code = normalizeMpesaTransactionCode(trimmed);
  return code.length === MPESA_TRANSACTION_CODE_LENGTH ? code : null;
}
