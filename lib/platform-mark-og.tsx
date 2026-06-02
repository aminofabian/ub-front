/** Layout primitives for `next/og` — uses the canonical SVG mark via data URL. */

import { platformLogoMarkDataUrl } from "@/lib/platform-logo-mark";

const LANDING_BG =
  "linear-gradient(145deg, #0f1410 0%, #1a221c 48%, #0d120e 100%)";

type PlatformMarkOgProps = {
  /** Mark tile size in px (square). */
  markSize: number;
  showWordmark?: boolean;
};

export function platformOgBackground(): string {
  return LANDING_BG;
}

export function PlatformMarkOg({
  markSize,
  showWordmark = false,
}: PlatformMarkOgProps) {
  const markSrc = platformLogoMarkDataUrl(
    showWordmark ? "kiosk-og-lockup" : "kiosk-og-mark",
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: showWordmark ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: showWordmark ? Math.round(markSize * 0.28) : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          width: markSize,
          height: markSize,
          borderRadius: Math.round(markSize * 0.28),
          boxShadow: showWordmark
            ? "0 20px 52px rgba(40, 167, 69, 0.38), 0 4px 12px rgba(0,0,0,0.25)"
            : "0 6px 20px rgba(24, 107, 48, 0.4)",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={markSrc}
          alt=""
          width={markSize}
          height={markSize}
          style={{ width: markSize, height: markSize, display: "block" }}
        />
      </div>
      {showWordmark ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: Math.round(markSize * 0.34),
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#f4f7f4",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Kiosk
          </div>
          <div
            style={{
              marginTop: Math.round(markSize * 0.08),
              fontSize: Math.round(markSize * 0.11),
              fontWeight: 500,
              letterSpacing: "0.2em",
              color: "#8fa894",
              textTransform: "uppercase",
            }}
          >
            POS · Kenya
          </div>
        </div>
      ) : null}
    </div>
  );
}
