import { MAX_QUEUED_TAGS } from "@/lib/price-tags/storage";
import type { TagInstance } from "@/lib/price-tags/types";

export const MAX_COPIES = 99;

let slotSeq = 0;

export function createSlotKey(itemId: string): string {
  slotSeq += 1;
  return `${itemId}-${slotSeq}-${Math.random().toString(36).slice(2, 8)}`;
}

export function copiesOf(instances: readonly TagInstance[], itemId: string): number {
  let count = 0;
  for (const slot of instances) {
    if (slot.itemId === itemId) count += 1;
  }
  return count;
}

export function setCopies(
  instances: readonly TagInstance[],
  itemId: string,
  count: number,
): TagInstance[] {
  const next = clampCopies(count);
  const current = copiesOf(instances, itemId);
  if (next === current) return instances.slice();
  if (next === 0) return instances.filter((slot) => slot.itemId !== itemId);
  if (next < current) {
    let drop = current - next;
    const kept: TagInstance[] = [];
    for (let index = instances.length - 1; index >= 0; index -= 1) {
      const slot = instances[index];
      if (slot.itemId === itemId && drop > 0) {
        drop -= 1;
        continue;
      }
      kept.push(slot);
    }
    kept.reverse();
    return kept;
  }
  const added: TagInstance[] = [];
  for (let index = current; index < next; index += 1) {
    added.push({ key: createSlotKey(itemId), itemId });
  }
  return instances.concat(added);
}

export function removeSlot(instances: readonly TagInstance[], key: string): TagInstance[] {
  return instances.filter((slot) => slot.key !== key);
}

export function duplicateSlot(instances: readonly TagInstance[], key: string): TagInstance[] {
  const index = instances.findIndex((slot) => slot.key === key);
  if (index < 0) return instances.slice();
  const source = instances[index];
  if (copiesOf(instances, source.itemId) >= MAX_COPIES) return instances.slice();
  const copy: TagInstance = { key: createSlotKey(source.itemId), itemId: source.itemId };
  const next = instances.slice();
  next.splice(index + 1, 0, copy);
  return next;
}

export function moveSlot(
  instances: readonly TagInstance[],
  fromIndex: number,
  toIndex: number,
): TagInstance[] {
  if (fromIndex === toIndex) return instances.slice();
  if (fromIndex < 0 || fromIndex >= instances.length) return instances.slice();
  const next = instances.slice();
  const [slot] = next.splice(fromIndex, 1);
  const target = Math.max(0, Math.min(toIndex, next.length));
  next.splice(target, 0, slot);
  return next;
}

function clampCopies(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(MAX_COPIES, Math.round(count)));
}

/**
 * Restored tags first, then anything picked while the restore ran, without a
 * second set of tags for a product that was in both, and within the sheet cap.
 */
export function mergeRestored(
  restored: readonly TagInstance[],
  picked: readonly TagInstance[],
): TagInstance[] {
  const restoredIds = new Set(restored.map((slot) => slot.itemId));
  const extra = picked.filter((slot) => !restoredIds.has(slot.itemId));
  return restored.concat(extra).slice(0, MAX_QUEUED_TAGS);
}
