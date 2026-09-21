/**
 * Shared placement + suppression for dashboard floating actions
 * (Kiosk Support headset, Ask Guide).
 *
 * Must stay clear of:
 * - tablet bottom nav (below the 2xl breakpoint)
 * - desktop icon rail (2xl+, {@link DESKTOP_NAV_RAIL_REM})
 * - FormDrawer footers (Save / Cancel) while a drawer is open
 */

/** Matches `DesktopNavRail` icon-rail width (`w-[4.75rem]`). */
export const DESKTOP_NAV_RAIL_REM = 4.75;

/** Support headset — left side, past the rail on desktop. */
export const SUPPORT_FAB_POSITION =
  "bottom-[calc(4.15rem+env(safe-area-inset-bottom,0px))] left-4 2xl:bottom-6 2xl:left-[calc(var(--kiosk-nav-rail,4.75rem)+1rem)]";

/** Ask Guide — right side, above tablet bottom nav until 2xl. */
export const GUIDE_FAB_POSITION =
  "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 2xl:bottom-6 2xl:right-6";

export const FORM_DRAWER_OPEN_EVENT = "kiosk:form-drawer-open";

let formDrawerOpenCount = 0;

/** Ref-count FormDrawer opens so nested drawers don't flash the FABs. */
export function setFormDrawerOpen(open: boolean): void {
  const prev = formDrawerOpenCount > 0;
  formDrawerOpenCount = Math.max(0, formDrawerOpenCount + (open ? 1 : -1));
  const next = formDrawerOpenCount > 0;
  if (typeof document !== "undefined") {
    if (next) document.documentElement.dataset.formDrawerOpen = "1";
    else delete document.documentElement.dataset.formDrawerOpen;
  }
  if (prev !== next && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FORM_DRAWER_OPEN_EVENT, { detail: next }),
    );
  }
}

export function isFormDrawerOpen(): boolean {
  return formDrawerOpenCount > 0;
}
