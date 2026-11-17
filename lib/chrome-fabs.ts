/**
 * Shared placement + suppression for dashboard floating actions
 * (Kiosk Support headset, Ask Guide).
 *
 * Below xl the tablet bottom nav owns the thumb zone — launch FABs are
 * hidden and both open from More instead. Positions below apply at xl+
 * (laptops), where the sidebar replaces the tab bar.
 *
 * Both now live in ONE corner (bottom-right), stacked vertically, so they read
 * as a single quiet "help" cluster and never land on the sidebar's own nav
 * items or the content's trailing action buttons. The support headset is the
 * anchor at the very bottom; Ask Guide sits directly above it.
 *
 * Must stay clear of:
 * - the left sidebar / icon rail entirely (right-anchored now)
 * - FormDrawer footers (Save / Cancel) while a drawer is open
 */

/** Matches `DesktopNavRail` icon-rail width (`w-[4.75rem]`). */
export const DESKTOP_NAV_RAIL_REM = 4.75;

/** Support headset — bottom-right anchor of the help cluster. */
export const SUPPORT_FAB_POSITION =
  "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 xl:bottom-5 xl:right-6";

/**
 * Ask Guide — stacked directly above the support headset. The headset is
 * ~3.1rem tall, so clear it plus a gap.
 */
export const GUIDE_FAB_POSITION =
  "bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 xl:bottom-[calc(1.25rem+3.1rem+0.75rem)] xl:right-6";

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
