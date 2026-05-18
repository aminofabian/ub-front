"use client";

import { useId, useMemo } from "react";

import { cn } from "@/lib/utils";
import type { TargetAnchorRect } from "@/lib/onboarding-anchor";
import {
  spotlightRectFromTarget,
  useOnboardingEmphasisAnchor,
  useOnboardingTargetAnchor,
} from "@/lib/onboarding-anchor";
import type {
  OnboardingEmphasisId,
  OnboardingTargetId,
} from "@/lib/onboarding-tour";

type DimMode = "full" | "page-only";

const CUTOUT_DIM_Z = 45;
const DRAWER_RING_Z = 210;
const EMPHASIS_RING_Z = 220;
const FULL_DIM_Z = 300;

type Props = {
  target: OnboardingTargetId | null;
  emphasisTarget?: OnboardingEmphasisId | null;
  active: boolean;
  dimMode?: DimMode;
};

function TourBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/55 backdrop-blur-[2px]",
        className,
      )}
      style={{ zIndex: FULL_DIM_Z }}
      aria-hidden
    />
  );
}

function DrawerCutoutOverlay({ anchor }: { anchor: TargetAnchorRect }) {
  const maskId = useId().replace(/:/g, "");
  const pad = 3;
  const hole = {
    x: Math.max(0, anchor.left - pad),
    y: Math.max(0, anchor.top - pad),
    w: anchor.width + pad * 2,
    h: anchor.height + pad * 2,
  };

  return (
    <svg
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: CUTOUT_DIM_Z }}
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={hole.x}
            y={hole.y}
            width={hole.w}
            height={hole.h}
            rx="16"
            ry="16"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.55)"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

function SpotlightRing({
  rect,
  ringOnly,
}: {
  rect: { top: number; left: number; width: number; height: number };
  ringOnly?: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed rounded-l-2xl ring-2 ring-primary/80 ring-offset-2 ring-offset-transparent transition-[top,left,width,height] duration-200"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: ringOnly ? DRAWER_RING_Z : FULL_DIM_Z,
        ...(ringOnly
          ? {}
          : { boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)" }),
      }}
    />
  );
}

function EmphasisRing({
  rect,
}: {
  rect: { top: number; left: number; width: number; height: number };
}) {
  return (
    <div
      className="pointer-events-none fixed rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse transition-[top,left,width,height] duration-200"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: EMPHASIS_RING_Z,
      }}
      aria-hidden
    />
  );
}

export function OnboardingSpotlight({
  target,
  emphasisTarget = null,
  active,
  dimMode = "full",
}: Props) {
  const anchor = useOnboardingTargetAnchor(target, active);
  const emphasisAnchor = useOnboardingEmphasisAnchor(
    emphasisTarget,
    active && !!emphasisTarget,
  );
  const ringRect = useMemo(
    () => (anchor ? spotlightRectFromTarget(anchor) : null),
    [anchor],
  );
  const emphasisRingRect = useMemo(
    () => (emphasisAnchor ? spotlightRectFromTarget(emphasisAnchor) : null),
    [emphasisAnchor],
  );

  if (!active) {
    return null;
  }

  if (!target) {
    return <TourBackdrop />;
  }

  if (dimMode === "page-only") {
    if (!anchor || !ringRect) {
      return null;
    }
    return (
      <>
        <DrawerCutoutOverlay anchor={anchor} />
        <SpotlightRing rect={ringRect} ringOnly />
        {emphasisRingRect ? <EmphasisRing rect={emphasisRingRect} /> : null}
      </>
    );
  }

  if (!ringRect) {
    return <TourBackdrop />;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: FULL_DIM_Z }}
      aria-hidden
    >
      <TourBackdrop className="bg-transparent backdrop-blur-none" />
      <SpotlightRing rect={ringRect} />
    </div>
  );
}
