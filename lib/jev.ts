import "server-only";

/**
 * Thin Jev (JevAI Community) decision client.
 *
 * Jev is a judgment layer only: typed decisions + probabilities + guidance.
 * It does not replace the main LLM, execute tools, or browse.
 *
 * Auth: `Authorization: Bearer $JEV_API_KEY` from env (never hardcode).
 * Base: https://www.jevai.org — HTTPS www only.
 *
 * Treat `decision` / probabilities / confidence as signals, not authorization.
 */

export const JEV_BASE_URL = "https://www.jevai.org";

export type JevEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export type JevPresetResult = {
  decision: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  guidance?: string;
  guidance_source?: string;
  answers?: Record<string, unknown>;
};

export type ToolGuardInput = {
  tool: string;
  action: string;
  arguments_summary?: string[];
  side_effects?: string[];
  safeguards?: string[];
  policy?: string[];
  reversibility?:
    | "reversible"
    | "partially_reversible"
    | "irreversible"
    | string;
};

export type RouteTaskInput = {
  task: string;
  evidence?: string[];
  constraints?: string[];
};

export type CheckResearchInput = {
  claim: string;
  evidence?: string[];
  source_quality?: string;
  stakes?: string;
};

export type ReviewCompletionInput = {
  objective: string;
  completed_work?: string[];
  verification?: string[];
  known_gaps?: string[];
};

export type RouteModelCandidate = {
  id: string;
  description: string;
  cost?: string;
  latency?: string;
};

export type RouteModelInput = {
  task: string;
  candidates: RouteModelCandidate[];
  priorities?: string[];
  constraints?: string[];
  stakes?: string;
};

export type DecideInput = {
  state: string | Record<string, unknown> | unknown[];
  questions: Record<string, unknown>;
  model?: string;
};

export class JevError extends Error {
  readonly status: number;
  readonly code: number;

  constructor(message: string, status: number, code: number) {
    super(message);
    this.name = "JevError";
    this.status = status;
    this.code = code;
  }
}

export function isJevConfigured(): boolean {
  return Boolean(process.env.JEV_API_KEY?.trim());
}

function requireApiKey(): string {
  const key = process.env.JEV_API_KEY?.trim();
  if (!key) {
    throw new JevError(
      "JEV_API_KEY is not set. Create a key at https://www.jevai.org/agent/keys",
      401,
      -1,
    );
  }
  return key;
}

async function postPreset<T extends JevPresetResult>(
  path: string,
  body: unknown,
): Promise<T> {
  const key = requireApiKey();
  const res = await fetch(`${JEV_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let envelope: JevEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as JevEnvelope<T>;
  } catch {
    throw new JevError(
      `Jev returned non-JSON (HTTP ${res.status})`,
      res.status,
      -1,
    );
  }

  if (!res.ok || envelope.code !== 0 || envelope.data == null) {
    throw new JevError(
      envelope.message || `Jev request failed (HTTP ${res.status})`,
      res.status,
      envelope.code ?? -1,
    );
  }

  return envelope.data;
}

/** Guard a consequential tool call (does not execute the tool). */
export function toolGuard(input: ToolGuardInput): Promise<JevPresetResult> {
  return postPreset("/api/v1/decisions/tool-guard", input);
}

/** Route an ambiguous / risky task path. */
export function routeTask(input: RouteTaskInput): Promise<JevPresetResult> {
  return postPreset("/api/v1/decisions/route", input);
}

/** Does compact evidence support one claim? (no browse). */
export function checkResearch(
  input: CheckResearchInput,
): Promise<JevPresetResult> {
  return postPreset("/api/v1/decisions/research", input);
}

/** Is an objective actually complete? */
export function reviewCompletion(
  input: ReviewCompletionInput,
): Promise<JevPresetResult> {
  return postPreset("/api/v1/decisions/completion", input);
}

/** Pick among invocable model candidates (ids the app can actually call). */
export function routeModel(input: RouteModelInput): Promise<JevPresetResult> {
  return postPreset("/api/v1/decisions/model-route", input);
}

/** Custom state + typed questions. */
export function decide(input: DecideInput): Promise<JevPresetResult> {
  return postPreset("/api/v1/decisions", input);
}

/** How the UI should treat a tool-guard decision (signal, not authorization). */
export type { ToolGuardGate } from "@/lib/jev-gate";
export { gateFromToolGuardDecision } from "@/lib/jev-gate";
