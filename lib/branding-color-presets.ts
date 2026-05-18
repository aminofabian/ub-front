/** Curated primary + accent pairs for storefront branding. */
export type BrandingColorPreset = {
  name: string;
  primary: string;
  accent: string;
};

export const BRANDING_COLOR_PRESETS: BrandingColorPreset[] = [
  { name: "Fresh Green", primary: "#28A745", accent: "#20863B" },
  { name: "Royal Blue", primary: "#1565C0", accent: "#90CAF9" },
  { name: "Sunset Orange", primary: "#EF6C00", accent: "#FFCC80" },
  { name: "Modern Purple", primary: "#6A1B9A", accent: "#CE93D8" },
  { name: "Bold Red", primary: "#C62828", accent: "#EF9A9A" },
  { name: "Teal Ocean", primary: "#00695C", accent: "#80CBC4" },
  { name: "Golden Yellow", primary: "#F9A825", accent: "#FFE082" },
  { name: "Deep Indigo", primary: "#283593", accent: "#9FA8DA" },
  { name: "Berry Pink", primary: "#AD1457", accent: "#F48FB1" },
  { name: "Earth Brown", primary: "#5D4037", accent: "#BCAAA4" },
  { name: "Slate Gray", primary: "#37474F", accent: "#B0BEC5" },
  { name: "Emerald", primary: "#00897B", accent: "#80CBC4" },
  { name: "Coral", primary: "#E64A19", accent: "#FFAB91" },
  { name: "Lavender", primary: "#7B1FA2", accent: "#E1BEE7" },
  { name: "Sky Blue", primary: "#0288D1", accent: "#81D4FA" },
  { name: "Olive", primary: "#827717", accent: "#DCE775" },
  { name: "Mint", primary: "#00796B", accent: "#B2DFDB" },
  { name: "Crimson", primary: "#B71C1C", accent: "#FFCDD2" },
  { name: "Amber", primary: "#FF8F00", accent: "#FFE082" },
  { name: "Charcoal", primary: "#263238", accent: "#CFD8DC" },
];

export function brandingPresetMatches(
  preset: BrandingColorPreset,
  primaryColor: string,
  accentColor: string,
): boolean {
  return (
    primaryColor.toUpperCase() === preset.primary.toUpperCase() &&
    accentColor.toUpperCase() === preset.accent.toUpperCase()
  );
}
