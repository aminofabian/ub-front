"use client";

import type { BranchGuidanceKind } from "@/lib/problem";

export const BRANCH_REQUIRED_EVENT = "ub:branch-required";
export const OPEN_SHELL_MORE_EVENT = "ub:open-more";

export type BranchRequiredDetail = {
  kind: BranchGuidanceKind;
};

export function notifyBranchRequired(kind: BranchGuidanceKind): void {
  if (typeof window === "undefined") {
    return;
  }
  const detail: BranchRequiredDetail = { kind };
  window.dispatchEvent(
    new CustomEvent<BranchRequiredDetail>(BRANCH_REQUIRED_EVENT, { detail }),
  );
}

export function requestOpenShellMore(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(OPEN_SHELL_MORE_EVENT));
}

export function focusVisibleBranchSelect(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const nodes = document.querySelectorAll<HTMLSelectElement>(
    "select[data-shell-branch-select]",
  );
  for (const el of nodes) {
    if (el.disabled || el.getClientRects().length === 0) {
      continue;
    }
    el.focus();
    return true;
  }
  return false;
}
