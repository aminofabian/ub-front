import type { BusinessRecord } from "@/lib/api";
import { POS_DRAFT_FLAGS } from "@/lib/pos-draft-api";
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
  allowStockEditForStockManager: boolean;
  allowStockEditForGroceryClerk: boolean;
  allowNegativeStock: boolean;
};

export type PosDraftsForm = {
  enabled: boolean;
  uiVisible: boolean;
  shadowWrites: boolean;
  offlineMirror: boolean;
};

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

export const DEFAULT_INVENTORY: InventoryForm = {
  showSystemStockToStockManager: false,
  allowStockEditForStockManager: false,
  allowStockEditForGroceryClerk: false,
  allowNegativeStock: false,
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

export function inventoryFromRecord(b: BusinessRecord | null): InventoryForm {
  return {
    showSystemStockToStockManager: Boolean(
      b?.inventory?.stocktake?.showSystemStockToStockManager,
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
  };
}
