"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/components/storefront/templates/store/print-atelier.module.css";

/**
 * Filament fly-to-cart — a product orb arcs into the bag while sage
 * "filament" dots extrude along the path, then the bag squash-pops.
 */
export const PRINT_ATELIER_FLY_EVENT = "print-atelier-fly";
export const PRINT_ATELIER_BAG_TARGET = "print-atelier-bag";

export type PrintAtelierFlyDetail = {
  x: number;
  y: number;
  imageUrl?: string | null;
  label?: string | null;
};

export function triggerPrintAtelierFly(
  origin: HTMLElement | DOMRect | null | undefined,
  imageUrl?: string | null,
  label?: string | null,
) {
  if (typeof window === "undefined") return;
  const rect =
    origin instanceof HTMLElement ? origin.getBoundingClientRect() : origin;
  if (!rect) return;
  window.dispatchEvent(
    new CustomEvent<PrintAtelierFlyDetail>(PRINT_ATELIER_FLY_EVENT, {
      detail: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        imageUrl: imageUrl ?? null,
        label: label ?? null,
      },
    }),
  );
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function bezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

type Flight = {
  id: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  imageUrl: string | null;
  label: string | null;
};

export function PrintAtelierFlyLayer() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const onFly = (ev: Event) => {
      const detail = (ev as CustomEvent<PrintAtelierFlyDetail>).detail;
      if (!detail) return;
      const bag = document.querySelector<HTMLElement>(
        `[data-${PRINT_ATELIER_BAG_TARGET}]`,
      );
      const bagRect = bag?.getBoundingClientRect();
      const tx = bagRect
        ? bagRect.left + bagRect.width / 2
        : window.innerWidth - 36;
      const ty = bagRect ? bagRect.top + bagRect.height / 2 : 48;
      const id = ++idRef.current;
      setFlights((prev) => [
        ...prev,
        {
          id,
          sx: detail.x,
          sy: detail.y,
          tx,
          ty,
          imageUrl: detail.imageUrl ?? null,
          label: detail.label ?? null,
        },
      ]);
      if (bag) {
        bag.classList.remove(styles.bagBtnPulse);
        void bag.offsetWidth;
        bag.classList.add(styles.bagBtnPulse);
        window.setTimeout(() => bag.classList.remove(styles.bagBtnPulse), 600);
      }
      const count = bag?.parentElement?.querySelector(`.${styles.bagCount}`);
      if (count instanceof HTMLElement) {
        count.classList.remove(styles.bagCountPop);
        void count.offsetWidth;
        count.classList.add(styles.bagCountPop);
        window.setTimeout(() => count.classList.remove(styles.bagCountPop), 560);
      }
    };
    window.addEventListener(PRINT_ATELIER_FLY_EVENT, onFly);
    return () => window.removeEventListener(PRINT_ATELIER_FLY_EVENT, onFly);
  }, []);

  return (
    <div className={styles.flyLayer} aria-hidden>
      {flights.map((f) => (
        <FlightVisual
          key={f.id}
          flight={f}
          onDone={() =>
            setFlights((prev) => prev.filter((x) => x.id !== f.id))
          }
        />
      ))}
    </div>
  );
}

function FlightVisual({
  flight,
  onDone,
}: {
  flight: Flight;
  onDone: () => void;
}) {
  const orbRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orb = orbRef.current;
    const dotsHost = dotsRef.current;
    if (!orb || !dotsHost) return;

    const { sx, sy, tx, ty } = flight;
    const midX = sx + (tx - sx) * 0.45;
    const midY = Math.min(sy, ty) - 80 - Math.abs(tx - sx) * 0.12;
    const c1x = sx + (midX - sx) * 0.5;
    const c1y = sy - 40;
    const c2x = midX + (tx - midX) * 0.35;
    const c2y = midY;

    const duration = 720;
    const start = performance.now();
    const dots: HTMLSpanElement[] = [];
    for (let i = 0; i < 10; i++) {
      const d = document.createElement("span");
      d.className = styles.flyDot;
      d.style.opacity = "0";
      dotsHost.appendChild(d);
      dots.push(d);
    }

    let raf = 0;
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / duration);
      const t = easeOutCubic(raw);
      const x = bezier(t, sx, c1x, c2x, tx);
      const y = bezier(t, sy, c1y, c2y, ty);
      const scale = 1 - t * 0.72;
      const rot = t * 38;
      orb.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`;
      orb.style.opacity = String(1 - Math.max(0, (t - 0.82) / 0.18));

      dots.forEach((d, i) => {
        const dt = Math.max(0, t - i * 0.045);
        if (dt <= 0) {
          d.style.opacity = "0";
          return;
        }
        const ft = Math.min(1, dt);
        const dx = bezier(ft, sx, c1x, c2x, tx);
        const dy = bezier(ft, sy, c1y, c2y, ty);
        d.style.transform = `translate(${dx}px, ${dy}px) scale(${1 - ft * 0.5})`;
        d.style.opacity = String(Math.max(0, 0.9 - ft * 0.95));
      });

      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    };
    orb.style.transform = `translate(${sx}px, ${sy}px) scale(1)`;
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      dots.forEach((d) => d.remove());
    };
  }, [flight, onDone]);

  return (
    <div ref={dotsRef}>
      <div ref={orbRef} className={styles.flyOrb}>
        {flight.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flight.imageUrl} alt="" />
        ) : (
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: "100%",
              height: "100%",
              fontSize: 10,
              fontWeight: 600,
              padding: 4,
              textAlign: "center",
            }}
          >
            {(flight.label ?? "Add").slice(0, 18)}
          </span>
        )}
      </div>
    </div>
  );
}
