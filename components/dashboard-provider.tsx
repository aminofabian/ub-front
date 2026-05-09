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
  fetchMe,
  type BranchRecord,
  type BusinessRecord,
  type MeResponse,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

const SELECTED_BRANCH_PREFIX = "palmart:selectedBranch:v1:";

function selectedBranchKey(businessId: string | undefined | null): string {
  return `${SELECTED_BRANCH_PREFIX}${businessId?.trim() || "default"}`;
}

function readPersistedBranch(businessId: string | undefined | null): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(selectedBranchKey(businessId));
  } catch {
    return null;
  }
}

function writePersistedBranch(
  businessId: string | undefined | null,
  branchId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (branchId) {
      window.localStorage.setItem(selectedBranchKey(businessId), branchId);
    } else {
      window.localStorage.removeItem(selectedBranchKey(businessId));
    }
  } catch {
    // ignore
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
  canListUsers: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canManageBusinessSettings: boolean;
  canViewPurchasingIntelligence: boolean;
  canPathBRead: boolean;
  canPathBWrite: boolean;
  canViewApAging: boolean;
  canViewCustomers: boolean;
  canManageCustomers: boolean;
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
  canManageImports: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchIdState] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const userTouchedBranchRef = useRef(false);

  const refreshSession = useCallback(async () => {
    const [meData, biz] = await Promise.all([fetchMe(), fetchBusiness()]);
    setMe(meData);
    setBusiness(biz);
  }, []);

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

  const setBranchId = useCallback(
    (id: string) => {
      userTouchedBranchRef.current = true;
      setBranchIdState(id);
      writePersistedBranch(business?.id ?? null, id);
    },
    [business?.id],
  );

  useEffect(() => {
    refreshSession()
      .catch(() => {
        setMe(null);
        setBusiness(null);
      })
      .finally(() => setLoading(false));
  }, [refreshSession]);

  const canQuickSale = hasPermission(me?.permissions, Permission.SalesSell);

  useEffect(() => {
    if (!me) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot remote fetch on auth.
    void refreshBranches();
  }, [me, refreshBranches]);

  useEffect(() => {
    if (branches.length === 0) {
      return;
    }
    if (userTouchedBranchRef.current) {
      if (branchId && branches.some((b) => b.id === branchId)) {
        return;
      }
    }
    const persisted = readPersistedBranch(business?.id ?? null);
    const candidates = [persisted, me?.branchId, branches[0]?.id];
    for (const candidate of candidates) {
      const id = candidate?.trim();
      if (id && branches.some((b) => b.id === id)) {
        if (id !== branchId) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs persisted/user default into selection.
          setBranchIdState(id);
        }
        return;
      }
    }
  }, [branches, business?.id, me?.branchId, branchId]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      me,
      business,
      loading,
      refreshSession,
      branches,
      branchId,
      setBranchId,
      branchesLoading,
      refreshBranches,
      canListUsers: hasPermission(me?.permissions, Permission.UsersList),
      canViewCategories: hasPermission(me?.permissions, Permission.CatalogItemsRead),
      canManageCategories: hasPermission(
        me?.permissions,
        Permission.CatalogCategoriesWrite,
      ),
      canManageBusinessSettings: hasPermission(
        me?.permissions,
        Permission.BusinessManageSettings,
      ),
      canViewPurchasingIntelligence: hasPermission(
        me?.permissions,
        Permission.PurchasingIntelligenceRead,
      ),
      canPathBRead: hasPermission(me?.permissions, Permission.PurchasingPathBRead),
      canPathBWrite: hasPermission(me?.permissions, Permission.PurchasingPathBWrite),
      canViewApAging: hasPermission(me?.permissions, Permission.PurchasingPaymentRead),
      canViewSuppliers: hasPermission(me?.permissions, Permission.SuppliersRead),
      canViewCustomers: hasPermission(me?.permissions, Permission.CreditsCustomersRead),
      canManageCustomers: hasPermission(me?.permissions, Permission.CreditsCustomersWrite),
      canRecordSupplierPayment: hasPermission(me?.permissions, Permission.PurchasingPaymentWrite),
      canViewInventoryValuation: hasPermission(me?.permissions, Permission.InventoryRead),
      canViewInventoryTransfers: hasPermission(me?.permissions, Permission.InventoryTransfer),
      canViewSupplyBatches: hasPermission(me?.permissions, Permission.InventoryRead),
      canViewStockTake:
        hasPermission(me?.permissions, Permission.StocktakeRead) ||
        hasPermission(me?.permissions, Permission.StocktakeRun) ||
        hasPermission(me?.permissions, Permission.StocktakeApprove),
      canViewPricing:
        hasPermission(me?.permissions, Permission.PricingRead) ||
        hasPermission(me?.permissions, Permission.PricingSellPriceSet) ||
        hasPermission(me?.permissions, Permission.PricingRulesManage),
      canViewShifts:
        hasPermission(me?.permissions, Permission.ShiftsOpen) ||
        hasPermission(me?.permissions, Permission.ShiftsClose) ||
        hasPermission(me?.permissions, Permission.ShiftsRead),
      canViewAnalytics: hasPermission(me?.permissions, Permission.SalesIntelligenceRead),
      canViewSalesIntelligence: hasPermission(
        me?.permissions,
        Permission.SalesIntelligenceRead,
      ),
      canViewStorefrontOrders: hasPermission(me?.permissions, Permission.StorefrontOrdersRead),
      canQuickSale,
      canManageImports: hasPermission(me?.permissions, Permission.IntegrationsImportsManage),
    }),
    [
      me,
      business,
      loading,
      refreshSession,
      branches,
      branchId,
      setBranchId,
      branchesLoading,
      refreshBranches,
      canQuickSale,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
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
