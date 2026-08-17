import type { CartSessionLine } from "@/lib/cart-session";
import { sellAirtime, type ItemSummaryRecord } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import type { KenyanNetwork } from "@/lib/kenyan-phone";
import { toKenyanLocal07 } from "@/lib/kenyan-phone";

export const AIRTIME_CART_KIND = "airtime" as const;

export type AirtimeCartPayload = {
  phone: string;
  network: KenyanNetwork | string;
  networkLabel: string;
  amount: number;
};

export function isAirtimeCartLine(
  line: Pick<CartSessionLine, "kind" | "itemId">,
): boolean {
  return (
    line.kind === AIRTIME_CART_KIND ||
    (typeof line.itemId === "string" && line.itemId.startsWith("airtime:"))
  );
}

function formatPhone(raw: string): string {
  const digits = (toKenyanLocal07(raw) || raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("07")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw.trim();
}

export function buildAirtimeCartLine(payload: AirtimeCartPayload): CartSessionLine {
  const phone = payload.phone.trim();
  const display = formatPhone(phone);
  const label = `${payload.networkLabel} airtime · ${display}`;
  const item: ItemSummaryRecord = {
    id: `airtime:${crypto.randomUUID()}`,
    name: `${payload.networkLabel} airtime`,
    sku: phone,
    variantName: display,
  };
  return {
    key: crypto.randomUUID(),
    itemId: item.id,
    label,
    quantity: "1",
    unitPrice: String(payload.amount),
    item,
    kind: AIRTIME_CART_KIND,
    airtimePhone: phone,
    airtimeNetwork: String(payload.network),
    airtimeNetworkLabel: payload.networkLabel,
  };
}

/** After the till sale is recorded, send each parked top-up from the wallet. */
export async function dispatchAirtimeForSale(
  saleId: string,
  lines: CartSessionLine[],
): Promise<string | null> {
  const airtime = lines.filter(isAirtimeCartLine);
  if (airtime.length === 0) return null;
  const failures: string[] = [];
  for (const line of airtime) {
    const amount = Number(line.unitPrice);
    const phone = (line.airtimePhone || line.item.sku || "").trim();
    if (!phone || !Number.isFinite(amount) || amount <= 0) {
      failures.push(line.label || "Airtime");
      continue;
    }
    try {
      const created = await sellAirtime(
        {
          phoneNumber: phone,
          amount,
          channel: "POS",
          tender: "CASH",
          saleId,
        },
        nextIdempotencyKey(),
      );
      if (created.status === "FAILED") {
        failures.push(created.failureReason || line.label || "Airtime");
      }
    } catch (e) {
      failures.push(e instanceof Error ? e.message : line.label || "Airtime");
    }
  }
  if (failures.length === 0) return null;
  return `Sale recorded, but airtime did not send: ${failures.join("; ")}`;
}
