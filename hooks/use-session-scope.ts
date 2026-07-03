"use client";

import { useEffect, useMemo, useRef } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { isBranchLockedRole } from "@/lib/branch-access";
import { resolveSyncBranchFilter } from "@/lib/sync-branch-filter";
import type { BranchRecord, ItemTypeRecord } from "@/lib/api";

/** Label shown when the header department is cleared (all departments). */
export const ALL_DEPARTMENTS_LABEL = "All departments";

/**
 * Global branch scope, sourced from the app header (`DashboardProvider`).
 *
 * This is the single source of truth for the "which branch am I working in"
 * question. Pages should prefer this over holding their own branch state.
 */
export type SessionBranchScope = {
  /** Header-selected branch id (may be empty before branches load). */
  branchId: string;
  /** Update the header selection. No-op for branch-locked roles. */
  setBranchId: (id: string) => void;
  /** Human-friendly name of the current branch, or "" when none. */
  branchName: string;
  /** Active branches available to the session. */
  branches: BranchRecord[];
  /** True when the role is pinned to its assigned branch (cashier, stock manager, …). */
  branchLocked: boolean;
};

export function useSessionBranch(): SessionBranchScope {
  const { branchId, setBranchId, branches, me } = useDashboard();
  const branchLocked = isBranchLockedRole(me?.role?.key);
  const branchName = useMemo(
    () => branches.find((b) => b.id === branchId)?.name?.trim() ?? "",
    [branches, branchId],
  );
  return { branchId, setBranchId, branchName, branches, branchLocked };
}

/**
 * Global department (item type) scope, sourced from the app header.
 */
export type SessionItemTypeScope = {
  /** Header-selected item type id (may be empty before types load). */
  itemTypeId: string;
  /** Update the header selection. */
  setItemTypeId: (id: string) => void;
  /** Human-friendly label of the current department, or {@link ALL_DEPARTMENTS_LABEL} when none. */
  itemTypeLabel: string;
  /** Active item types available to the session. */
  itemTypes: ItemTypeRecord[];
};

export function useSessionItemType(): SessionItemTypeScope {
  const { itemTypeId, setItemTypeId, itemTypes } = useDashboard();
  const itemTypeLabel = useMemo(() => {
    if (!itemTypeId?.trim()) return ALL_DEPARTMENTS_LABEL;
    return itemTypes.find((t) => t.id === itemTypeId)?.label?.trim() ?? "";
  }, [itemTypes, itemTypeId]);
  return { itemTypeId, setItemTypeId, itemTypeLabel, itemTypes };
}

type SyncBranchFilterOptions = {
  /** Local page branch filter value. */
  value: string;
  /** Setter for the local page branch filter. */
  setValue: (id: string) => void;
  /**
   * Branch ids that are selectable on this page. When provided, the header
   * value is only copied down if it appears in this list. Pass the loaded
   * branch list; omit while still loading.
   */
  availableIds?: readonly string[];
  /**
   * When true (report-style pages), an empty header selection is allowed and
   * copied down as "" (meaning "All branches"). When false (default) an empty
   * header value never clears an existing local selection.
   */
  allowAll?: boolean;
};

/**
 * Keeps a page-local branch filter in sync with the global header branch.
 *
 * Mirrors the battle-tested pattern in `analytics-workspace.tsx`:
 *  - copies the header branch down on first mount and whenever it changes
 *  - respects branch-locked roles (they are pinned to `me.branchId`)
 *  - never fights user edits made *after* a header value was applied, unless
 *    the header itself changes again
 *
 * Returns the branch-locked assigned id (or null) so callers can lock their
 * own pickers when needed.
 */
export function useSyncBranchFilter({
  value,
  setValue,
  availableIds,
  allowAll = false,
}: SyncBranchFilterOptions): { branchLocked: boolean; assignedBranchId: string } {
  const { me } = useDashboard();
  const { branchId: headerBranchId } = useSessionBranch();
  const branchLocked = isBranchLockedRole(me?.role?.key);
  const assignedBranchId = me?.branchId?.trim() ?? "";
  const prevHeaderRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const result = resolveSyncBranchFilter({
      headerBranchId: headerBranchId ?? "",
      localValue: value,
      prevHeaderId: prevHeaderRef.current,
      branchLocked,
      assignedBranchId,
      availableIds,
      allowAll,
    });
    if (result.nextLocalValue !== undefined && result.nextLocalValue !== value) {
      setValue(result.nextLocalValue);
    }
    prevHeaderRef.current = result.nextPrevHeaderId;
  }, [
    branchLocked,
    assignedBranchId,
    headerBranchId,
    availableIds,
    allowAll,
    value,
    setValue,
  ]);

  return { branchLocked, assignedBranchId };
}
