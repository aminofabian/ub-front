/**
 * Persist create-business step 1 so closing the landing modal does not orphan
 * the tenant and force a second onboard (duplicate slug / empty shop).
 */

const STORAGE_KEY = "palmart.pendingOnboard.v1";
/** Drop drafts older than this so abandoned shops don't linger forever in UI. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingOnboardDraft = {
  tenantId: string;
  slug: string;
  name: string;
  countryCode: string;
  createdAt: string;
};

function isDraft(value: unknown): value is PendingOnboardDraft {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.tenantId === "string" &&
    row.tenantId.trim().length > 0 &&
    typeof row.slug === "string" &&
    row.slug.trim().length > 0 &&
    typeof row.name === "string" &&
    typeof row.countryCode === "string" &&
    typeof row.createdAt === "string"
  );
}

export function savePendingOnboardDraft(
  draft: Omit<PendingOnboardDraft, "createdAt"> & { createdAt?: string },
): void {
  if (typeof window === "undefined") {
    return;
  }
  const next: PendingOnboardDraft = {
    tenantId: draft.tenantId.trim(),
    slug: draft.slug.trim().toLowerCase(),
    name: draft.name.trim(),
    countryCode: draft.countryCode.trim().toUpperCase() || "KE",
    createdAt: draft.createdAt ?? new Date().toISOString(),
  };
  if (!next.tenantId || !next.slug) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export function readPendingOnboardDraft(): PendingOnboardDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isDraft(parsed)) {
      clearPendingOnboardDraft();
      return null;
    }
    const created = Date.parse(parsed.createdAt);
    if (
      Number.isFinite(created) &&
      Date.now() - created > MAX_AGE_MS
    ) {
      clearPendingOnboardDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingOnboardDraft(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
