/**
 * Pure branch-filter sync rules used by {@link useSyncBranchFilter}.
 * Extracted for unit tests and to document expected header ↔ page behavior.
 */

export type SyncBranchFilterInput = {
  headerBranchId: string;
  localValue: string;
  prevHeaderId: string | undefined;
  branchLocked: boolean;
  assignedBranchId: string;
  availableIds?: readonly string[];
  allowAll?: boolean;
};

export type SyncBranchFilterResult = {
  /** When set, the page-local filter should update to this value. */
  nextLocalValue?: string;
  nextPrevHeaderId: string;
};

export function resolveSyncBranchFilter({
  headerBranchId,
  localValue,
  prevHeaderId,
  branchLocked,
  assignedBranchId,
  availableIds,
  allowAll = false,
}: SyncBranchFilterInput): SyncBranchFilterResult {
  if (branchLocked) {
    if (assignedBranchId && assignedBranchId !== localValue) {
      return {
        nextLocalValue: assignedBranchId,
        nextPrevHeaderId: headerBranchId.trim(),
      };
    }
    return { nextPrevHeaderId: headerBranchId.trim() };
  }

  const id = headerBranchId.trim();
  const isAvailable =
    availableIds === undefined ? id.length > 0 : availableIds.includes(id);

  const initialSync = prevHeaderId === undefined;
  const headerChanged = prevHeaderId !== undefined && prevHeaderId !== id;

  if (id && isAvailable) {
    if ((initialSync || headerChanged) && id !== localValue) {
      return { nextLocalValue: id, nextPrevHeaderId: id };
    }
    return { nextPrevHeaderId: id };
  }

  if (allowAll && (initialSync || headerChanged) && localValue !== "") {
    return { nextLocalValue: "", nextPrevHeaderId: id };
  }

  return { nextPrevHeaderId: id };
}
