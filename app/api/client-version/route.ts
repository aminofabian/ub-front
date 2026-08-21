import { NextResponse } from "next/server";

/**
 * Live build id for tills that still have an older JS bundle in memory.
 * Compared against NEXT_PUBLIC_CLIENT_BUILD_ID baked into the client.
 */
export async function GET() {
  const buildId =
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_CLIENT_BUILD_ID?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    "dev";

  return NextResponse.json(
    { buildId },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
