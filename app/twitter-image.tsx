import { ImageResponse } from "next/og";

import {
  PlatformMarkOg,
  platformOgBackground,
} from "@/lib/platform-mark-og";
import { PLATFORM_TITLE } from "@/lib/platform-seo";

export const alt = PLATFORM_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: platformOgBackground(),
        }}
      >
        <PlatformMarkOg markSize={240} showWordmark />
      </div>
    ),
    { ...size },
  );
}
