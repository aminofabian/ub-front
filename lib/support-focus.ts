/**
 * Tracks which support conversation(s) the tenant is actively viewing.
 * Used to suppress toasts / unread bumps when the open thread already shows
 * the message, while still allowing a chime everywhere.
 */

const focusedIds = new Set<string>();

export function setSupportConversationFocused(
  conversationId: string | null | undefined,
  focused: boolean,
): void {
  const id = conversationId?.trim();
  if (!id) return;
  if (focused) focusedIds.add(id);
  else focusedIds.delete(id);
}

export function isSupportConversationFocused(conversationId: string): boolean {
  const id = conversationId.trim();
  return id.length > 0 && focusedIds.has(id);
}
