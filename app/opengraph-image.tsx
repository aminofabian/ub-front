import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  PlatformMarkOg,
  platformAppIconDataUrl,
} from "@/lib/platform-mark-og";
import {
  PLATFORM_TAGLINE,
  PLATFORM_TITLE,
} from "@/lib/platform-seo";

export const dynamic = "force-static";

export const alt = PLATFORM_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [markSrc, cormorant, manrope] = await Promise.all([
    platformAppIconDataUrl(),
    readFile(
      join(
        process.cwd(),
        "app/fonts/og/cormorant-garamond-400.ttf",
      ),
    ),
    readFile(
      join(process.cwd(), "app/fonts/og/manrope-400.ttf"),
    ),
  ]);

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
          background: "#F4F1EA",
          fontFamily:
            'Georgia, "Times New Roman", ui-serif, serif',
        }}
      >
        <PlatformMarkOg markSize={190} showWordmark={false} markSrc={markSrc} />
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
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#A55237",
              textTransform: "uppercase",
              marginBottom: 18,
              fontFamily: "Manrope",
            }}
          >
            {PLATFORM_TAGLINE}
          </div>
          <div
            style={{
              fontSize: 66,
              fontWeight: 400,
              letterSpacing: "-0.035em",
              color: "#121A16",
              lineHeight: 1.02,
              marginBottom: 22,
              fontFamily: "Cormorant",
            }}
          >
            Kiosk.ke
          </div>
          <div
            style={{
              fontSize: 27,
              fontWeight: 400,
              color: "#556159",
              lineHeight: 1.45,
              fontFamily: "Manrope",
            }}
          >
            Point of sale, M-Pesa at the counter, offline sales, and a
            storefront from one stock count.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Cormorant",
          data: cormorant,
          style: "normal",
          weight: 400,
        },
        {
          name: "Manrope",
          data: manrope,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
