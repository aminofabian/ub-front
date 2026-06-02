import { ImageResponse } from "next/og";

import {
  PlatformMarkOg,
  platformOgBackground,
} from "@/lib/platform-mark-og";
import { PLATFORM_TITLE } from "@/lib/platform-seo";

export const alt = PLATFORM_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 56,
          background: platformOgBackground(),
          fontFamily:
            'Georgia, "Times New Roman", ui-serif, serif',
        }}
      >
        <PlatformMarkOg markSize={200} showWordmark />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 56,
            maxWidth: 520,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "0.14em",
              color: "#7d8f80",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Point of sale · storefront · cashier
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: "#b8c4ba",
              lineHeight: 1.45,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
          >
            Scan barcodes, take M-Pesa, keep selling when the network drops.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
