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
  canManageBusinessSettings: boolean;
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
      canManageBusinessSettings: hasPermission(
        me?.permissions,
        Permission.BusinessManageSettings,
      ),
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
