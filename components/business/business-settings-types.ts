import type { BusinessRecord } from "@/lib/api";
import { POS_DRAFT_FLAGS } from "@/lib/pos-draft-api";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { SHIFT_SETTINGS_FLAGS } from "@/lib/shift-settings";
import type { BranchRecord } from "@/lib/api";

export const MAX_FEATURED = 12;

export const TIER_SUGGESTIONS = ["starter", "growth", "enterprise"] as const;

export type EditableBusiness = {
  name: string;
  subscriptionTier: string;
  active: boolean;
};

export type StorefrontForm = {
  enabled: boolean;
  catalogBranchId: string;
  label: string;
  announcement: string;
  featuredLines: string;
};

export type InventoryForm = {
  showSystemStockToStockManager: boolean;
  dailyAuditSampleSize: number;
  morningStartsAt: string;
  morningEndsAt: string;
  eveningStartsAt: string;
  eveningEndsAt: string;
  allowStockEditForStockManager: boolean;
  allowStockEditForGroceryClerk: boolean;
  allowNegativeStock: boolean;
  allowSupplierWriteForStockManager: boolean;
  allowSupplierWriteForCashier: boolean;
  allowLinkProductsForStockManager: boolean;
  allowLinkProductsForCashier: boolean;
  allowReceiveForCashier: boolean;
  allowReceiveForStockManager: boolean;
  allowCashierTabClearance: boolean;
};

export type PosDraftsForm = {
  enabled: boolean;
  uiVisible: boolean;
  shadowWrites: boolean;
  offlineMirror: boolean;
};

export type CashierCapabilitiesForm = {
  priceEdit: boolean;
  createProduct: boolean;
  weighedToggle: boolean;
  addPhoto: boolean;
};

export type ShiftSettingsForm = {
  prefillOpeningFromLastClose: boolean;
};

export const DEFAULT_CASHIER_CAPABILITIES: CashierCapabilitiesForm = {
  priceEdit: false,
  createProduct: false,
  /** Default on — cashiers need this for produce/kg sales; admin can still disable. */
  weighedToggle: true,
  addPhoto: false,
};

export const DEFAULT_SHIFT_SETTINGS: ShiftSettingsForm = {
  prefillOpeningFromLastClose: false,
};

export function cashierCapabilitiesFromRecord(
  b: BusinessRecord | null,
): CashierCapabilitiesForm {
  const ff = b?.featureFlags ?? {};
  return {
    priceEdit: ff[POS_CASHIER_CAPABILITY_FLAGS.priceEdit] === true,
    createProduct: ff[POS_CASHIER_CAPABILITY_FLAGS.createProduct] === true,
    // Absent flag → enabled (matches DEFAULT_CASHIER_CAPABILITIES).
    weighedToggle: ff[POS_CASHIER_CAPABILITY_FLAGS.weighedToggle] !== false,
    addPhoto: ff[POS_CASHIER_CAPABILITY_FLAGS.addPhoto] === true,
  };
}

export function shiftSettingsFromRecord(
  b: BusinessRecord | null,
): ShiftSettingsForm {
  const ff = b?.featureFlags ?? {};
  return {
    prefillOpeningFromLastClose:
      ff[SHIFT_SETTINGS_FLAGS.prefillOpeningFromLastClose] === true,
  };
}

export const DEFAULT_EDITABLE: EditableBusiness = {
  name: "",
  subscriptionTier: "starter",
  active: true,
};

export const DEFAULT_STOREFRONT: StorefrontForm = {
  enabled: false,
  catalogBranchId: "",
  label: "",
  announcement: "",
  featuredLines: "",
};

export const DEFAULT_DAILY_AUDIT_SAMPLE_SIZE = 25;
export const MIN_DAILY_AUDIT_SAMPLE_SIZE = 1;
export const MAX_DAILY_AUDIT_SAMPLE_SIZE = 200;

export const DEFAULT_MORNING_STARTS_AT = "08:00";
export const DEFAULT_MORNING_ENDS_AT = "09:00";
export const DEFAULT_EVENING_STARTS_AT = "20:00";
export const DEFAULT_EVENING_ENDS_AT = "21:00";

export const DEFAULT_INVENTORY: InventoryForm = {
  showSystemStockToStockManager: false,
  dailyAuditSampleSize: DEFAULT_DAILY_AUDIT_SAMPLE_SIZE,
  morningStartsAt: DEFAULT_MORNING_STARTS_AT,
  morningEndsAt: DEFAULT_MORNING_ENDS_AT,
  eveningStartsAt: DEFAULT_EVENING_STARTS_AT,
  eveningEndsAt: DEFAULT_EVENING_ENDS_AT,
  allowStockEditForStockManager: false,
  allowStockEditForGroceryClerk: false,
  allowNegativeStock: false,
  allowSupplierWriteForStockManager: false,
  allowSupplierWriteForCashier: false,
  allowLinkProductsForStockManager: false,
  allowLinkProductsForCashier: false,
  /** Match backend: receive stock defaults on for cashier / stock manager. */
  allowReceiveForCashier: true,
  allowReceiveForStockManager: true,
  /** Match backend: cashier tab clearance defaults off. */
  allowCashierTabClearance: false,
};

export const DEFAULT_POS_DRAFTS: PosDraftsForm = {
  enabled: false,
  uiVisible: false,
  shadowWrites: false,
  offlineMirror: false,
};

export function parseFeaturedLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_FEATURED);
}

