/**
 * Shared reaction types + merge helpers for the support chat surfaces
 * (tenant, super-admin, storefront buyer, guest). The server returns the full
 * per-emoji summary for a message; the client only ever replaces a message's
 * list wholesale, so there is no per-emoji diffing to get wrong.
 */

export type SupportReaction = {
  emoji: string;
  count: number;
  /** True when the viewing participant is one of the reactors. */
  mine: boolean;
};

/** A realtime `support.reaction` frame's payload. */
export type SupportReactionFrame = {
  conversationId: string;
  messageId: string;
  emoji: string;
  actorType: string;
  actorRef: string;
  action: "ADD" | "REMOVE" | string;
  /** Full post-change summary; `mine` from the server is not viewer-aware. */
  reactions: Array<{ emoji: string; count: number; mine?: boolean }>;
  conversationType?: string;
};

/**
 * Apply a realtime reaction frame to a message's current reaction list.
 *
 * The server's `mine` in a broadcast frame reflects nobody in particular, so we
 * preserve the viewer's own `mine` flags: an emoji stays "mine" if it was mine
 * before, OR if this very frame is my own ADD of it (`isSelf` + ADD).
 */
export function applyReactionFrame(
  current: SupportReaction[],
  frame: Pick<SupportReactionFrame, "emoji" | "action" | "reactions">,
  isSelf: boolean,
): SupportReaction[] {
  const mineByEmoji = new Map(current.map((r) => [r.emoji, r.mine]));
  return (frame.reactions ?? []).map((r) => {
    let mine = mineByEmoji.get(r.emoji) ?? false;
    if (isSelf && r.emoji === frame.emoji) {
      mine = frame.action === "ADD";
    }
    return { emoji: r.emoji, count: r.count, mine };
  });
}

/** Optimistically toggle one emoji on a message before the server confirms. */
export function toggleReactionLocally(
  current: SupportReaction[],
  emoji: string,
): SupportReaction[] {
  const existing = current.find((r) => r.emoji === emoji);
  if (existing?.mine) {
    // Remove my reaction; drop the chip if it was only mine.
    const nextCount = existing.count - 1;
    if (nextCount <= 0) {
      return current.filter((r) => r.emoji !== emoji);
    }
    return current.map((r) =>
      r.emoji === emoji ? { ...r, count: nextCount, mine: false } : r,
    );
  }
  if (existing) {
    return current.map((r) =>
      r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r,
    );
  }
  return [...current, { emoji, count: 1, mine: true }];
}
