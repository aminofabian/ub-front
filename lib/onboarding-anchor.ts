"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  OnboardingEmphasisId,
  OnboardingTargetId,
} from "@/lib/onboarding-tour";
import {
  isOnboardingDrawerTarget,
  onboardingEmphasisSelector,
  onboardingTargetSelector,
} from "@/lib/onboarding-tour";

const PADDING = 10;
const POLL_MS = 120;
const MAX_WAIT_MS = 12_000;
const VIEWPORT_MARGIN = 16;
const CARD_GAP = 12;
const DEFAULT_CARD_WIDTH = 384;
const DEFAULT_CARD_HEIGHT = 300;

export type TargetAnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

export type TourCardPosition = {
  top: number;
  left: number;
};

export function measureOnboardingTarget(
  target: OnboardingTargetId | null,
): TargetAnchorRect | null {
  if (!target) {
    return null;
  }
  const el = document.querySelector(onboardingTargetSelector(target));
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) {
    return null;
  }
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    bottom: box.bottom,
    right: box.right,
  };
}

export function measureOnboardingEmphasis(
  id: OnboardingEmphasisId | null,
): TargetAnchorRect | null {
  if (!id) {
    return null;
  }
  const el = document.querySelector(onboardingEmphasisSelector(id));
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) {
    return null;
  }
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    bottom: box.bottom,
    right: box.right,
  };
}

/** Padded rect for the spotlight ring. */
export function spotlightRectFromTarget(
  target: TargetAnchorRect,
): TargetAnchorRect {
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad =
    target.height >= vh * 0.45 ? 2 : PADDING;
  return {
    top: Math.max(VIEWPORT_MARGIN, target.top - pad),
    left: Math.max(VIEWPORT_MARGIN, target.left - pad),
    width: target.width + pad * 2,
    height: target.height + pad * 2,
    bottom: target.bottom + pad,
    right: target.right + pad,
  };
}

function rectanglesOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  gap = 8,
): boolean {
  return !(
    a.right + gap < b.left ||
    a.left - gap > b.right ||
    a.bottom + gap < b.top ||
    a.top - gap > b.bottom
  );
}

/** Right-edge drawer width estimate (matches FormDrawer breakpoints). */
export function estimatedDrawerWidth(
  vw: number,
  variant: "default" | "wide" | "extraWide" = "wide",
): number {
  if (vw < 640) {
    return vw;
  }
  if (variant === "extraWide") {
    return Math.min(92 * 16, vw - 20);
  }
  if (variant === "default") {
    return Math.min(36 * 16, vw - 20);
  }
  return Math.min(vw - 20, 48 * 16); // sm:max-w-3xl
}

/** Left edge of the open right-side drawer, for page-only dimming. */
export function measureOpenDrawerLeftEdge(
  onboardingTargetId?: OnboardingTargetId | null,
): number {
  const vw = window.innerWidth;

  if (onboardingTargetId) {
    const el = document.querySelector(onboardingTargetSelector(onboardingTargetId));
    if (el) {
      const box = el.getBoundingClientRect();
      if (box.width >= 120 && box.height >= 120) {
        return Math.max(0, box.left);
      }
    }
  }

  let bestLeft = 0;
  let bestWidth = 0;
  for (const el of document.querySelectorAll('[role="dialog"]')) {
    const box = el.getBoundingClientRect();
    if (box.width < 200 || box.height < 200) {
      continue;
    }
    if (box.right < vw - 8) {
      continue;
    }
    if (box.width > bestWidth) {
      bestWidth = box.width;
      bestLeft = box.left;
    }
  }
  if (bestWidth > 0) {
    return bestLeft;
  }
  return Math.max(
    0,
    vw - estimatedDrawerWidth(vw),
  );
}

/** Width of the page-only dim panel — never overlaps the drawer target. */
export function pageOnlyDimWidth(
  anchor: TargetAnchorRect | null,
  onboardingTargetId?: OnboardingTargetId | null,
): number {
  if (anchor) {
    return Math.max(0, anchor.left - CARD_GAP);
  }
  return measureOpenDrawerLeftEdge(onboardingTargetId);
}

/** Card in the dimmed page lane — never covers the open drawer. */
export function computePageLeftCardPosition(
  target: TargetAnchorRect,
  card: { width: number; height: number },
): TourCardPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardH = card.height;
  const laneRight = target.left - CARD_GAP;
  const maxCardW = laneRight - VIEWPORT_MARGIN;
  const minLaneForSideCard = 220;

  const targetBox = {
    left: target.left,
    top: target.top,
    right: target.right,
    bottom: target.bottom,
  };

  const placeBottomLeft = () => {
    const left = VIEWPORT_MARGIN;
    const top = Math.max(VIEWPORT_MARGIN, vh - cardH - VIEWPORT_MARGIN);
    return { left, top };
  };

  if (vw < 640 || maxCardW < minLaneForSideCard) {
    return placeBottomLeft();
  }

  const left = VIEWPORT_MARGIN;
  const cardW = Math.min(card.width, maxCardW);

  const top = Math.max(
    VIEWPORT_MARGIN,
    Math.min((vh - cardH) / 2, vh - cardH - VIEWPORT_MARGIN),
  );

  const cardBox = {
    left,
    top,
    right: left + cardW,
    bottom: top + cardH,
  };
  if (rectanglesOverlap(cardBox, targetBox)) {
    return placeBottomLeft();
  }

  return { left, top };
}

