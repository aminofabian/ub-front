"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";

import {
  useStorefrontLiveDesign,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { resolveChemLabCopy } from "@/lib/chem-lab-copy";

/**
 * Chem lab "shifts": the theme ships two full palettes — a dark Night shift
 * (default, the original bench) and a light Day shift. Visitors flip between
 * them with the switch in the header; the choice is remembered per device.
 * Merchants keep customizing the two brand colors (lime + amber) and the page
 * surface — the theme re-derives a readable ink tone for the active shift.
 */

export type ChemLabMode = "dark" | "light";

const STORAGE_KEY = "cl-mode";

/* ------------------------------------------------------------------ */
/* tiny shared store — applies the `data-cl-mode` attribute to every   */
/* chem-lab root (chrome + home) so the CSS module can switch palettes */
/* ------------------------------------------------------------------ */

function rootEls(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-store-theme-id="chem-lab"]'),
  );
}

function surfaceIsLight(): boolean {
  const el = rootEls()[0];
  if (!el) return false;
  const raw = getComputedStyle(el).getPropertyValue("--sf-surface").trim();
  const match = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return false;
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

/** Saved visitor preference, else auto-match a custom light surface, else night. */
export function readChemLabMode(): ChemLabMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable — fall through to the adaptive default */
  }
  return surfaceIsLight() ? "light" : "dark";
}

const listeners = new Set<(mode: ChemLabMode) => void>();

export function applyChemLabMode(mode: ChemLabMode, persist: boolean): void {
  for (const el of rootEls()) el.dataset.clMode = mode;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }
  for (const fn of listeners) fn(mode);
}

export function toggleChemLabMode(): ChemLabMode {
  const next = readChemLabMode() === "dark" ? "light" : "dark";
  applyChemLabMode(next, true);
  return next;
}

export function subscribeChemLabMode(
  fn: (mode: ChemLabMode) => void,
): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** SSR-safe binding: starts on the night palette, then hydrates the real shift. */
export function useChemLabMode(): ChemLabMode {
  const [mode, setMode] = useState<ChemLabMode>("dark");
  useEffect(() => {
    const initial = readChemLabMode();
    setMode(initial);
    applyChemLabMode(initial, false);
    return subscribeChemLabMode(setMode);
  }, []);
  return mode;
}

/* ------------------------------------------------------------------ */
/* brand-color derivation for the day shift                            */
/* ------------------------------------------------------------------ */

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h.length === 6 ? h : "";
  if (!full) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const channel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Darken a brand hex until it clears WCAG AA on the pale day-shift paper.
 * Keeps the hue, so a merchant's lime stays lime — just a readable lime.
 */
export function chemLabDayColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = 0.17;
  if (relativeLuminance(rgb) <= target) return rgbToHex(rgb);
  let k = 1;
  for (let i = 0; i < 8; i += 1) {
    k *= 0.72;
    const lum = relativeLuminance(
      rgb.map((c) => c * k) as [number, number, number],
    );
    if (lum <= target) break;
  }
  return rgbToHex(rgb.map((c) => c * k) as [number, number, number]);
}

/** Inline `--cl-neon` / `--cl-amber` for a given shift (readable on both). */
export function chemLabPaletteVars(
  neon: string,
  amber: string,
  mode: ChemLabMode,
): CSSProperties {
  return {
    "--cl-neon": mode === "light" ? chemLabDayColor(neon) : neon,
    "--cl-amber": mode === "light" ? chemLabDayColor(amber) : amber,
  } as CSSProperties;
}

/* ------------------------------------------------------------------ */
/* header switch                                                       */
/* ------------------------------------------------------------------ */

export type ChemLabCopy = ReturnType<typeof resolveChemLabCopy> & {
  editMode: boolean;
  commitInventory: (next: string) => void;
  commitDispense: (next: string) => void;
  commitCart: (next: string) => void;
};

const ChemLabCopyContext = createContext<ChemLabCopy | null>(null);

/** Labels + inline-edit commits for chem-lab copy. Null outside this theme. */
export function ChemLabCopyProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const design = useStorefrontLiveDesign(null);
  const staff = useStorefrontStaffEditOptional();
  const value = useMemo<ChemLabCopy | null>(() => {
    if (!enabled) return null;
    const theme = design?.theme ?? null;
    const copy = resolveChemLabCopy(theme);
    return {
      ...copy,
      editMode: Boolean(staff?.editMode),
      commitInventory: (next) => {
        void staff?.patchThemeOption("inventory", next, "chem-lab");
      },
      commitDispense: (next) => {
        void staff?.patchThemeOption("dispense", next, "chem-lab");
      },
      commitCart: (next) => {
        void staff?.patchThemeOption("cart", next, "chem-lab");
      },
    };
  }, [enabled, design?.theme, staff]);
  return (
    <ChemLabCopyContext.Provider value={value}>
      {children}
    </ChemLabCopyContext.Provider>
  );
}

export function useChemLabCopy(): ChemLabCopy | null {
  return useContext(ChemLabCopyContext);
}

export function ChemLabModeToggle() {
  const mode = useChemLabMode();
  const copy = useChemLabCopy();
  const nextLabel =
    mode === "dark"
      ? (copy?.shiftLight || "day").toLowerCase()
      : (copy?.shiftDark || "night").toLowerCase();
  return (
    <button
      type="button"
      className={styles.modeToggle}
      onClick={() => toggleChemLabMode()}
      aria-label={`Switch to ${nextLabel}`}
      title={`Switch to ${nextLabel}`}
    >
      <span
        className={styles.modeThumb}
        data-shift={mode}
        aria-hidden
      />
      <span className={styles.modeOpt} data-active={mode === "light"}>
        <Sun className="size-3.5" aria-hidden />
        <span>Day</span>
      </span>
      <span className={styles.modeOpt} data-active={mode === "dark"}>
        <Moon className="size-3.5" aria-hidden />
        <span>Night</span>
      </span>
    </button>
  );
}
