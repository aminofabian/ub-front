/** Masthead kicker + shop name for the Daily gazette nameplate. */
export function gazettePlateName(storeName: string): string {
  const raw = storeName.trim() || "Gazette";
  const stripped = raw
    .replace(/^the daily\s+/i, "")
    .replace(/\s+(shop|store|ltd|limited)$/i, "")
    .trim();
  return (stripped || raw).toUpperCase();
}

export function gazetteEdition(
  storeName: string,
  now = new Date(),
): { vol: number; no: number; date: string } {
  let h = 0;
  for (let i = 0; i < storeName.length; i++) {
    h = (h * 31 + storeName.charCodeAt(i)) | 0;
  }
  const vol = (Math.abs(h) % 48) + 1;
  const start = Date.UTC(now.getFullYear(), 0, 0);
  const no = Math.max(1, Math.round((now.getTime() - start) / 86_400_000));
  const date = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
  return { vol, no, date };
}
