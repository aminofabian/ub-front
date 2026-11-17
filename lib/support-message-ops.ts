/**
 * Shared reducers for applying edit / delete (unsend) to a support message list,
 * used by all four chat surfaces so the optimistic and realtime paths behave
 * identically. Message shapes differ slightly per surface, so these are generic
 * over anything carrying the fields they touch.
 */

type EditableMessage = {
  id: string;
  body: string;
  editedAt?: string | null;
  deletedAt?: string | null;
};

export function applyEditToList<T extends EditableMessage>(
  messages: T[],
  messageId: string,
  body: string,
  editedAt: string | null,
): T[] {
  return messages.map((m) =>
    m.id === messageId ? { ...m, body, editedAt } : m,
  );
}

export function applyDeleteToList<T extends EditableMessage>(
  messages: T[],
  messageId: string,
  deletedAt: string,
): T[] {
  return messages.map((m) =>
    m.id === messageId
      ? { ...m, body: "", deletedAt, editedAt: m.editedAt ?? null }
      : m,
  );
}
