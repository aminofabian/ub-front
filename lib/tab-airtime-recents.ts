import {
  detectKenyanNetwork,
  toKenyanLocal07,
  type KenyanNetwork,
} from "@/lib/kenyan-phone";

const MAX_RECENTS = 6;

export type TabAirtimeRecents = {
  recipients: string[];
  payers: string[];
  lastRecipient: string | null;
  lastPayer: string | null;
  lastAmount: number | null;
};

function emptyRecents(): TabAirtimeRecents {
  return {
    recipients: [],
    payers: [],
    lastRecipient: null,
    lastPayer: null,
    lastAmount: null,
  };
}

function storageKey(tabPhone: string): string {
  const local = toKenyanLocal07(tabPhone) || tabPhone.replace(/\D/g, "");
  return `kiosk.tab-airtime.v1:${local}`;
}

function pushUnique(list: string[], phone: string): string[] {
  const next = [phone, ...list.filter((p) => p !== phone)];
  return next.slice(0, MAX_RECENTS);
}

export function readTabAirtimeRecents(tabPhone: string): TabAirtimeRecents {
  if (typeof window === "undefined") return emptyRecents();
  try {
    const raw = window.localStorage.getItem(storageKey(tabPhone));
    if (!raw) return emptyRecents();
    const parsed = JSON.parse(raw) as Partial<TabAirtimeRecents>;
    const recipients = Array.isArray(parsed.recipients)
      ? parsed.recipients.map((p) => toKenyanLocal07(String(p))).filter((p): p is string => Boolean(p))
      : [];
    const payers = Array.isArray(parsed.payers)
      ? parsed.payers.map((p) => toKenyanLocal07(String(p))).filter((p): p is string => Boolean(p))
      : [];
    return {
      recipients: recipients.slice(0, MAX_RECENTS),
      payers: payers.slice(0, MAX_RECENTS),
      lastRecipient: parsed.lastRecipient
        ? toKenyanLocal07(String(parsed.lastRecipient))
        : null,
      lastPayer: parsed.lastPayer ? toKenyanLocal07(String(parsed.lastPayer)) : null,
      lastAmount:
        typeof parsed.lastAmount === "number" && Number.isFinite(parsed.lastAmount)
          ? parsed.lastAmount
          : null,
    };
  } catch {
    return emptyRecents();
  }
}

/** Persist numbers only after airtime actually landed. */
export function rememberTabAirtimeSale(
  tabPhone: string,
  recipientRaw: string,
  payerRaw: string,
  amount: number,
): TabAirtimeRecents {
  const recipient = toKenyanLocal07(recipientRaw);
  const payer = toKenyanLocal07(payerRaw);
  const prev = readTabAirtimeRecents(tabPhone);
  if (!recipient || !payer) return prev;
  const next: TabAirtimeRecents = {
    recipients: pushUnique(prev.recipients, recipient),
    payers: pushUnique(prev.payers, payer),
    lastRecipient: recipient,
    lastPayer: payer,
    lastAmount: Number.isFinite(amount) && amount > 0 ? amount : prev.lastAmount,
  };
  try {
    window.localStorage.setItem(storageKey(tabPhone), JSON.stringify(next));
  } catch {
    // Private mode / quota — the sale still succeeded.
  }
  return next;
}

export function recentNetwork(phone: string): KenyanNetwork | null {
  return detectKenyanNetwork(phone);
}
