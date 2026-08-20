import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** PWA / Apple touch icon — same as platform app icon. */
export default async function AppleIcon() {
  const bytes = await readFile(join(process.cwd(), "public/app-icon.png"));
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
