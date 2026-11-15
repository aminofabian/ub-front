"use client";

import { useEffect, useRef } from "react";

import { DASHBOARD_SECTION_SURFACE, DashboardLoading } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";

/**
 * Shown by a restaurant screen that has no branch to work at yet.
 *
 * While the shop's branches are still loading, or there are some and one is about to be picked,
 * that is only a moment: say "loading", not "choose a branch" — a shop with one branch has
 * nothing to choose, and a phone shows no branch picker to choose with.
 *
 * An empty list usually means the load failed (a dropped connection reads the same as "no
 * branches"), so it is tried once more on its own, and after that the person can try again.
 */
export function NoBranch({ message }: { message: string }) {
  const { branches, branchesLoading, refreshBranches } = useDashboard();
  const retried = useRef(false);
  const empty = !branchesLoading && branches.length === 0;

  useEffect(() => {
    if (!empty || retried.current) return;
    retried.current = true;
    const timer = window.setTimeout(() => void refreshBranches(), 1500);
    return () => window.clearTimeout(timer);
  }, [empty, refreshBranches]);

  if (!empty) {
    return <DashboardLoading label="Loading…" />;
  }
  return (
    <div className={DASHBOARD_SECTION_SURFACE}>
      <p>{message}</p>
      <p className="mt-1 text-sm text-[var(--op-muted)]">
        If your shop has a branch and it is not showing, the list may not have loaded.
      </p>
      <Button variant="outline" className="mt-3" onClick={() => void refreshBranches()}>
        Try again
      </Button>
    </div>
  );
}