export function posDraftsFromRecord(b: BusinessRecord | null): PosDraftsForm {
  const ff = b?.featureFlags ?? {};
  return {
    enabled: ff[POS_DRAFT_FLAGS.enabled] === true,
    uiVisible: ff[POS_DRAFT_FLAGS.uiVisible] === true,
    shadowWrites: ff[POS_DRAFT_FLAGS.shadowWrites] === true,
    offlineMirror: ff[POS_DRAFT_FLAGS.offlineMirror] === true,
  };
}

export function defaultCatalogBranchId(
  branches: BranchRecord[],
  currentId: string,
): string {
  if (currentId.trim()) {
    return currentId.trim();
  }
  const active = branches.filter((b) => b.active);
  const pool = active.length > 0 ? active : branches;
  return pool[0]?.id ?? "";
}

export function storefrontFromRecord(
  b: BusinessRecord | null,
  branches: BranchRecord[] = [],
): StorefrontForm {
  const s = b?.storefront;
  const catalogBranchId = defaultCatalogBranchId(
    branches,
    String(s?.catalogBranchId ?? "").trim(),
  );
  return {
    enabled: Boolean(s?.enabled),
    catalogBranchId,
    label: String(s?.label ?? ""),
    announcement: String(s?.announcement ?? ""),
    featuredLines: (s?.featuredItemIds ?? []).join("\n"),
  };
}

export function clampDailyAuditSampleSize(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_DAILY_AUDIT_SAMPLE_SIZE;
  }
  return Math.max(
    MIN_DAILY_AUDIT_SAMPLE_SIZE,
    Math.min(MAX_DAILY_AUDIT_SAMPLE_SIZE, Math.round(raw)),
  );
}

/** Normalize to HH:mm; invalid/blank → fallback. */
export function normalizeDailyAuditTime(
  raw: string | null | undefined,
  fallback: string,
): string {
  const value = (raw ?? "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) {
    return fallback;
  }
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallback;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isDailyAuditScheduleOrdered(
  morningStartsAt: string,
  morningEndsAt: string,
  eveningStartsAt: string,
  eveningEndsAt: string,
): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    toMinutes(morningStartsAt) < toMinutes(morningEndsAt) &&
    toMinutes(morningEndsAt) <= toMinutes(eveningStartsAt) &&
    toMinutes(eveningStartsAt) < toMinutes(eveningEndsAt)
  );
}

export function inventoryFromRecord(b: BusinessRecord | null): InventoryForm {
  const configuredSample = b?.inventory?.stocktake?.dailyAuditSampleSize;
  return {
    showSystemStockToStockManager: Boolean(
      b?.inventory?.stocktake?.showSystemStockToStockManager,
    ),
    dailyAuditSampleSize: clampDailyAuditSampleSize(
      typeof configuredSample === "number"
        ? configuredSample
        : DEFAULT_DAILY_AUDIT_SAMPLE_SIZE,
    ),
    morningStartsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.morningStartsAt,
      DEFAULT_MORNING_STARTS_AT,
    ),
    morningEndsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.morningEndsAt ??
        b?.inventory?.stocktake?.eveningStartsAt,
      DEFAULT_MORNING_ENDS_AT,
    ),
    eveningStartsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.eveningStartsAt,
      DEFAULT_EVENING_STARTS_AT,
    ),
    eveningEndsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.eveningEndsAt ??
        b?.inventory?.stocktake?.countingEndsAt,
      DEFAULT_EVENING_ENDS_AT,
    ),
    allowStockEditForStockManager: Boolean(
      b?.inventory?.stockLevels?.allowStockEditForStockManager,
    ),
    allowStockEditForGroceryClerk: Boolean(
      b?.inventory?.stockLevels?.allowStockEditForGroceryClerk,
    ),
    allowNegativeStock: Boolean(
      b?.inventory?.stockLevels?.allowNegativeStock,
    ),
    allowSupplierWriteForStockManager: Boolean(
      b?.inventory?.suppliers?.allowSupplierWriteForStockManager,
    ),
    allowSupplierWriteForCashier: Boolean(
      b?.inventory?.suppliers?.allowSupplierWriteForCashier,
    ),
    allowLinkProductsForStockManager: Boolean(
      b?.inventory?.suppliers?.allowLinkProductsForStockManager,
    ),
    allowLinkProductsForCashier: Boolean(
      b?.inventory?.suppliers?.allowLinkProductsForCashier,
    ),
    allowReceiveForCashier:
      b?.inventory?.receiveStock?.allowReceiveForCashier !== false,
    allowReceiveForStockManager:
      b?.inventory?.receiveStock?.allowReceiveForStockManager !== false,
    allowCashierTabClearance: Boolean(
      b?.inventory?.creditTabs?.allowCashierTabClearance,
    ),
  };
}

export function applyBusinessSnapshot(
  payload: BusinessRecord,
  branchList: BranchRecord[],
): {
  editable: EditableBusiness;
  storefront: StorefrontForm;
  inventory: InventoryForm;
  posDrafts: PosDraftsForm;
  cashierCapabilities: CashierCapabilitiesForm;
  shiftSettings: ShiftSettingsForm;
} {
  return {
    editable: {
      name: String(payload.name ?? ""),
      subscriptionTier: String(payload.subscriptionTier ?? "starter"),
      active: Boolean(payload.active ?? true),
    },
    storefront: storefrontFromRecord(payload, branchList),
    inventory: inventoryFromRecord(payload),
    posDrafts: posDraftsFromRecord(payload),
    cashierCapabilities: cashierCapabilitiesFromRecord(payload),
    shiftSettings: shiftSettingsFromRecord(payload),
  };
}
