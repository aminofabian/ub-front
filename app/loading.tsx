import type { CSSProperties } from "react";

/**
 * Storefront opening screen — one 15s story.
 *
 * A shopfront on the Kiosk paper wakes from dawn: the signboard lamp stutters
 * on, the awning rolls down, the side windows warm, stock is set out on the
 * shelves, a key turns in the lock, and the door swings inward to "Karibu".
 * The same screen greets a shopper opening a storefront and staff opening the
 * console, so it is a brand moment rather than a spinner.
 *
 * All choreography lives in `globals.css` (`.kiosk-shop-*`) so the scene paints
 * before any JavaScript runs, and reduced motion holds the finished open shop
 * on a still frame.
 */

const AWNING_STRIPES = 12;
const AWNING_WIDTH = 240;

/** Scalloped edge: a straight fascia and 24 half-round drops. */
const AWNING_PATH = `M0 0H${AWNING_WIDTH}V22${"q-5 12 -10 0".repeat(24)}Z`;

const SHELVES: { className: string; stock: string[] }[] = [
  { className: "kiosk-shop-shelf--top", stock: ["jar", "bottle", "box", "can"] },
  { className: "kiosk-shop-shelf--middle", stock: ["box", "tall", "jar", "bottle"] },
  { className: "kiosk-shop-shelf--bottom", stock: ["can", "jar", "tall", "box"] },
];

function Awning() {
  return (
    <svg
      className="kiosk-shop-awning"
      viewBox={`0 0 ${AWNING_WIDTH} 34`}
      width={AWNING_WIDTH}
      height={34}
      aria-hidden
    >
      <defs>
        <clipPath id="kiosk-shop-awning-clip">
          <path d={AWNING_PATH} />
        </clipPath>
      </defs>
      <g clipPath="url(#kiosk-shop-awning-clip)">
        {Array.from({ length: AWNING_STRIPES }, (_, index) => (
          <rect
            key={index}
            x={index * (AWNING_WIDTH / AWNING_STRIPES)}
            width={AWNING_WIDTH / AWNING_STRIPES}
            height={34}
            fill={index % 2 === 0 ? "#b5532f" : "#f4f1ea"}
          />
        ))}
        <rect width={AWNING_WIDTH} height={5} fill="#000" opacity={0.1} />
      </g>
    </svg>
  );
}

export default function Loading() {
  return (
    <div className="kiosk-shop-loader" role="status" aria-live="polite">
      <span className="sr-only">Opening the shop</span>

      <div className="kiosk-shop-stage">
        <div className="kiosk-shop" aria-hidden="true">
          <div className="kiosk-shop-wall" />
          <div className="kiosk-shop-tint" />

          <div className="kiosk-shop-window kiosk-shop-window--left">
            <div className="kiosk-shop-window-glow" />
          </div>
          <div className="kiosk-shop-window kiosk-shop-window--right">
            <div className="kiosk-shop-window-glow" />
          </div>

          <div className="kiosk-shop-signboard">Kiosk</div>

          <Awning />
          <div className="kiosk-shop-awning-shadow" />

          <div className="kiosk-shop-doorway">
            <div className="kiosk-shop-interior">
              {SHELVES.map((shelf, shelfIndex) => (
                <div key={shelf.className} className={`kiosk-shop-shelf ${shelf.className}`}>
                  {shelf.stock.map((kind, itemIndex) => (
                    <span
                      key={`${kind}-${itemIndex}`}
                      className={`kiosk-shop-item kiosk-shop-${kind}`}
                      style={{ "--stock-index": shelfIndex * 4 + itemIndex } as CSSProperties}
                    />
                  ))}
                </div>
              ))}

              <div className="kiosk-shop-bell" />
              <span className="kiosk-shop-ding" />
              <span className="kiosk-shop-ding kiosk-shop-ding--b" />
              <div className="kiosk-shop-dim" />
            </div>

            <div className="kiosk-shop-door">
              <div className="kiosk-shop-glass" />
              <div className="kiosk-shop-sign">
                <span className="kiosk-shop-sign-closed">Closed</span>
                <span className="kiosk-shop-sign-open">Open</span>
              </div>
              <div className="kiosk-shop-panel kiosk-shop-panel--upper" />
              <div className="kiosk-shop-panel kiosk-shop-panel--lower" />
              <div className="kiosk-shop-plate" />
              <div className="kiosk-shop-handle" />
            </div>

            <svg
              className="kiosk-shop-key"
              viewBox="0 0 54 14"
              fill="none"
              stroke="#c9a24a"
              strokeWidth={2.6}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M1 7H38M7 7v4.5M13 7v3.5M19 7v5" />
              <circle cx="45" cy="7" r="5.2" />
            </svg>
            <div className="kiosk-shop-click" />
          </div>

          <div className="kiosk-shop-glow" />
          <div className="kiosk-shop-mat" />
          <div className="kiosk-shop-ground" />
        </div>

        <div className="kiosk-shop-status" aria-hidden="true">
          <span className="kiosk-shop-status--1">Waking up the shop</span>
          <span className="kiosk-shop-status--2">Turning the key</span>
          <span className="kiosk-shop-status--3">Setting out the stock</span>
          <span className="kiosk-shop-status--4">Karibu</span>
        </div>
        <div className="kiosk-shop-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