export function computeTourCardPosition(
  target: TargetAnchorRect,
  card: { width: number; height: number },
  mode: "near-target" | "page-left" = "near-target",
): TourCardPosition {
  if (mode === "page-left") {
    return computePageLeftCardPosition(target, card);
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(card.width, vw - VIEWPORT_MARGIN * 2);
  const cardH = card.height;

  const targetCenterX = target.left + target.width / 2;
  const preferLeft = targetCenterX > vw * 0.55;

  const candidates: TourCardPosition[] = [];

  if (preferLeft) {
    candidates.push({
      left: target.left - cardW - CARD_GAP,
      top: target.top + target.height / 2 - cardH / 2,
    });
  } else {
    candidates.push({
      left: target.right + CARD_GAP,
      top: target.top + target.height / 2 - cardH / 2,
    });
  }

  candidates.push(
    {
      left: target.left + target.width / 2 - cardW / 2,
      top: target.bottom + CARD_GAP,
    },
    {
      left: target.left + target.width / 2 - cardW / 2,
      top: target.top - cardH - CARD_GAP,
    },
  );

  if (!preferLeft) {
    candidates.unshift({
      left: target.left - cardW - CARD_GAP,
      top: target.top + target.height / 2 - cardH / 2,
    });
  } else {
    candidates.push({
      left: target.right + CARD_GAP,
      top: target.top + target.height / 2 - cardH / 2,
    });
  }

  const targetBox = {
    left: target.left,
    top: target.top,
    right: target.right,
    bottom: target.bottom,
  };

  for (const pos of candidates) {
    const clamped = clampToViewport(pos, cardW, cardH, vw, vh);
    const cardBox = {
      left: clamped.left,
      top: clamped.top,
      right: clamped.left + cardW,
      bottom: clamped.top + cardH,
    };
    if (
      fitsViewport(clamped, cardW, cardH, vw, vh) &&
      !rectanglesOverlap(cardBox, targetBox)
    ) {
      return clamped;
    }
  }

  return computePageLeftCardPosition(target, card);
}

function clampToViewport(
  pos: TourCardPosition,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): TourCardPosition {
  return {
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.min(pos.left, vw - cardW - VIEWPORT_MARGIN),
    ),
    top: Math.max(
      VIEWPORT_MARGIN,
      Math.min(pos.top, vh - cardH - VIEWPORT_MARGIN),
    ),
  };
}

function fitsViewport(
  pos: TourCardPosition,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): boolean {
  return (
    pos.left >= VIEWPORT_MARGIN &&
    pos.top >= VIEWPORT_MARGIN &&
    pos.left + cardW <= vw - VIEWPORT_MARGIN &&
    pos.top + cardH <= vh - VIEWPORT_MARGIN
  );
}

export function useOnboardingTargetAnchor(
  target: OnboardingTargetId | null,
  active: boolean,
): TargetAnchorRect | null {
  const [rect, setRect] = useState<TargetAnchorRect | null>(null);

  const update = useCallback(() => {
    if (!active) {
      setRect(null);
      return;
    }
    setRect(measureOnboardingTarget(target));
  }, [active, target]);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }
    if (!target) {
      setRect(null);
      return;
    }

    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isDrawerTarget = isOnboardingDrawerTarget(target);
    const maxWait = isDrawerTarget ? 1_500 : MAX_WAIT_MS;
    const pollEvery = isDrawerTarget ? 80 : POLL_MS;
    let scrolled = false;

    const tick = () => {
      const next = measureOnboardingTarget(target);
      if (next) {
        setRect(next);
        if (!scrolled) {
          scrolled = true;
          document
            .querySelector(onboardingTargetSelector(target))
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
      if (Date.now() - started < maxWait) {
        timer = setTimeout(tick, pollEvery);
      }
    };

    tick();
    const onLayout = () => update();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [active, target, update]);

  return rect;
}

export function useOnboardingEmphasisAnchor(
  emphasis: OnboardingEmphasisId | null,
  active: boolean,
): TargetAnchorRect | null {
  const [rect, setRect] = useState<TargetAnchorRect | null>(null);

  const update = useCallback(() => {
    if (!active) {
      setRect(null);
      return;
    }
    setRect(measureOnboardingEmphasis(emphasis));
  }, [active, emphasis]);

  useEffect(() => {
    if (!active || !emphasis) {
      setRect(null);
      return;
    }

    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scrolled = false;

    const tick = () => {
      const next = measureOnboardingEmphasis(emphasis);
      if (next) {
        setRect(next);
        if (!scrolled) {
          scrolled = true;
          document
            .querySelector(onboardingEmphasisSelector(emphasis))
            ?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
      if (Date.now() - started < 1_500) {
        timer = setTimeout(tick, 80);
      }
    };

    tick();
    const onLayout = () => update();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [active, emphasis, update]);

  return rect;
}

export const ONBOARDING_CARD_SIZE_DEFAULT: {
  width: number;
  height: number;
} = {
  width: DEFAULT_CARD_WIDTH,
  height: DEFAULT_CARD_HEIGHT,
};
