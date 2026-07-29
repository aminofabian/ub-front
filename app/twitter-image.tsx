import { ImageResponse } from "next/og";

import {
  PlatformMarkOg,
  platformAppIconDataUrl,
  platformOgBackground,
} from "@/lib/platform-mark-og";
import {
  PLATFORM_OG_DESCRIPTION,
  PLATFORM_TITLE,
} from "@/lib/platform-seo";

export const alt = PLATFORM_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  const markSrc = await platformAppIconDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
          background: platformOgBackground(),
        }}
      >
        <PlatformMarkOg markSize={180} showWordmark={false} markSrc={markSrc} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 44,
            maxWidth: 620,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f4f7f4",
              lineHeight: 1.1,
              marginBottom: 18,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
          >
            Kiosk.ke
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: "#b8c4ba",
              lineHeight: 1.4,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
          >
            {PLATFORM_OG_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
