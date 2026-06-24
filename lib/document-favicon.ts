const LINK_MARKER = "data-ub-tenant-favicon";

/**
 * Sets or clears the document favicon from a tenant branding URL.
 * Uses a marked `<link>` so we do not remove Next.js default icons when clearing.
 */
export function setDocumentFavicon(href: string | null | undefined): void {
  if (typeof document === "undefined") {
    return;
  }
  const trimmed = href?.trim() ?? "";
  const head = document.head;
  const existing = head.querySelector<HTMLLinkElement>(`link[rel="icon"][${LINK_MARKER}]`);
  if (!trimmed) {
    existing?.remove();
    return;
  }
  let link = existing;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.setAttribute(LINK_MARKER, "true");
    head.appendChild(link);
  }
  link.href = trimmed;
}
