/**
 * Mark every body child except `host` as inert so a security overlay can
 * receive pointer + keyboard even when a Radix dialog is open.
 *
 * Radix modal dialogs set `pointer-events: none` on `document.body` and trap
 * focus in their portal. Those portals are body siblings of this host, so the
 * till-lock (or similar) layer would otherwise paint on top but never take
 * input until the other dialog is closed.
 */
export function inertBodySiblingsOf(
  host: HTMLElement | null | undefined,
): () => void {
  if (!host || typeof document === "undefined") {
    return () => undefined;
  }
  const touched: HTMLElement[] = [];
  for (const child of Array.from(document.body.children)) {
    if (child === host || !(child instanceof HTMLElement)) {
      continue;
    }
    if (child.hasAttribute("inert")) {
      continue;
    }
    child.setAttribute("inert", "");
    touched.push(child);
  }
  return () => {
    for (const el of touched) {
      el.removeAttribute("inert");
    }
  };
}
