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
  persistButcherTheme,
  readButcherTheme,
  type ButcherTheme,
} from "@/lib/butcher-theme";
import { cn } from "@/lib/utils";

type ButcherThemeContextValue = {
  theme: ButcherTheme;
  isDark: boolean;
  toggleTheme: () => void;
  dialogSurfaceClass: string;
};

const ButcherThemeContext = createContext<ButcherThemeContextValue | null>(null);

type ButcherThemeProviderProps = {
  children: ReactNode;
};

export function ButcherThemeProvider({ children }: ButcherThemeProviderProps) {
  const [theme, setTheme] = useState<ButcherTheme>("dark");

  useEffect(() => {
    setTheme(readButcherTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: ButcherTheme = current === "dark" ? "light" : "dark";
      persistButcherTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      toggleTheme,
      dialogSurfaceClass: cn(
        "butcher-pos-dialog bg-[rgb(var(--bp-bg))] text-[rgb(var(--bp-fg))]",
        theme === "dark" && "dark",
      ),
    }),
    [theme, toggleTheme],
  );

  return (
    <ButcherThemeContext.Provider value={value}>
      {children}
    </ButcherThemeContext.Provider>
  );
}

export function useButcherTheme(): ButcherThemeContextValue {
  const ctx = useContext(ButcherThemeContext);
  if (!ctx) {
    throw new Error("useButcherTheme must be used within ButcherThemeProvider");
  }
  return ctx;
}
