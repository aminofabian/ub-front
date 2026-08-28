import {
  isLandingTemplateId,
  isStoreThemeId,
} from "@/lib/storefront-templates";

export type ThemePins = {
  store: string[];
  landing: string[];
};

const PINS_KEY = "ub.storefront.themePins.v1";

function emptyPins(): ThemePins {
  return { store: [], landing: [] };
}

function sanitizePins(mode: keyof ThemePins, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const valid =
      mode === "store" ? isStoreThemeId(value) : isLandingTemplateId(value);
    if (!valid || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    // Compare pins are capped at two per mode.
    if (out.length >= 2) break;
  }
  return out;
}

/** Load persisted compare pins; always returns valid, deduped, max-two lists. */
export function loadThemePins(): ThemePins {
  if (typeof localStorage === "undefined") return emptyPins();
  try {
    const raw = localStorage.getItem(PINS_KEY);
    if (!raw) return emptyPins();
    const parsed = JSON.parse(raw) as Partial<ThemePins> | null;
    return {
      store: sanitizePins("store", parsed?.store),
      landing: sanitizePins("landing", parsed?.landing),
    };
  } catch {
    return emptyPins();
  }
}

/** Persist compare pins. Storage failures (private mode / quota) stay silent. */
export function saveThemePins(pins: ThemePins): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch {
    // No-op — pins remain session-only.
  }
}
