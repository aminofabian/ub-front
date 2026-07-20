/**
 * Sync till lock state across same-origin tabs. Separate from `ub-auth`
 * so lock/unlock does not interfere with token broadcast handling.
 */

export type TillLockBroadcastReason = "manual" | "idle" | "session";

export type TillLockBroadcastMessage =
  | { type: "lock"; reason: TillLockBroadcastReason }
  | { type: "unlock" };

const CHANNEL_NAME = "ub-till-lock";

type Listener = (msg: TillLockBroadcastMessage) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (channel) {
    return channel;
  }
  const BroadcastChannelCtor = globalThis.BroadcastChannel;
  if (typeof BroadcastChannelCtor !== "function") {
    return null;
  }
  try {
    channel = new BroadcastChannelCtor(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const data = event.data as TillLockBroadcastMessage | undefined;
      if (!data || (data.type !== "lock" && data.type !== "unlock")) {
        return;
      }
      for (const listener of listeners) {
        try {
          listener(data);
        } catch {
          /* ignore */
        }
      }
    });
  } catch {
    channel = null;
  }
  return channel;
}

export function subscribeToTillLockBroadcasts(listener: Listener): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  getChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastTillLock(
  reason: TillLockBroadcastReason = "manual",
): void {
  const ch = getChannel();
  if (!ch) {
    return;
  }
  try {
    ch.postMessage({ type: "lock", reason } satisfies TillLockBroadcastMessage);
  } catch {
    /* ignore */
  }
}

export function broadcastTillUnlock(): void {
  const ch = getChannel();
  if (!ch) {
    return;
  }
  try {
    ch.postMessage({ type: "unlock" } satisfies TillLockBroadcastMessage);
  } catch {
    /* ignore */
  }
}

/** Test helper. */
export function __resetTillLockBroadcastForTests(): void {
  listeners.clear();
  if (channel) {
    try {
      channel.close();
    } catch {
      /* ignore */
    }
    channel = null;
  }
}
