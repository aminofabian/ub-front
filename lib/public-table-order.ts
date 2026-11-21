import { apiUrl } from "@/lib/config";

/**
 * Client for ordering from the QR code on a table. Nobody is signed in: the shop is named by its
 * slug and the table by the secret in its code. Shapes mirror `docs/openapi/phase-1.yaml`.
 */

export type PublicDish = {
  id: string;
  heading: string | null;
  name: string;
  price: number;
  groups: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDelta: number }[];
  }[];
  description?: string | null;
  imageUrl?: string | null;
};

export type PublicTableMenu = { shopName: string; tableName: string; currency: string; dishes: PublicDish[] };

export type PublicOrderConfirmation = { orderNumber: number; tableName: string; added: number; total: number };

export type PublicStatusLine = {
  id: string;
  name: string;
  quantity: number;
  amount: number;
  stage: string;
  /** True only for a line this phone added that staff have not sent yet. */
  removable: boolean;
};

/** What the table has ordered and still owes, as the diner sees it. No staff or customer detail. */
export type PublicOrderStatus = {
  shopName: string;
  tableName: string;
  currency: string;
  /** Null when the table has no open order yet. */
  orderNumber: number | null;
  status: string;
  billRequested: boolean;
  total: number;
  due: number;
  lines: PublicStatusLine[];
};

/** Carries the HTTP status so the page can tell "this code no longer works" from a real fault. */
export class PublicTableOrderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PublicTableOrderError";
  }
}

function base(slug: string, token: string): string {
  return apiUrl(
    `/api/v1/public/businesses/${encodeURIComponent(slug.trim())}/table-orders/${encodeURIComponent(token.trim())}`,
  );
}

async function read<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let detail = "";
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    // No readable body; the status is enough.
  }
  throw new PublicTableOrderError(detail || "Something went wrong. Try again.", res.status);
}

/** Null when the code does not work: wrong shop, replaced, or ordering from tables is switched off. */
export async function fetchPublicTableMenu(slug: string, token: string): Promise<PublicTableMenu | null> {
  const res = await fetch(base(slug, token), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (res.status === 404) return null;
  return read<PublicTableMenu>(res);
}

/** `requestId` is made once per order by the phone, so sending it again adds nothing. */
export async function placePublicTableOrder(
  slug: string,
  token: string,
  body: {
    requestId: string;
    lines: { menuItemId: string; modifierOptionIds: string[]; quantity: number; note?: string }[];
  },
): Promise<PublicOrderConfirmation> {
  const res = await fetch(base(slug, token), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return read<PublicOrderConfirmation>(res);
}

/** What the table has ordered, what is left to pay, and whether the bill has been asked for. */
export async function fetchPublicTableStatus(slug: string, token: string): Promise<PublicOrderStatus> {
  const res = await fetch(`${base(slug, token)}/status`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return read<PublicOrderStatus>(res);
}

/** Sets the same "bill requested" flag the floor shows. Asking twice changes nothing. */
export async function askForPublicTableBill(slug: string, token: string): Promise<PublicOrderStatus> {
  const res = await fetch(`${base(slug, token)}/bill`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return read<PublicOrderStatus>(res);
}

/** Takes off a line this phone added, while it is still waiting for a member of staff. */
export async function removePublicTableLine(
  slug: string,
  token: string,
  lineId: string,
): Promise<PublicOrderStatus> {
  const res = await fetch(`${base(slug, token)}/lines/${encodeURIComponent(lineId.trim())}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return read<PublicOrderStatus>(res);
}
