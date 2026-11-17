/** Most-recently-used emoji, persisted per browser. Best-effort; storage may be off. */

const KEY = "ub.emoji.recent";
const MAX = 16;

export function getRecentEmoji(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentEmoji(emoji: string): string[] {
  const next = [emoji, ...getRecentEmoji().filter((e) => e !== emoji)].slice(0, MAX);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode / storage disabled: recents just don't persist.
    }
  }
  return next;
}
