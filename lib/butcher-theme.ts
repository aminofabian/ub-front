export type ButcherTheme = "light" | "dark";

export const BUTCHER_THEME_STORAGE_KEY = "ub.butcherTheme";

export function readButcherTheme(): ButcherTheme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(BUTCHER_THEME_STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function persistButcherTheme(theme: ButcherTheme): void {
  localStorage.setItem(BUTCHER_THEME_STORAGE_KEY, theme);
}
