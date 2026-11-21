/**
 * Words and numbers for the catalogue's "stocking your shelf" loader: what to say while a big
 * starter pack arrives in slices, how long is left, and the aisles a shop can keep or skip
 * whole. Everything shown is measured from the load itself; nothing is invented to fill time.
 */

export type ShelfLoadState = {
  /** Products of the pack fetched so far (by position in the pack). */
  loaded: number;
  /** Products in the pack; 0 until the first slice says. */
  total: number;
  done: boolean;
  /** Milliseconds since the load began. */
  elapsedMs: number;
};

export type ShelfLoadCopy = {
  /** The line beside the big number. */
  headline: string;
  /** What the person can do now, or how long is left. */
  detail: string;
};

const nf = (n: number) => n.toLocaleString("en-KE");

/** Seconds left at the pace measured so far, or null before there is a pace to measure. */
export function shelfSecondsLeft(s: ShelfLoadState): number | null {
  if (s.done || s.total <= 0 || s.loaded <= 0 || s.elapsedMs < 400) return null;
  // The small first slice says little about the pace of the big ones: wait for a real sample.
  if (s.loaded < Math.max(300, s.total * 0.08)) return null;
  const perMs = s.loaded / s.elapsedMs;
  if (perMs <= 0) return null;
  return Math.max(0, Math.round((s.total - s.loaded) / perMs / 1000));
}

/** "About 2 minutes left", "Less than a minute left", "Last crate coming in". */
export function shelfTimeLeftPhrase(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds <= 8) return "Last crate coming in.";
  if (seconds <= 40) return "Less than a minute left.";
  if (seconds <= 90) return "About a minute left.";
  return `About ${Math.round(seconds / 60)} minutes left.`;
}

export function shelfLoadCopy(s: ShelfLoadState, noun: string): ShelfLoadCopy {
  if (s.done) {
    return {
      headline: s.total === 1 ? `1 ${noun.replace(/s$/, "")} is unpacked` : `All ${nf(s.total)} ${noun} are unpacked`,
      detail: "Untick what you do not stock, or skip a whole aisle in one tap.",
    };
  }
  if (s.loaded <= 0) {
    return {
      headline: `Opening the ${noun} catalogue`,
      detail: `The first ${noun} arrive in a few seconds.`,
    };
  }
  const left = shelfTimeLeftPhrase(shelfSecondsLeft(s));
  const share = s.total > 0 ? s.loaded / s.total : 0;
  const mark = share >= 0.75 ? "Nearly there." : share >= 0.5 ? "Halfway." : share >= 0.25 ? "A quarter in." : "";
  const next = Math.min(500, Math.max(0, s.total - s.loaded));
  return {
    headline: `of ${nf(s.total)} ${noun} unpacked`,
    detail: [
      mark || "You can start choosing now.",
      next > 0 ? `Fetching the next ${nf(next)}.` : "",
      left,
      "Review opens when the last one lands.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/** 0 to `bays`: how many shelf bays are full. A bay fills only when all of it has arrived. */
export function shelfBaysFilled(loaded: number, total: number, bays: number): number {
  if (total <= 0 || bays <= 0) return 0;
  return Math.max(0, Math.min(bays, Math.floor((loaded / total) * bays)));
}

/**
 * What to read out to a screen reader. Only at quarter marks and at the end, so the count
 * ticking up several times a second is not announced each time.
 */
export function shelfAnnouncement(s: ShelfLoadState, noun: string): string {
  if (s.done) return `All ${nf(s.total)} ${noun} have loaded.`;
  if (s.total <= 0 || s.loaded <= 0) return "";
  const quarter = Math.floor((s.loaded / s.total) * 4);
  if (quarter <= 0) return `The first ${nf(s.loaded)} ${noun} have loaded. You can start choosing.`;
  return `${quarter * 25} percent of the ${noun} have loaded.`;
}

export type ShelfAisle = {
  key: string;
  name: string;
  total: number;
  selected: number;
};

/**
 * The biggest aisles among what has loaded, with how many of each are ticked. Products already
 * in the shop are left out: they cannot be chosen again.
 */
export function shelfAisles<
  T extends { id: string; categoryName?: string | null; alreadyImported?: boolean },
>(products: readonly T[], isSelected: (id: string) => boolean, max = 8): ShelfAisle[] {
  const byKey = new Map<string, ShelfAisle>();
  for (const p of products) {
    if (p.alreadyImported) continue;
    const name = p.categoryName?.trim() || "Other";
    const key = name.toLowerCase();
    let aisle = byKey.get(key);
    if (!aisle) {
      aisle = { key, name, total: 0, selected: 0 };
      byKey.set(key, aisle);
    }
    aisle.total += 1;
    if (isSelected(p.id)) aisle.selected += 1;
  }
  return [...byKey.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, max);
}
