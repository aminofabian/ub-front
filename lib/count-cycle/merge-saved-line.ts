import type { CountCycleBatchRecord } from "@/lib/api";

/**
 * Takes only the line that was just saved from the server's reply, so counts
 * saved in quick succession can't overwrite each other when replies race.
 */
export function mergeSavedLine(
  current: CountCycleBatchRecord,
  reply: CountCycleBatchRecord,
  lineId: string,
): CountCycleBatchRecord {
  const saved = reply.lines.find((line) => line.lineId === lineId);
  if (!saved) return current;
  const lines = current.lines.map((line) => (line.lineId === lineId ? saved : line));
  const countedCount = lines.filter((line) => line.countedQty != null).length;
  return { ...current, lines, countedCount };
}
