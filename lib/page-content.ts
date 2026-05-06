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

export type SpringPageMeta = {
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
};

export function extractSpringPageMeta(payload: unknown): SpringPageMeta | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const totalElements = typeof record.totalElements === "number" ? record.totalElements : NaN;
  const totalPages = typeof record.totalPages === "number" ? record.totalPages : NaN;
  const number = typeof record.number === "number" ? record.number : NaN;
  const size = typeof record.size === "number" ? record.size : NaN;
  if (!Number.isFinite(totalElements) || !Number.isFinite(number) || !Number.isFinite(size)) {
    return null;
  }
  return {
    totalElements,
    totalPages: Number.isFinite(totalPages) ? totalPages : 0,
    number,
    size,
    last: Boolean(record.last),
    first: Boolean(record.first),
  };
}
