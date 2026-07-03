"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchBranches,
  fetchBusiness,
  fetchItemTypes,
  fetchMe,
  type BranchRecord,
  type BusinessRecord,
  type ItemTypeRecord,
  type MeResponse,
} from "@/lib/api";
import { persistTenantHostAfterAuth } from "@/lib/auth";
import { isBranchLockedRole } from "@/lib/branch-access";
import { confirmScopeChange } from "@/lib/scope-change-guard";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  writeSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { toast } from "sonner";

const SELECTED_BRANCH_PREFIX = "palmart:selectedBranch:v1:";
const SELECTED_ITEM_TYPE_PREFIX = "palmart:selectedItemType:v1:";

function selectedBranchKey(businessId: string | undefined | null): string {
  return `${SELECTED_BRANCH_PREFIX}${businessId?.trim() || "default"}`;
}

function readPersistedBranch(
  businessId: string | undefined | null,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(selectedBranchKey(businessId));
  } catch {
    return null;
  }
}

function selectedItemTypeKey(businessId: string | undefined | null): string {
  return `${SELECTED_ITEM_TYPE_PREFIX}${businessId?.trim() || "default"}`;
}

function readPersistedItemType(
  businessId: string | undefined | null,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(selectedItemTypeKey(businessId));
  } catch {
    return null;
  }
}

function writePersistedItemType(
  businessId: string | undefined | null,
  itemTypeId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    // Empty string means "All departments" (D1); always persist so refresh keeps the choice.
    window.localStorage.setItem(selectedItemTypeKey(businessId), itemTypeId);
  } catch {
    /* ignore */
  }
}

function writePersistedBranch(
  businessId: string | undefined | null,
  branchId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    if (branchId) {
      window.localStorage.setItem(selectedBranchKey(businessId), branchId);
    } else {
      window.localStorage.removeItem(selectedBranchKey(businessId));
    }
  } catch {
    /* ignore */
  }
}

