"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchPlatformPaidCharges,
  type GatewayStkPushOpsRecord,
} from "@/lib/super-admin-api";
import { platformChargeLabel } from "@/components/super-admin/platform-payments-list";

const SEEN_AT_KEY = "ub.sa.platformPaymentsSeenAt";
const POLL_MS = 20_000;

function paidAt(p: GatewayStkPushOpsRecord): number {
  const t = Date.parse(p.confirmedAt ?? p.createdAt ?? "");
  return Number.isNaN(t) ? 0 : t;
}

function readSeenAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(SEEN_AT_KEY);
  if (raw) return Number(raw) || 0;
  // First visit: start counting from now so old payments are listed, not flagged.
  const now = Date.now();
  window.localStorage.setItem(SEEN_AT_KEY, String(now));
  return now;
}

/**
 * Paid platform charges (SMS credits, packages, domains, Kiosk Pay top-ups).
 * With {@code notify}, a toast fires for each payment that lands while the
 * console is open — only the shell passes it, so the toast shows once.
 */
export function useSaPlatformPayments({ notify = false }: { notify?: boolean } = {}) {
  const [payments, setPayments] = useState<GatewayStkPushOpsRecord[] | null>(null);
  const [seenAt, setSeenAt] = useState(0);
  const knownIdsRef = useRef<Set<string> | null>(null);

  const sync = useCallback(async () => {
    try {
      const rows = await fetchPlatformPaidCharges(30);
      setPayments(rows);
      const known = knownIdsRef.current;
      if (known && notify) {
        for (const p of rows) {
          if (known.has(p.id)) continue;
          toast.success(`${platformChargeLabel(p.contextType)} paid`, {
            description: `${p.businessName ?? "A shop"} · KES ${Number(p.amount).toLocaleString("en-KE")}`,
          });
        }
      }
      knownIdsRef.current = new Set(rows.map((p) => p.id));
    } catch {
      // Offline or signed out — keep the last list.
    }
  }, [notify]);

  useEffect(() => {
    setSeenAt(readSeenAt());
    void sync();
    const timer = window.setInterval(() => void sync(), POLL_MS);
    const onFocus = () => void sync();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [sync]);

  const unread = useMemo(
    () => (payments ?? []).filter((p) => paidAt(p) > seenAt).length,
    [payments, seenAt],
  );

  const markSeen = useCallback(() => {
    const now = Date.now();
    window.localStorage.setItem(SEEN_AT_KEY, String(now));
    setSeenAt(now);
  }, []);

  return { payments, unread, seenAt, markSeen, refresh: sync };
}
