/**
 * Pick readable ink for a solid colour chip/button/bubble.
 *
 * Uses the same threshold as the shop mail brand so storefront surfaces do not
 * end up with white text on a light merchant colour.
 */
export type ReadableInk = "#ffffff" | "#15231f";

function normalizeHex(hex: string | null | undefined): string | null {
  const s = (hex ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.slice(1);
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const body = s.slice(1);
    return body
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return null;
}

export function readableInkOn(hex: string | null | undefined): ReadableInk {
  const normalized = normalizeHex(hex);
  if (!normalized) return "#ffffff";
  const n = parseInt(normalized, 16);
  if (Number.isNaN(n)) return "#ffffff";
  const channel = (shift: number) => {
    const value = ((n >> shift) & 255) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return luminance >= 0.55 ? "#15231f" : "#ffffff";
}
