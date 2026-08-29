/** Client-only: true when the active storefront shell uses this theme id. */
export function isActiveStoreTheme(themeId: string): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(`[data-store-theme-id="${themeId}"]`),
  );
}

export function isComilmartStoreTheme(): boolean {
  return isActiveStoreTheme("comilmart");
}

export function isBlankDropStoreTheme(): boolean {
  return isActiveStoreTheme("blank-drop");
}
