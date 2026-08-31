"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

import styles from "./waiting-boxes.module.css";

type CrateSpec = {
  x: number;
  y: number;
  rot: number;
  fill: string;
  delay: string;
  scatterX: number;
  scatterY: number;
};

const STAGE: CrateSpec[] = [
  {
    x: 50,
    y: 28,
    rot: -6,
    fill: "color-mix(in srgb, var(--primary) 82%, #3d2a14)",
    delay: "0ms",
    scatterX: -18,
    scatterY: -52,
  },
  {
    x: 32,
    y: 48,
    rot: 5,
    fill: "color-mix(in srgb, #c4a574 78%, var(--primary))",
    delay: "180ms",
    scatterX: -72,
    scatterY: -12,
  },
  {
    x: 68,
    y: 50,
    rot: -3,
    fill: "color-mix(in srgb, var(--primary) 55%, #e8d9b8)",
    delay: "320ms",
    scatterX: 74,
    scatterY: -18,
  },
  {
    x: 20,
    y: 72,
    rot: 8,
    fill: "color-mix(in srgb, #d7b07a 88%, #6b4a2b)",
    delay: "90ms",
    scatterX: -88,
    scatterY: 28,
  },
  {
    x: 50,
    y: 74,
    rot: -2,
    fill: "color-mix(in srgb, var(--primary) 70%, #1f3d28)",
    delay: "240ms",
    scatterX: 8,
    scatterY: 46,
  },
  {
    x: 80,
    y: 72,
    rot: 4,
    fill: "color-mix(in srgb, #e4c9a0 70%, var(--primary))",
    delay: "400ms",
    scatterX: 92,
    scatterY: 22,
  },
];

const COMPACT: CrateSpec[] = STAGE.slice(3).map((c, i) => ({
  ...c,
  x: 22 + i * 28,
  y: 52,
  delay: `${i * 140}ms`,
}));

const MINI: CrateSpec[] = [
  { ...STAGE[3], x: 22, y: 56, rot: -7, delay: "0ms" },
  { ...STAGE[4], x: 50, y: 56, rot: 3, delay: "120ms" },
  { ...STAGE[5], x: 78, y: 56, rot: 6, delay: "240ms" },
];

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const DRAG_THRESHOLD = 8;

type WaitingBoxesProps = {
  size?: "stage" | "compact" | "mini";
  className?: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function settle(el: HTMLElement, x: number, y: number): void {
  if (prefersReducedMotion() || (x === 0 && y === 0)) {
    el.style.setProperty("--dx", "0px");
    el.style.setProperty("--dy", "0px");
    return;
  }
  el.style.setProperty("--dx", `${x}px`);
  el.style.setProperty("--dy", `${y}px`);
  const from = el.animate(
    [
      {
        transform: `translate(${x}px, ${y}px) rotate(var(--rot, 0deg))`,
      },
      {
        transform: "translate(0px, 0px) rotate(var(--rot, 0deg))",
      },
    ],
    { duration: 480, easing: EASE_OUT, fill: "forwards" },
  );
  from.onfinish = () => {
    el.style.setProperty("--dx", "0px");
    el.style.setProperty("--dy", "0px");
    from.cancel();
  };
}

/**
 * Playable packing crates for reload / reconnect waits.
 * Idle bob is CSS; drag and scatter are pointer + WAAPI so they stay
 * interruptible and run off the main thread once started.
 */
export function WaitingBoxes({
  size = "stage",
  className,
}: WaitingBoxesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const crates = size === "mini" ? MINI : size === "compact" ? COMPACT : STAGE;

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    el.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number.parseFloat(el.style.getPropertyValue("--dx") || "0") || 0,
      originY: Number.parseFloat(el.style.getPropertyValue("--dy") || "0") || 0,
      moved: false,
    };
    el.dataset.held = "true";
    if (rootRef.current) {
      rootRef.current.dataset.held = "true";
    }
    el.getAnimations().forEach((a) => a.cancel());
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    const dx = drag.originX + (event.clientX - drag.startX);
    const dy = drag.originY + (event.clientY - drag.startY);
    if (Math.hypot(dx - drag.originX, dy - drag.originY) > DRAG_THRESHOLD) {
      drag.moved = true;
    }
    event.currentTarget.style.setProperty("--dx", `${dx}px`);
    event.currentTarget.style.setProperty("--dy", `${dy}px`);
  }, []);

  const release = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    const el = event.currentTarget;
    el.dataset.held = "false";
    if (rootRef.current) {
      rootRef.current.dataset.held = "false";
    }
    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) {
      el.getAnimations().forEach((a) => a.cancel());
      const hop = el.animate(
        [
          { transform: "translate(0px, 0px) rotate(var(--rot, 0deg))" },
          { transform: "translate(0px, -22px) rotate(var(--rot, 0deg))" },
          { transform: "translate(0px, 0px) rotate(var(--rot, 0deg))" },
        ],
        { duration: 420, easing: EASE_OUT },
      );
      hop.onfinish = () => hop.cancel();
      return;
    }
    settle(el, Number.parseFloat(el.style.getPropertyValue("--dx") || "0") || 0,
      Number.parseFloat(el.style.getPropertyValue("--dy") || "0") || 0);
  }, []);

  const scatter = useCallback(() => {
    if (prefersReducedMotion() || dragRef.current) {
      return;
    }
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const buttons = root.querySelectorAll<HTMLElement>("[data-crate]");
    buttons.forEach((el, i) => {
      const spec = crates[i];
      if (!spec) {
        return;
      }
      el.getAnimations().forEach((a) => a.cancel());
      el.style.setProperty("--dx", `${spec.scatterX}px`);
      el.style.setProperty("--dy", `${spec.scatterY}px`);
      window.setTimeout(() => settle(el, spec.scatterX, spec.scatterY), 520);
    });
  }, [crates]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) {
      return;
    }
    const id = window.setInterval(scatter, 7_200);
    return () => window.clearInterval(id);
  }, [scatter]);

  return (
    <div
      ref={rootRef}
      className={cn(styles.root, className)}
      data-size={size}
      aria-hidden="true"
      onDoubleClick={scatter}
    >
      <div className={styles.floor} aria-hidden />
      {crates.map((crate, i) => (
        <div
          key={i}
          className={styles.slot}
          style={
            {
              "--x": crate.x,
              "--y": crate.y,
              "--delay": crate.delay,
            } as CSSProperties
          }
        >
          <div className={styles.bob}>
            <div
              className={styles.crate}
              data-crate=""
              style={
                {
                  "--rot": `${crate.rot}deg`,
                  "--fill": crate.fill,
                  "--dx": "0px",
                  "--dy": "0px",
                } as CSSProperties
              }
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={release}
              onPointerCancel={release}
            >
              <span className={styles.body} />
              <span className={styles.lid} />
              <span className={styles.tape} />
              <span className={styles.flap} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
