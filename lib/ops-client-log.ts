"use client";

import { STORAGE_KEYS } from "@/lib/config";

/** Short copy for tills and other staff surfaces — never mention env vars. */
export const USER_API_UNREACHABLE_MESSAGE =
  "Can't reach the server right now.";

export class ApiUnreachableError extends Error {
  readonly opsDetail: string;

  constructor(opsDetail: string) {
    super(USER_API_UNREACHABLE_MESSAGE);
    this.name = "ApiUnreachableError";
    this.opsDetail = opsDetail;
  }
}

export type OpsClientLogKind = "api_unreachable" | "api_config";

export type OpsClientLogEntry = {
  id: string;
  at: string;
  kind: OpsClientLogKind;
  message: string;
  path?: string;
  href?: string;
  count: number;
};

const MAX_ENTRIES = 80;
const DEDUPE_MS = 15_000;

const INFRA_PATTERNS = [
  /Cannot reach API/i,
  /BACKEND_ORIGIN/,
  /NEXT_PUBLIC_API_BROWSER_DIRECT/,
  /NEXT_PUBLIC_API_BASE_URL/,
];

let hydrated = false;
let memory: OpsClientLogEntry[] = [];
const listeners = new Set<() => void>();

export function isOpsInfraMessage(message: string): boolean {
  return INFRA_PATTERNS.some((re) => re.test(message));
}

export function isOpsInfraError(error: unknown): boolean {
  if (error instanceof ApiUnreachableError) return true;
  if (error instanceof Error) return isOpsInfraMessage(error.message);
  return typeof error === "string" && isOpsInfraMessage(error);
}

function parseStored(raw: string | null): OpsClientLogEntry[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: OpsClientLogEntry[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id : "";
      const at = typeof rec.at === "string" ? rec.at : "";
      const message = typeof rec.message === "string" ? rec.message : "";
      const kind =
        rec.kind === "api_config" ? "api_config" : "api_unreachable";
      const count =
        typeof rec.count === "number" && Number.isFinite(rec.count)
          ? Math.max(1, rec.count)
          : 1;
      if (!id || !at || !message) continue;
      out.push({
        id,
        at,
        kind,
        message,
        path: typeof rec.path === "string" ? rec.path : undefined,
        href: typeof rec.href === "string" ? rec.href : undefined,
        count,
      });
    }
    return out.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persist(entries: OpsClientLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.opsClientLog,
      JSON.stringify(entries),
    );
  } catch {
    /* quota / private mode */
  }
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  memory = parseStored(window.localStorage.getItem(STORAGE_KEYS.opsClientLog));
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEYS.opsClientLog) return;
    memory = parseStored(event.newValue);
    emit();
  });
}

function emit(): void {
  for (const listener of listeners) listener();
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ops-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function recordOpsClientError(input: {
  message: string;
  kind?: OpsClientLogKind;
  path?: string;
}): void {
  const message = input.message.trim();
  if (!message) return;

  const href =
    typeof window !== "undefined" ? window.location.pathname : undefined;
  const kind = input.kind ?? (isOpsInfraMessage(message) ? "api_config" : "api_unreachable");

  if (typeof console !== "undefined") {
    console.error("[ops]", message, {
      kind,
      path: input.path,
      href,
    });
  }

  hydrate();
  const now = Date.now();
  const head = memory[0];
  if (
    head &&
    head.message === message &&
    head.path === input.path &&
    now - Date.parse(head.at) < DEDUPE_MS
  ) {
    memory = [{ ...head, at: new Date(now).toISOString(), count: head.count + 1 }, ...memory.slice(1)];
  } else {
    const entry: OpsClientLogEntry = {
      id: newId(),
      at: new Date(now).toISOString(),
      kind,
      message,
      path: input.path,
      href,
      count: 1,
    };
    memory = [entry, ...memory].slice(0, MAX_ENTRIES);
  }
  persist(memory);
  emit();
}

export function readOpsClientLog(): OpsClientLogEntry[] {
  hydrate();
  return memory;
}

export function clearOpsClientLog(): void {
  hydrate();
  memory = [];
  persist(memory);
  emit();
}

export function subscribeOpsClientLog(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
