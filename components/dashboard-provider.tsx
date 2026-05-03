"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchBusiness,
  fetchMe,
  type BusinessRecord,
  type MeResponse,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

type DashboardContextValue = {
  me: MeResponse | null;
  business: BusinessRecord | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  canListUsers: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canManageBusinessSettings: boolean;
  canViewPurchasingIntelligence: boolean;
  canViewApAging: boolean;
  canViewSuppliers: boolean;
  canRecordSupplierPayment: boolean;
  canViewInventoryValuation: boolean;
  canViewInventoryTransfers: boolean;
  canViewStockTake: boolean;
  canViewPricing: boolean;
  canViewShifts: boolean;
  canQuickSale: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const [meData, biz] = await Promise.all([fetchMe(), fetchBusiness()]);
    setMe(meData);
    setBusiness(biz);
  }, []);

  useEffect(() => {
    refreshSession()
      .catch(() => {
        setMe(null);
        setBusiness(null);
      })
      .finally(() => setLoading(false));
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      me,
      business,
      loading,
      refreshSession,
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
      canViewApAging: hasPermission(me?.permissions, Permission.PurchasingPaymentRead),
      canViewSuppliers: hasPermission(me?.permissions, Permission.SuppliersRead),
      canRecordSupplierPayment: hasPermission(me?.permissions, Permission.PurchasingPaymentWrite),
      canViewInventoryValuation: hasPermission(me?.permissions, Permission.InventoryRead),
      canViewInventoryTransfers: hasPermission(me?.permissions, Permission.InventoryTransfer),
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
      canQuickSale: hasPermission(me?.permissions, Permission.SalesSell),
    }),
    [me, business, loading, refreshSession],
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
