/**
 * Client-safe helpers for interpreting Jev tool-guard signals.
 * Does not call Jev or read secrets — use `/api/jev/tool-guard` for that.
 */

export type ToolGuardGate =
  | "proceed"
  | "require_confirmation"
  | "block"
  | "skipped";

export type ToolGuardClientResult = {
  skipped: boolean;
  configured: boolean;
  gate: ToolGuardGate;
  decision: string | null;
  confidence?: number | null;
  probabilities?: Record<string, number> | null;
  guidance: string | null;
  guidance_source?: string | null;
  error?: string;
};

export type ToolGuardClientInput = {
  tool: string;
  action: string;
  arguments_summary?: string[];
  side_effects?: string[];
  safeguards?: string[];
  policy?: string[];
  reversibility?: string;
};

/** How the UI should treat a tool-guard decision (signal, not authorization). */
export function gateFromToolGuardDecision(
  decision: string | null | undefined,
): Exclude<ToolGuardGate, "skipped"> {
  switch ((decision ?? "").trim().toLowerCase()) {
    case "allow":
      return "proceed";
    case "confirm":
    case "review":
      return "require_confirmation";
    case "deny":
      return "block";
    default:
      return "require_confirmation";
  }
}

/** Call the Next BFF proxy for Jev tool-guard (keeps JEV_API_KEY server-side). */
export async function requestToolGuard(
  input: ToolGuardClientInput,
): Promise<ToolGuardClientResult> {
  const res = await fetch("/api/jev/tool-guard", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  let json: ToolGuardClientResult | null = null;
  try {
    json = (await res.json()) as ToolGuardClientResult;
  } catch {
    return {
      skipped: false,
      configured: true,
      gate: "require_confirmation",
      decision: null,
      guidance: `Jev tool-guard returned non-JSON (HTTP ${res.status}). Confirm before continuing.`,
      error: `HTTP ${res.status}`,
    };
  }

  if (!json || typeof json.gate !== "string") {
    return {
      skipped: false,
      configured: true,
      gate: "require_confirmation",
      decision: null,
      guidance:
        "Jev tool-guard response was incomplete. Confirm before continuing.",
    };
  }

  return {
    skipped: Boolean(json.skipped),
    configured: Boolean(json.configured),
    gate: json.gate,
    decision: json.decision ?? null,
    confidence: json.confidence ?? null,
    probabilities: json.probabilities ?? null,
    guidance: json.guidance ?? null,
    guidance_source: json.guidance_source ?? null,
    error: json.error,
  };
}
