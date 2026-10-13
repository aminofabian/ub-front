"use client";

import { useEffect, useMemo, useState } from "react";

import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { fetchBranches, type BranchRecord } from "@/lib/api";

/** Branch being counted: follows the header branch, falls back to the first branch. */
export function useCountBranch(): { branchId: string; branchName: string | null } {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (branchLocked || branchId || branches.length === 0) return;
    setBranchId(branches[0]!.id);
  }, [branchLocked, branchId, branches]);

  const branchName = branches.find((b) => b.id === branchId)?.name ?? null;
  return { branchId, branchName };
}
