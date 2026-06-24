"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchDesktopLicenseStatus,
  type DesktopLicenseStatus,
} from "@/lib/desktop-api";
import { setDesktopLicenseReadOnly } from "@/lib/desktop-license-gate";
import { IS_DESKTOP } from "@/lib/runtime";

type DesktopLicenseContextValue = {
  status: DesktopLicenseStatus | null;
  readOnly: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const DesktopLicenseContext = createContext<DesktopLicenseContextValue | null>(
  null,
);

export function DesktopLicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DesktopLicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!IS_DESKTOP) {
      setStatus(null);
      setDesktopLicenseReadOnly(false);
      setLoading(false);
      return;
    }
    try {
      const next = await fetchDesktopLicenseStatus();
      setStatus(next);
      setDesktopLicenseReadOnly(next.readOnly);
    } catch {
      setStatus(null);
      setDesktopLicenseReadOnly(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!IS_DESKTOP) return;
    const id = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      readOnly: Boolean(status?.readOnly),
      loading,
      refresh,
    }),
    [status, loading, refresh],
  );

  return (
    <DesktopLicenseContext.Provider value={value}>
      {children}
    </DesktopLicenseContext.Provider>
  );
}

export function useDesktopLicense(): DesktopLicenseContextValue {
  const ctx = useContext(DesktopLicenseContext);
  if (!ctx) {
    return {
      status: null,
      readOnly: false,
      loading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