type DashboardContextValue = {
  me: MeResponse | null;
  business: BusinessRecord | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  branches: BranchRecord[];
  branchId: string;
  setBranchId: (id: string) => void;
  branchesLoading: boolean;
  refreshBranches: () => Promise<void>;
  itemTypes: ItemTypeRecord[];
  itemTypeId: string;
  setItemTypeId: (id: string) => void;
  itemTypesLoading: boolean;
  refreshItemTypes: () => Promise<void>;
  canListUsers: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canManageBusinessSettings: boolean;
  canViewPurchasingIntelligence: boolean;
  canPathBRead: boolean;
  canPathBWrite: boolean;
  canPathARead: boolean;
  canPathAWrite: boolean;
  canViewApAging: boolean;
  canViewCustomers: boolean;
  canManageCustomers: boolean;
  canManageCreditSettings: boolean;
  canViewSuppliers: boolean;
  canRecordSupplierPayment: boolean;
  canViewInventoryValuation: boolean;
  canViewInventoryTransfers: boolean;
  canViewStockTake: boolean;
  canViewSupplyBatches: boolean;
  canViewPricing: boolean;
  canViewShifts: boolean;
  canViewAnalytics: boolean;
  canViewSalesIntelligence: boolean;
  canViewStorefrontOrders: boolean;
  canQuickSale: boolean;
  canAccessGrocery: boolean;
  canManageImports: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  defaultAllDepartments = false,
}: {
  children: React.ReactNode;
  /** When true (cashier POS), the header department defaults to "All departments". */
  defaultAllDepartments?: boolean;
}) {
  const bootstrap = useSessionBootstrapSnapshot();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchIdState] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [itemTypeId, setItemTypeIdState] = useState("");
  const [itemTypesLoading, setItemTypesLoading] = useState(false);
  const userTouchedBranchRef = useRef(false);
  const userTouchedItemTypeRef = useRef(false);
  const staleBranchNoticeShownRef = useRef(false);
  const staleItemTypeNoticeShownRef = useRef(false);
  /** Guards against double-fetch when bootstrap seeds state then triggers a re-run. */
  const sessionFetchedRef = useRef(false);

  const refreshSession = useCallback(async () => {
    const [meData, biz] = await Promise.all([fetchMe(), fetchBusiness()]);
    setMe(meData);
    setBusiness(biz);
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me, meData);
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business, biz);
    if (biz?.slug?.trim()) {
      persistTenantHostAfterAuth(biz.slug, biz.primaryDomain);
    }
  }, []);

  const effectiveMe = me ?? bootstrap.me;
  const effectiveBusiness = business ?? bootstrap.business;
  const effectiveBranches = branches.length > 0 ? branches : bootstrap.branches;
  const effectiveBranchId = branchId || bootstrap.me?.branchId?.trim() || "";
  const effectiveLoading = loading && !bootstrap.me && !bootstrap.business;

  const refreshBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const list = await fetchBranches();
      setBranches(list.filter((b) => b.active));
    } catch {
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const roleKey = effectiveMe?.role?.key?.trim().toLowerCase();
  const isGroceryClerk = roleKey === "grocery_clerk";
  const assignedItemTypeIds = useMemo(() => {
    const ids = effectiveMe?.itemTypeIds ?? [];
    return new Set(
      ids
        .map((id) => id?.trim())
        .filter((id): id is string => !!id && id.length > 0),
    );
  }, [effectiveMe?.itemTypeIds]);

  const refreshItemTypes = useCallback(async () => {
    setItemTypesLoading(true);
    try {
      const list = await fetchItemTypes();
      let visible = list.filter((t) => t.active);
      // When the backend assigns specific department(s) to a user (any role),
      // filter the visible list to only those departments. A user with no
      // assignments who is NOT a grocery clerk sees everything; a grocery
      // clerk with no assignments sees nothing (admin must assign at least one).
      if (assignedItemTypeIds.size > 0) {
        visible = visible.filter((t) => assignedItemTypeIds.has(t.id));
      } else if (isGroceryClerk) {
        visible = [];
      }
      setItemTypes(visible);
    } catch {
      setItemTypes([]);
    } finally {
      setItemTypesLoading(false);
    }
  }, [isGroceryClerk, assignedItemTypeIds]);

  // ── Stock managers, cashiers and grocery clerks are locked to their assigned branch ─────
  const branchLockedRole = isBranchLockedRole(roleKey);

  const setBranchId = useCallback(
    (id: string) => {
      if (branchLockedRole) {
        return; // branch switching disabled for stock managers and cashiers
      }
      const next = id.trim();
      const current = branchId.trim();
      if (next === current) return;
      if (!confirmScopeChange("branch")) return;
      userTouchedBranchRef.current = true;
      setBranchIdState(next);
      writePersistedBranch(effectiveBusiness?.id ?? null, next);
    },
    [effectiveBusiness?.id, branchLockedRole, branchId],
  );

  const setItemTypeId = useCallback(
    (id: string) => {
      const next = id.trim();
      const current = itemTypeId.trim();
      if (next === current) return;
      if (!confirmScopeChange("department")) return;
      userTouchedItemTypeRef.current = true;
      setItemTypeIdState(next);
      writePersistedItemType(effectiveBusiness?.id ?? null, next);
    },
    [effectiveBusiness?.id, itemTypeId],
  );

  useEffect(() => {
    if (sessionFetchedRef.current) return;
    sessionFetchedRef.current = true;

    // Bootstrap data was prefetched server-side during login (or set by a
    // sibling DashboardProvider on a previous route). Seed state immediately
    // so the UI never shows a loading skeleton on intra-app navigation.
    const hasFullBootstrap = Boolean(bootstrap.me && bootstrap.business);
    if (hasFullBootstrap) {
      setMe(bootstrap.me!);
      setBusiness(bootstrap.business!);
      setLoading(false);
    }

    // Always fetch fresh data so role / permission changes are reflected.
    // When bootstrap already seeded the UI we do this in the background —
    // a transient failure here does NOT put us back into a loading state.
    refreshSession()
      .catch(() => {
        if (!bootstrap.me) setMe(null);
        if (!bootstrap.business) setBusiness(null);
      })
      .finally(() => {
        if (!hasFullBootstrap) {
          setLoading(false);
        }
      });
  }, [refreshSession, bootstrap.me, bootstrap.business]);

  const canQuickSale = hasPermission(
    effectiveMe?.permissions,
    Permission.SalesSell,
  );
  const canAccessGrocery = hasPermission(
    effectiveMe?.permissions,
    Permission.GroceryInvoicesRead,
  );

  useEffect(() => {
    if (!effectiveMe) return;

    void refreshBranches();
    void refreshItemTypes();
  }, [effectiveMe, refreshBranches, refreshItemTypes]);

  // ── seed branchId ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (branchLockedRole) {
      const assigned = effectiveMe?.branchId?.trim();
      if (assigned && assigned !== effectiveBranchId) {
        if (
          effectiveBranches.length === 0 ||
          effectiveBranches.some((b) => b.id === assigned)
        ) {
          setBranchIdState(assigned);
          return;
        }
      }
      if (!effectiveBranchId && effectiveBranches[0]?.id) {
        setBranchIdState(effectiveBranches[0].id);
      }
      return;
    }

    if (effectiveBranches.length === 0) {
      return;
    }

    if (userTouchedBranchRef.current) {
      if (
        effectiveBranchId &&
        effectiveBranches.some((b) => b.id === effectiveBranchId)
      ) {
        return;
      }
    }
    const persisted = readPersistedBranch(effectiveBusiness?.id ?? null);
    const currentBranchInvalid =
      Boolean(effectiveBranchId?.trim()) &&
      !effectiveBranches.some((b) => b.id === effectiveBranchId);
    const persistedBranchInvalid =
      Boolean(persisted?.trim()) &&
      !effectiveBranches.some((b) => b.id === persisted!.trim());
    const candidates = [
      persisted,
      effectiveMe?.branchId,
      effectiveBranches[0]?.id,
    ];
    for (const candidate of candidates) {
      const id = candidate?.trim();
      if (id && effectiveBranches.some((b) => b.id === id)) {
        if (id !== effectiveBranchId) {
          if (persistedBranchInvalid || currentBranchInvalid) {
            if (!staleBranchNoticeShownRef.current) {
              staleBranchNoticeShownRef.current = true;
              const name =
                effectiveBranches.find((b) => b.id === id)?.name?.trim() ??
                "another branch";
              toast.info("Branch selection updated", {
                description: `Your previous branch is no longer available. Switched to ${name}.`,
              });
            }
            writePersistedBranch(effectiveBusiness?.id ?? null, id);
          }
          setBranchIdState(id);
        }
        return;
      }
    }
  }, [
    effectiveBranches,
    effectiveBusiness?.id,
    effectiveMe?.branchId,
    effectiveBranchId,
    branchLockedRole,
  ]);

  // ── seed itemTypeId ───────────────────────────────────────────────────────
  useEffect(() => {
    if (itemTypes.length === 0) return;
    if (defaultAllDepartments && !userTouchedItemTypeRef.current) {
      if (itemTypeId !== "") setItemTypeIdState("");
      return;
    }
    if (userTouchedItemTypeRef.current) {
      if (!itemTypeId) return;
      if (itemTypes.some((t) => t.id === itemTypeId)) return;
    }
    const persisted = readPersistedItemType(effectiveBusiness?.id ?? null);
    const currentTypeInvalid =
      Boolean(itemTypeId?.trim()) &&
      !itemTypes.some((t) => t.id === itemTypeId);
    const persistedTypeInvalid =
      persisted !== null &&
      persisted !== "" &&
      !itemTypes.some((t) => t.id === persisted);
    if (persisted !== null) {
      if (persisted === "") {
        if (itemTypeId !== "") setItemTypeIdState("");
        return;
      }
      if (itemTypes.some((t) => t.id === persisted)) {
        if (persisted !== itemTypeId) setItemTypeIdState(persisted);
        return;
      }
    }
    const defaultType = itemTypes.find((t) => t.isDefault);
    const fallback = defaultType?.id ?? itemTypes[0]?.id ?? "";
    if (fallback && fallback !== itemTypeId) {
      if (persistedTypeInvalid || currentTypeInvalid) {
        if (!staleItemTypeNoticeShownRef.current) {
          staleItemTypeNoticeShownRef.current = true;
          const label =
            itemTypes.find((t) => t.id === fallback)?.label?.trim() ??
            "default department";
          toast.info("Department selection updated", {
            description: `Your previous department is no longer available. Switched to ${label}.`,
          });
        }
        writePersistedItemType(effectiveBusiness?.id ?? null, fallback);
      }
      setItemTypeIdState(fallback);
    }
  }, [itemTypes, effectiveBusiness?.id, itemTypeId, defaultAllDepartments]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      me: effectiveMe,
      business: effectiveBusiness,
      loading: effectiveLoading,
      refreshSession,
      branches: effectiveBranches,
      branchId: effectiveBranchId,
      setBranchId,
      branchesLoading,
      refreshBranches,
      itemTypes,
      itemTypeId,
      setItemTypeId,
      itemTypesLoading,
      refreshItemTypes,
      canListUsers: hasPermission(
        effectiveMe?.permissions,
        Permission.UsersList,
      ),
      canViewCategories: hasPermission(
        effectiveMe?.permissions,
        Permission.CatalogItemsRead,
      ),
      canManageCategories: hasPermission(
        effectiveMe?.permissions,
        Permission.CatalogCategoriesWrite,
      ),
      canManageBusinessSettings: hasPermission(
        effectiveMe?.permissions,
        Permission.BusinessManageSettings,
      ),
      canViewPurchasingIntelligence: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingIntelligenceRead,
      ),
      canPathBRead: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingPathBRead,
      ),
      canPathBWrite: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingPathBWrite,
      ),
      canPathARead: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingPathARead,
      ),
      canPathAWrite: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingPathAWrite,
      ),
      canViewApAging: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingPaymentRead,
      ),
      canViewSuppliers: hasPermission(
        effectiveMe?.permissions,
        Permission.SuppliersRead,
      ),
      canViewCustomers: hasPermission(
        effectiveMe?.permissions,
        Permission.CreditsCustomersRead,
      ),
      canManageCustomers: hasPermission(
        effectiveMe?.permissions,
        Permission.CreditsCustomersWrite,
      ),
      canManageCreditSettings: hasPermission(
        effectiveMe?.permissions,
        Permission.CreditsSettingsWrite,
      ),
      canRecordSupplierPayment: hasPermission(
        effectiveMe?.permissions,
        Permission.PurchasingPaymentWrite,
      ),
      canViewInventoryValuation: hasPermission(
        effectiveMe?.permissions,
        Permission.InventoryRead,
      ),
      canViewInventoryTransfers: hasPermission(
        effectiveMe?.permissions,
        Permission.InventoryTransfer,
      ),
      canViewSupplyBatches: hasPermission(
        effectiveMe?.permissions,
        Permission.InventoryRead,
      ),
      canViewStockTake:
        hasPermission(effectiveMe?.permissions, Permission.StocktakeRead) ||
        hasPermission(effectiveMe?.permissions, Permission.StocktakeRun) ||
        hasPermission(effectiveMe?.permissions, Permission.StocktakeApprove),
      canViewPricing:
        hasPermission(effectiveMe?.permissions, Permission.PricingRead) ||
        hasPermission(
          effectiveMe?.permissions,
          Permission.PricingSellPriceSet,
        ) ||
        hasPermission(effectiveMe?.permissions, Permission.PricingRulesManage),
      canViewShifts:
        hasPermission(effectiveMe?.permissions, Permission.ShiftsOpen) ||
        hasPermission(effectiveMe?.permissions, Permission.ShiftsClose) ||
        hasPermission(effectiveMe?.permissions, Permission.ShiftsRead),
      canViewAnalytics: hasPermission(
        effectiveMe?.permissions,
        Permission.SalesIntelligenceRead,
      ),
      canViewSalesIntelligence: hasPermission(
        effectiveMe?.permissions,
        Permission.SalesIntelligenceRead,
      ),
      canViewStorefrontOrders: hasPermission(
        effectiveMe?.permissions,
        Permission.StorefrontOrdersRead,
      ),
      canQuickSale,
      canAccessGrocery,
      canManageImports: hasPermission(
        effectiveMe?.permissions,
        Permission.IntegrationsImportsManage,
      ),
    }),
    [
      effectiveMe,
      effectiveBusiness,
      effectiveLoading,
      refreshSession,
      effectiveBranches,
      effectiveBranchId,
      setBranchId,
      branchesLoading,
      refreshBranches,
      itemTypes,
      itemTypeId,
      setItemTypeId,
      itemTypesLoading,
      refreshItemTypes,
      canQuickSale,
      canAccessGrocery,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return ctx;
}

/** Same session as {@link useDashboard}, or null outside {@link DashboardProvider}. */
export function useOptionalDashboard(): DashboardContextValue | null {
  return useContext(DashboardContext);
}
