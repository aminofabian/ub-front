import { ImageResponse } from "next/og";

import {
  PlatformMarkOg,
  platformAppIconDataUrl,
  platformOgBackground,
} from "@/lib/platform-mark-og";
import {
  PLATFORM_OG_DESCRIPTION,
  PLATFORM_TAGLINE,
  PLATFORM_TITLE,
} from "@/lib/platform-seo";

export const dynamic = "force-static";

export const alt = PLATFORM_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
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
          padding: 56,
          background: platformOgBackground(),
          fontFamily:
            'Georgia, "Times New Roman", ui-serif, serif',
        }}
      >
        <PlatformMarkOg markSize={220} showWordmark={false} markSrc={markSrc} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
            maxWidth: 640,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "#45D078",
              textTransform: "uppercase",
              marginBottom: 18,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
          >
            {PLATFORM_TAGLINE}
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f4f7f4",
              lineHeight: 1.1,
              marginBottom: 22,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
          >
            Kiosk.ke
          </div>
          <div
            style={{
              fontSize: 30,
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
