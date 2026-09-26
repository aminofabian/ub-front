import { NextResponse } from "next/server";

import {
  isJevConfigured,
  JevError,
  toolGuard,
  type ToolGuardInput,
} from "@/lib/jev";
import { gateFromToolGuardDecision } from "@/lib/jev-gate";

export const runtime = "nodejs";

type Body = Partial<ToolGuardInput> & {
  /** When true, skip the remote call and return gate=skipped (tests / offline). */
  dryRun?: boolean;
};

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return out.length > 0 ? out : undefined;
}

/**
 * Server-side proxy for Jev tool-guard so `JEV_API_KEY` never reaches the browser.
 * Used by consequential UI paths (e.g. void sale) as an advisory gate.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const tool = typeof body.tool === "string" ? body.tool.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!tool || !action) {
    return NextResponse.json(
      { error: "tool and action are required." },
      { status: 400 },
    );
  }

  if (body.dryRun || !isJevConfigured()) {
    return NextResponse.json({
      skipped: true,
      configured: isJevConfigured(),
      gate: "skipped" as const,
      decision: null,
      guidance:
        "Jev is not configured (set JEV_API_KEY). Proceeding without a judgment signal.",
    });
  }

  try {
    const data = await toolGuard({
      tool,
      action,
      arguments_summary: asStringArray(body.arguments_summary),
      side_effects: asStringArray(body.side_effects),
      safeguards: asStringArray(body.safeguards),
      policy: asStringArray(body.policy),
      reversibility:
        typeof body.reversibility === "string"
          ? body.reversibility.trim()
          : undefined,
    });

    return NextResponse.json({
      skipped: false,
      configured: true,
      gate: gateFromToolGuardDecision(data.decision),
      decision: data.decision,
      confidence: data.confidence ?? null,
      probabilities: data.probabilities ?? null,
      guidance: data.guidance ?? null,
      guidance_source: data.guidance_source ?? null,
    });
  } catch (err) {
    const message =
      err instanceof JevError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Jev tool-guard failed.";
    // Fail closed on the signal: require human confirmation, do not auto-allow.
    return NextResponse.json(
      {
        skipped: false,
        configured: true,
        gate: "require_confirmation" as const,
        decision: null,
        guidance: message,
        error: message,
      },
      { status: err instanceof JevError && err.status === 401 ? 502 : 200 },
    );
  }
}
