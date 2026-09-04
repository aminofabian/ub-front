import type { CSSProperties } from "react";

import type { BrandingRecord } from "@/lib/api";

const FALLBACK_PRIMARY = "#8B6F3A";
const FALLBACK_ACCENT = "#C4A574";

export type ShopMailBrand = {
  displayName: string;
  logoUrl: string | null;
  primary: string;
  accent: string;
  /** Readable ink on primary (buttons). */
  onPrimary: string;
  softSurface: string;
  softRing: string;
  paperFrom: string;
  paperTo: string;
  cssVars: CSSProperties;
};

function normalizeHex(color: string | null | undefined, fallback: string): string {
  if (!color?.trim()) return fallback;
  const s = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const body = s.slice(1);
    return (
      "#" +
      body
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.length === 6
        ? h
        : "";
  if (!full) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.4;
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

function mixHex(a: string, b: string, weightB: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const w = Math.max(0, Math.min(1, weightB));
  const channel = (i: number) =>
    Math.max(0, Math.min(255, Math.round(ra[i]! + (rb[i]! - ra[i]!) * w)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export function resolveShopMailBrand(
  branding?: BrandingRecord | null,
  tenantName?: string | null,
): ShopMailBrand {
  const primary = normalizeHex(branding?.primaryColor, FALLBACK_PRIMARY);
  const accent = normalizeHex(
    branding?.accentColor,
    mixHex(primary, FALLBACK_ACCENT, 0.45),
  );
  const onPrimary = relativeLuminance(primary) >= 0.55 ? "#1c1917" : "#FFFDF8";
  const softSurface = mixHex(primary, "#ffffff", 0.9);
  const softRing = mixHex(primary, "#ffffff", 0.72);
  const paperFrom = mixHex(primary, "#f7f3eb", 0.88);
  const paperTo = mixHex(primary, "#e8dfd0", 0.82);
  const displayName =
    branding?.displayName?.trim() ||
    tenantName?.trim() ||
    "your shop";

  return {
    displayName,
    logoUrl: branding?.logoUrl?.trim() || null,
    primary,
    accent,
    onPrimary,
    softSurface,
    softRing,
    paperFrom,
    paperTo,
    cssVars: {
      ["--mail-brand" as string]: primary,
      ["--mail-brand-accent" as string]: accent,
      ["--mail-on-brand" as string]: onPrimary,
      ["--mail-soft" as string]: softSurface,
      ["--mail-soft-ring" as string]: softRing,
      ["--mail-paper-from" as string]: paperFrom,
      ["--mail-paper-to" as string]: paperTo,
    },
  };
}

/** Starter HTML that mirrors the shop’s primary color. */
export function defaultShopMailHtml(brand: ShopMailBrand): string {
  const logoBlock = brand.logoUrl
    ? `<tr><td style="padding-bottom:16px;"><img src="${brand.logoUrl.replace(/"/g, "")}" alt="${brand.displayName.replace(/"/g, "")}" height="36" style="display:block;height:36px;width:auto;max-width:180px;border:0;" /></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;font-family:Georgia,'Times New Roman',serif;background:${brand.paperFrom};color:#1c1917;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#fffdf8;border-radius:16px;padding:32px;border:1px solid ${brand.softRing};">
          ${logoBlock}
          <tr><td style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primary};">{{shop}}</td></tr>
          <tr><td style="padding-top:10px;font-size:26px;font-weight:700;letter-spacing:-0.02em;">Hi {{firstName}},</td></tr>
          <tr><td style="padding-top:14px;font-size:15px;line-height:1.55;color:#44403c;">
            A note from the counter. You have {{loyaltyPoints}} loyalty points waiting.
          </td></tr>
          <tr><td style="padding-top:24px;">
            <a href="{{shopUrl}}" style="display:inline-block;background:${brand.primary};color:${brand.onPrimary};text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">Open the shop</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
