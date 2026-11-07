import { TAG_PRINT_CSS, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import type { TagInstance } from "@/lib/price-tags/types";

export function printPriceTagPages(
  pages: TagInstance[][],
  ctx: TagRenderContext,
  pageFrom: number,
  pageTo: number,
): void {
  const start = Math.max(1, pageFrom);
  const end = Math.min(pages.length, pageTo);
  const chosen = pages.slice(start - 1, end);
  if (chosen.length === 0 || typeof document === "undefined") return;

  const html = chosen
    .map((slots, index) => sheetHtml(slots, ctx, start + index, pages.length))
    .join("");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Price tag print");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const frame = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!frame || !win) {
    iframe.remove();
    return;
  }
  frame.open();
  frame.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Price tags</title><style>${TAG_PRINT_CSS}</style></head><body>${html}</body></html>`,
  );
  frame.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 400);
  };
  win.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(() => {
    win.focus();
    win.print();
  }, 60);
}
