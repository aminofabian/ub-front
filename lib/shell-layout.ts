/**
 * Shared bottom-chrome metrics for the (dashboard) shell.
 *
 * The shell pins a fixed bottom tab bar at every viewport below `xl`
 * (AppShell: `tabletChromeVisible = "xl:hidden"`). Content clears it with the
 * `--shell-bottom-inset` CSS variable (globals.css). Any page-level sticky or
 * fixed bottom element MUST sit on that inset too, or you get two stacked bars.
 *
 * Keep these as literal strings so Tailwind emits the arbitrary value.
 */
export const SHELL_BOTTOM_OFFSET = "bottom-[var(--shell-bottom-inset)]";
export const SHELL_BOTTOM_PAD = "pb-[var(--shell-bottom-inset)]";

/** Offset plus an explicit gap, e.g. a floating action tray one rem above the bar. */
export const SHELL_BOTTOM_TRAY = "bottom-[calc(var(--shell-bottom-inset)+1rem)]";
