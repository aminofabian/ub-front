export type RealtimeErrorShape = {
  code: number;
  message: string;
};

/**
 * Server error frames are `{type:"error", code, message}` at the top level.
 * Older/alternate emitters nested them under `data`. Accept both so a rejected
 * channel or expired ticket is never mistaken for corrupt JSON.
 */
export function parseRealtimeError(frame: unknown): RealtimeErrorShape | null {
  if (!frame || typeof frame !== "object") return null;
  const raw = frame as Record<string, unknown>;
  if (raw.type !== "error") return null;

  const data =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : {};
  const code =
    typeof raw.code === "number"
      ? raw.code
      : typeof data.code === "number"
        ? data.code
        : 0;
  const message =
    typeof raw.message === "string"
      ? raw.message
      : typeof data.message === "string"
        ? data.message
        : "Realtime error";
  return { code, message };
}
