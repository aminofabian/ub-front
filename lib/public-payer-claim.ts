import { apiUrl } from "@/lib/config";

export type PayerClaimMatch = {
  customerNo: number;
  maskedHint: string;
  suffix: string;
};

export type PayerClaimLookup = {
  matches: PayerClaimMatch[];
};

export type PayerClaimVerify = {
  customerId: string;
  customerNo: number;
  name: string;
  phone: string;
  tabPath: string;
};

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string; title?: string };
      detail = body.detail || body.title || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function tenantHostHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { Accept: "application/json" };
  }
  const host = window.location.hostname?.trim();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (host) {
    headers["X-Tenant-Host"] = host;
  }
  return headers;
}

export async function lookupPayerClaim(
  firstName: string,
  lastName: string,
  lastThree?: string,
): Promise<PayerClaimLookup> {
  const res = await fetch(apiUrl("/api/v1/public/credits/payer-claims/lookup"), {
    method: "POST",
    headers: { ...tenantHostHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, lastThree: lastThree || null }),
  });
  return readJson<PayerClaimLookup>(res);
}

export async function sendPayerClaimCode(
  firstName: string,
  lastName: string,
  missingDigits: string,
  lastThree?: string,
): Promise<{ maskedHint: string; channel: string }> {
  const res = await fetch(apiUrl("/api/v1/public/credits/payer-claims/send-code"), {
    method: "POST",
    headers: { ...tenantHostHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      lastName,
      missingDigits,
      lastThree: lastThree || null,
    }),
  });
  return readJson<{ maskedHint: string; channel: string }>(res);
}

export async function verifyPayerClaim(
  firstName: string,
  lastName: string,
  missingDigits: string,
  code: string,
  lastThree?: string,
): Promise<PayerClaimVerify> {
  const res = await fetch(apiUrl("/api/v1/public/credits/payer-claims/verify"), {
    method: "POST",
    headers: { ...tenantHostHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      lastName,
      missingDigits,
      code,
      lastThree: lastThree || null,
    }),
  });
  return readJson<PayerClaimVerify>(res);
}
