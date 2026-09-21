/**
 * Kenyan bank Lipa Na M-Pesa / Paybill business numbers for receiving money.
 * Account number is the shop's bank account (or bank-issued till account).
 */
export type KenyaMpesaBank = {
  id: string;
  name: string;
  /** M-Pesa Paybill / business number. */
  businessNumber: string;
  hint?: string;
};

export const KENYA_MPESA_BANKS: readonly KenyaMpesaBank[] = [
  { id: "equity", name: "Equity Bank", businessNumber: "247247" },
  { id: "coop", name: "Co-operative Bank", businessNumber: "400200" },
  { id: "kcb", name: "KCB Bank", businessNumber: "522522" },
  { id: "ncba", name: "NCBA", businessNumber: "880100" },
  { id: "absa", name: "Absa Bank Kenya", businessNumber: "303030" },
  {
    id: "stanChart",
    name: "Standard Chartered Bank",
    businessNumber: "329329",
  },
  { id: "family", name: "Family Bank", businessNumber: "222111" },
  { id: "dtb", name: "Diamond Trust Bank (DTB)", businessNumber: "516600" },
  { id: "im", name: "I&M Bank", businessNumber: "542542" },
  { id: "stanbic", name: "Stanbic Bank", businessNumber: "600100" },
  { id: "nbk", name: "National Bank of Kenya", businessNumber: "547700" },
] as const;

export function kenyaBankById(id: string | null | undefined): KenyaMpesaBank | undefined {
  if (!id) return undefined;
  return KENYA_MPESA_BANKS.find((b) => b.id === id);
}

export function kenyaBankByBusinessNumber(
  businessNumber: string | null | undefined,
): KenyaMpesaBank | undefined {
  const digits = (businessNumber ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  return KENYA_MPESA_BANKS.find((b) => b.businessNumber === digits);
}
