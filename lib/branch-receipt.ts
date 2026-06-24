export type BranchReceiptSettings = {
  phone: string | null;
  email: string | null;
  website: string | null;
  footerNote: string | null;
};

export const EMPTY_BRANCH_RECEIPT: BranchReceiptSettings = {
  phone: null,
  email: null,
  website: null,
  footerNote: null,
};

export function parseBranchReceipt(raw: unknown): BranchReceiptSettings {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_BRANCH_RECEIPT };
  }
  const o = raw as Record<string, unknown>;
  const text = (v: unknown) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };
  return {
    phone: text(o.phone),
    email: text(o.email),
    website: text(o.website),
    footerNote: text(o.footerNote),
  };
}

export function branchReceiptDraft(
  settings?: BranchReceiptSettings | null,
): Record<keyof BranchReceiptSettings, string> {
  return {
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
    website: settings?.website ?? "",
    footerNote: settings?.footerNote ?? "",
  };
}

export function branchReceiptPayload(draft: Record<keyof BranchReceiptSettings, string>): BranchReceiptSettings {
  const trim = (s: string) => {
    const t = s.trim();
    return t.length > 0 ? t : null;
  };
  return {
    phone: trim(draft.phone),
    email: trim(draft.email),
    website: trim(draft.website),
    footerNote: trim(draft.footerNote),
  };
}

/** Prefer branch website; fall back to business storefront domain. */
export function resolveReceiptWebsite(
  branchWebsite: string | null | undefined,
  businessPrimaryDomain: string | null | undefined,
): string | null {
  const b = branchWebsite?.trim();
  if (b) return b;
  const d = businessPrimaryDomain?.trim();
  if (!d) return null;
  return d.startsWith("http") ? d : `https://${d}`;
}
