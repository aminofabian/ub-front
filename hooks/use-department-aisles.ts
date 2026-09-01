"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchAisles,
  fetchUnassignedAisleCount,
  type AisleRecord,
} from "@/lib/api";

import { UNASSIGNED_SHELF_ZONE_VALUE } from "./use-session-scope";

type DepartmentAislesState = {
  aisles: AisleRecord[];
  unassignedCount: number;
  loading: boolean;
};

const EMPTY: DepartmentAislesState = {
  aisles: [],
  unassignedCount: 0,
  loading: false,
};

/**
 * When a department is selected in the header, load shelf zones with product
 * counts scoped to that department so the picker only shows relevant walk paths.
 */
export function useDepartmentScopedAisles(itemTypeId: string): DepartmentAislesState {
  const scopedDept = itemTypeId.trim();
  const [state, setState] = useState<DepartmentAislesState>(EMPTY);

  useEffect(() => {
    if (!scopedDept) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    void Promise.all([
      fetchAisles({ itemTypeId: scopedDept }),
      fetchUnassignedAisleCount({ itemTypeId: scopedDept }),
    ])
      .then(([aisles, unassignedCount]) => {
        if (cancelled) return;
        setState({
          aisles: aisles.filter((a) => a.active && a.productCount > 0),
          unassignedCount,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [scopedDept]);

  return state;
}

export function filterHeaderAisles(
  allAisles: AisleRecord[],
  itemTypeId: string,
  departmentScoped: DepartmentAislesState,
): AisleRecord[] {
  const base = [...allAisles]
    .filter((a) => a.active)
    .sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  if (!itemTypeId.trim() || departmentScoped.loading) return base;
  const ids = new Set(departmentScoped.aisles.map((a) => a.id));
  return base.filter((a) => ids.has(a.id));
}

export function headerAisleSelectionValid(
  aisleId: string,
  itemTypeId: string,
  departmentScoped: DepartmentAislesState,
): boolean {
  if (!aisleId.trim()) return true;
  if (!itemTypeId.trim() || departmentScoped.loading) return true;
  if (aisleId === UNASSIGNED_SHELF_ZONE_VALUE) {
    return departmentScoped.unassignedCount > 0;
  }
  return departmentScoped.aisles.some((a) => a.id === aisleId);
}

export function useHeaderShelfZoneOptions(
  allAisles: AisleRecord[],
  itemTypeId: string,
) {
  const departmentScoped = useDepartmentScopedAisles(itemTypeId);
  const activeAisles = useMemo(
    () => filterHeaderAisles(allAisles, itemTypeId, departmentScoped),
    [allAisles, itemTypeId, departmentScoped],
  );
  const showUnassignedOption = itemTypeId.trim()
    ? departmentScoped.unassignedCount > 0
    : true;

  return {
    activeAisles,
    departmentScoped,
    showUnassignedOption,
  };
}
