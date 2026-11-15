/**
 * The app's own typefaces, for the sheet's document: the `@font-face` rules as the app declares
 * them, and the family names behind the app's font variables. A stylesheet that cannot be read
 * (another origin) is skipped; the sheet then falls back to the device's serif and sans.
 */
export function appFonts(): { fontFaces: string; serif: string; sans: string; mono: string } {
  const read = (name: string) =>
    getComputedStyle(document.body).getPropertyValue(name).trim() ||
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const values = { serif: read("--font-cormorant"), sans: read("--font-tt-norms"), mono: read("--font-geist-mono") };
  // Only the families the sheet uses; the app declares many more.
  const wanted = new Set(
    Object.values(values)
      .flatMap((value) => value.split(","))
      .map((name) => name.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean),
  );
  const faces: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const base = sheet.href || window.location.href;
    for (const rule of Array.from(rules)) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
      const family = (rule as CSSFontFaceRule).style.getPropertyValue("font-family").trim().replace(/^["']|["']$/g, "");
      if (!wanted.has(family)) continue;
      // The font files are addressed relative to the app's stylesheet; the sheet's document sits
      // elsewhere, so each address is made whole.
      faces.push(
        rule.cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (whole, _quote: string, address: string) => {
          try {
            return `url("${new URL(address, base).href}")`;
          } catch {
            return whole;
          }
        }),
      );
    }
  }
  const family = (value: string, fallback: string) => (value ? `${value}, ${fallback}` : fallback);
  return {
    fontFaces: faces.join("\n"),
    serif: family(values.serif, 'Georgia, "Times New Roman", serif'),
    sans: family(values.sans, '"Helvetica Neue", Helvetica, Arial, sans-serif'),
    mono: family(values.mono, 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'),
  };
}
