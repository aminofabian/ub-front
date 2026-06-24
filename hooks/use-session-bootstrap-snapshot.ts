"use client";

import { useSyncExternalStore } from "react";

import type { BranchRecord, BusinessRecord, MeResponse } from "@/lib/api";
import { extractPageContent } from "@/lib/page-content";
import {
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

export type SessionBootstrapSnapshot = {
  me: MeResponse | null;
  business: BusinessRecord | null;
  branches: BranchRecord[];
};

const EMPTY_SNAPSHOT: SessionBootstrapSnapshot = {
  me: null,
  business: null,
  branches: [],
};

let cachedFingerprint = "";
let cachedSnapshot: SessionBootstrapSnapshot = EMPTY_SNAPSHOT;

function bootstrapFingerprint(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return [
      window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEYS.me),
      window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEYS.business),
      window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEYS.branches),
    ].join("\0");
  } catch {
    return "";
  }
}

function readSnapshot(): SessionBootstrapSnapshot {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }
  const fingerprint = bootstrapFingerprint();
  if (fingerprint === cachedFingerprint) {
    return cachedSnapshot;
  }
  cachedFingerprint = fingerprint;
  const bootMe = readSessionBootstrap<MeResponse>(SESSION_BOOTSTRAP_KEYS.me);
  const bootBiz = readSessionBootstrap<BusinessRecord>(
    SESSION_BOOTSTRAP_KEYS.business,
  );
  const bootBranchesRaw = readSessionBootstrap<unknown>(
    SESSION_BOOTSTRAP_KEYS.branches,
  );
  let branches: BranchRecord[] = [];
  if (bootBranchesRaw) {
    branches = extractPageContent<BranchRecord>(bootBranchesRaw).filter(
      (branch) => branch.active,
    );
  }
  cachedSnapshot = { me: bootMe, business: bootBiz, branches };
  return cachedSnapshot;
}

/** Login prefetch data — safe to read on the client without hydration mismatch. */
export function useSessionBootstrapSnapshot(): SessionBootstrapSnapshot {
  return useSyncExternalStore(
    () => () => {},
    readSnapshot,
    () => EMPTY_SNAPSHOT,
  );
}
