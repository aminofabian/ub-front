import { PLATFORM_APP_ICON_SRC } from "@/lib/platform-brand-assets";

/**
 * Route + storefront opening screen.
 *
 * One gesture: the shop door eases open and the light comes out. Nothing else
 * moves — a loading screen is on screen for a second, so it gets a single
 * composed frame rather than a story. The hairline under the label is the only
 * continuous motion, and it stays indeterminate on purpose.
 *
 * All of it is CSS in `globals.css` (`.kiosk-shop-*`), so the scene paints
 * before any JavaScript runs; reduced motion holds the open door still.
 */

const AWNING_STRIPES = 12;
const AWNING_WIDTH = 240;
const AWNING_DROP = AWNING_WIDTH / AWNING_STRIPES;

/** Scalloped edge: a straight fascia and one shallow drop per stripe. */
const AWNING_PATH = `M0 0H${AWNING_WIDTH}V17${`q-${AWNING_DROP / 2} 6 -${AWNING_DROP} 0`.repeat(
  AWNING_STRIPES,
)}Z`;

function Awning() {
  return (
    <svg
      className="kiosk-shop-awning"
      viewBox={`0 0 ${AWNING_WIDTH} 26`}
      width={AWNING_WIDTH}
      height={26}
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
            x={index * AWNING_DROP}
            width={AWNING_DROP}
            height={26}
            className={
              index % 2 === 0
                ? "kiosk-shop-awning-stripe"
                : "kiosk-shop-awning-stripe kiosk-shop-awning-stripe--alt"
            }
          />
        ))}
        {/* The rail the cloth hangs from — it turns twelve stripes into one awning. */}
        <rect className="kiosk-shop-awning-rail" width={AWNING_WIDTH} height={4} />
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

          <div className="kiosk-shop-fascia">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="kiosk-shop-mark"
              src={PLATFORM_APP_ICON_SRC}
              alt=""
              width={24}
              height={24}
              draggable={false}
            />
            <span className="kiosk-shop-name">Kiosk</span>
          </div>

          <Awning />

          <div className="kiosk-shop-window kiosk-shop-window--left" />
          <div className="kiosk-shop-window kiosk-shop-window--right" />

          <div className="kiosk-shop-doorway">
            <div className="kiosk-shop-interior">
              <div className="kiosk-shop-shelf kiosk-shop-shelf--upper">
                <span className="kiosk-shop-jar" />
                <span className="kiosk-shop-box" />
                <span className="kiosk-shop-bottle" />
              </div>
              <div className="kiosk-shop-shelf kiosk-shop-shelf--lower">
                <span className="kiosk-shop-can" />
                <span className="kiosk-shop-tall" />
                <span className="kiosk-shop-jar" />
              </div>
            </div>

            <div className="kiosk-shop-door">
              <span className="kiosk-shop-glass" />
              <span className="kiosk-shop-panel kiosk-shop-panel--upper" />
              <span className="kiosk-shop-panel kiosk-shop-panel--lower" />
              <span className="kiosk-shop-handle" />
            </div>
          </div>

          <div className="kiosk-shop-glow" />
          <div className="kiosk-shop-step" />
        </div>

        <div className="kiosk-shop-foot">
          <p className="kiosk-shop-status">Opening the shop</p>
          <span className="kiosk-shop-bar" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
