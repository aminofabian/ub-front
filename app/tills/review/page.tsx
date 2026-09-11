"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  fetchPublicTillAccessReview,
  postPublicTillAccessApprove,
  postPublicTillAccessDismiss,
  type PublicTillAccessReview,
} from "@/lib/api";

function LastSeen({ iso }: { iso: string | null | undefined }) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    if (!iso) {
      setLabel("just now");
      return;
    }
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) {
      setLabel("just now");
      return;
    }
    setLabel(
      new Intl.DateTimeFormat("en-KE", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Africa/Nairobi",
      }).format(at),
    );
  }, [iso]);
  return <>{label}</>;
}

function ReviewBody() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [review, setReview] = useState<PublicTillAccessReview | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
  const [done, setDone] = useState<"approved" | "dismissed" | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("This link is missing a token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await fetchPublicTillAccessReview(token);
      setReview(next);
      setLabel((current) => current.trim() || next.suggestedLabel);
    } catch (e) {
      setReview(null);
      setError(
        e instanceof Error ? e.message : "This till link is invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    setBusy("approve");
    setError("");
    try {
      await postPublicTillAccessApprove(token, label);
      setDone("approved");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not trust this till.");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy("dismiss");
    setError("");
    try {
      await postPublicTillAccessDismiss(token);
      setDone("dismissed");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not dismiss this request.",
      );
    } finally {
      setBusy(null);
    }
  }

  const pending = review?.canApprove && !done;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Trust this till?
      </h1>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : review ? (
        <div className="mt-5 space-y-4 border border-black/10 bg-[#f7f3ec] p-4 shadow-[3px_3px_0_0_rgba(28,25,21,0.12)]">
          <p className="text-sm text-muted-foreground">{review.shopName}</p>
          <p className="text-lg font-semibold leading-snug">
            {review.cashierName} is waiting at {review.branchName}.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            They unlocked with the right PIN on a computer this shop has not
            named yet. Trust it once so sales, shifts, and receipts stay on
            this counter — they can try their PIN again immediately.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Cashier</dt>
            <dd>
              {review.cashierName}
              {review.cashierEmail ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {review.cashierEmail}
                </span>
              ) : null}
            </dd>
            <dt className="text-muted-foreground">Branch</dt>
            <dd>{review.branchName}</dd>
            <dt className="text-muted-foreground">Computer</dt>
            <dd>
              {review.deviceShortId
                ? `Till ${review.deviceShortId}`
                : "Unknown"}
              {review.userAgent ? (
                <span className="block text-xs text-muted-foreground">
                  {review.userAgent}
                </span>
              ) : null}
            </dd>
            <dt className="text-muted-foreground">Last try</dt>
            <dd>
              <LastSeen iso={review.lastSeenAt} />
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {done === "approved"
                ? "Trusted"
                : done === "dismissed"
                  ? "Not this computer"
                  : review.status === "pending"
                    ? "Waiting for you"
                    : review.status}
            </dd>
          </dl>
          {pending ? (
            <div className="space-y-2 border-t border-black/10 pt-3">
              <label className="block text-xs text-muted-foreground" htmlFor="till-label">
                Name this till
              </label>
              <input
                id="till-label"
                className="w-full border border-black/15 bg-white px-2 py-1.5 text-sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  disabled={busy != null}
                  className="rounded-none"
                  onClick={() => void approve()}
                >
                  {busy === "approve" ? "Trusting…" : "Trust this till"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy != null}
                  className="rounded-none"
                  onClick={() => void dismiss()}
                >
                  {busy === "dismiss" ? "Saving…" : "Not this computer"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {done === "approved" || review.status === "approved"
                ? `${review.cashierName} can enter their PIN now.`
                : done === "dismissed" || review.status === "dismissed"
                  ? "We will not keep asking about this computer for a few hours."
                  : "This request is no longer waiting."}
            </p>
          )}
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  );
}

export default function TillAccessReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-10">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Trust this till?
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <ReviewBody />
    </Suspense>
  );
}
