export function extractPageContent<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.content)) {
    return record.content as T[];
  }
  if (Array.isArray(record.data)) {
    return record.data as T[];
  }
  return [];
}
