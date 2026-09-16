"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Local till accent.
 *
 * The shop's branding supplies `--pos-primary`; a cashier can also repaint
 * *their own* till — useful when several tills share one counter and the eye
 * needs to tell them apart, or when a screen reads better in a different
 * accent. The choice is device-local (never uploaded) and always reversible
 * back to the shop theme.
 */
export type PosTillAccent = {
  id: string;
  label: string;
  /** Accent hex; `--pos-glow` and `--pos-primary-ink` are derived from it. */
  hex: string;
};

export const POS_TILL_ACCENTS: readonly PosTillAccent[] = [
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "ink", label: "Ink", hex: "#1c1915" },
  { id: "green", label: "Green", hex: "#15803d" },
  { id: "blue", label: "Blue", hex: "#1d4ed8" },
  { id: "clay", label: "Clay", hex: "#b45309" },
  { id: "berry", label: "Berry", hex: "#9d174d" },
];

const STORAGE_KEY = "ub.pos.till-accent";
const CHANGE_EVENT = "ub:pos-till-accent";

const byId = new Map(POS_TILL_ACCENTS.map((a) => [a.id, a]));

export function posTillAccentById(id: string | null | undefined): PosTillAccent | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return posTillAccentById(raw) ? raw : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writePosTillAccentId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (posTillAccentById(id)) window.localStorage.setItem(STORAGE_KEY, id!);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — the till simply keeps the shop theme.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Accent id currently painted on this till, or null for the shop theme. */
export function usePosTillAccent() {
  const accentId = useSyncExternalStore(subscribe, readStoredId, () => null);
  const setAccentId = useCallback(
    (id: string | null) => writePosTillAccentId(id),
    [],
  );
  return { accentId, accent: posTillAccentById(accentId), setAccentId };
}
