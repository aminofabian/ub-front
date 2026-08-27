"use client";

import { MapPin, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  BRANCH_REQUIRED_EVENT,
  focusVisibleBranchSelect,
  requestOpenShellMore,
  type BranchRequiredDetail,
} from "@/lib/branch-guidance";
import type { BranchGuidanceKind } from "@/lib/problem";
import { cn } from "@/lib/utils";

const COPY: Record<
  BranchGuidanceKind,
  { title: string; body: string; action?: string }
> = {
  pick: {
    title: "Which shop is this for?",
    body: "Every sale and stock count lives at a location. Pick a branch, then continue.",
    action: "Choose a location",
  },
  assign: {
    title: "This account isn’t on a shop yet",
    body: "Ask an owner to assign you a branch — then this will load.",
  },
};

/**
 * In-chrome coaching strip for a missing shop location. Replaces the old
 * error toast so the recovery control (branch picker) stays on screen.
 */
export function BranchRequiredBanner() {
  const { branchId } = useDashboard();
  const [kind, setKind] = useState<BranchGuidanceKind | null>(null);
  const shownAtBranchIdRef = useRef<string>("");

  useEffect(() => {
    const onRequired = (event: Event) => {
      const next = (event as CustomEvent<BranchRequiredDetail>).detail?.kind;
      if (next !== "pick" && next !== "assign") {
        return;
      }
      shownAtBranchIdRef.current = branchId;
      setKind(next);
    };
    window.addEventListener(BRANCH_REQUIRED_EVENT, onRequired);
    return () => window.removeEventListener(BRANCH_REQUIRED_EVENT, onRequired);
  }, [branchId]);

  useEffect(() => {
    if (kind !== "pick") {
      return;
    }
    if (branchId.trim() && branchId !== shownAtBranchIdRef.current) {
      setKind(null);
    }
  }, [branchId, kind]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (kind === "pick") {
      document.documentElement.dataset.branchNudge = "pick";
    } else {
      delete document.documentElement.dataset.branchNudge;
    }
    return () => {
      delete document.documentElement.dataset.branchNudge;
    };
  }, [kind]);

  const onChooseLocation = useCallback(() => {
    if (focusVisibleBranchSelect()) {
      return;
    }
    requestOpenShellMore();
    window.setTimeout(() => {
      focusVisibleBranchSelect();
    }, 180);
  }, []);

  if (!kind) {
    return null;
  }

  const copy = COPY[kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "branch-required-banner shrink-0 border-b px-4 py-2.5 sm:px-6",
        "border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]",
        "bg-[color-mix(in_srgb,var(--primary)_9%,var(--background))]",
        "text-foreground",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground"
          aria-hidden
        >
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[1.05rem] font-semibold leading-tight tracking-tight">
            {copy.title}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-[color-mix(in_srgb,var(--foreground)_78%,var(--primary))]">
            {copy.body}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {copy.action ? (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={onChooseLocation}
            >
              {copy.action}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            onClick={() => setKind(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
