"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  fetchPublicDrawoutReview,
  postPublicDrawoutApprove,
  postPublicDrawoutReject,
  type PublicDrawoutReview,
} from "@/lib/api";
import { formatMoney } from "@/lib/money";

const CATEGORIES: Record<string, string> = {
  PETTY_CASH: "Petty Cash",
  CASUAL_LABOUR: "Casual Labour",
  SUPPLIER_PAYMENT: "Supplier Payment",
  RECURRING: "Recurring",
  OTHER: "Other",
};

function ReviewBody() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [review, setReview] = useState<PublicDrawoutReview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setError("This approval link is missing a token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setReview(await fetchPublicDrawoutReview(token));
    } catch (e) {
      setReview(null);
      setError(
        e instanceof Error ? e.message : "This approval link is invalid or expired.",
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
      await postPublicDrawoutApprove(token);
      setDone("approved");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve this drawout.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    setError("");
    try {
      await postPublicDrawoutReject(token, reason.trim() || "Rejected from approval link");
      setDone("rejected");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reject this drawout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
        Palmart till
      </p>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
        Cash drawout
      </h1>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : review ? (
        <div className="mt-5 space-y-4 border border-black/10 bg-[#f7f3ec] p-4 shadow-[3px_3px_0_0_rgba(28,25,21,0.12)]">
          <p className="text-sm text-muted-foreground">{review.shopName}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatMoney(review.amount, review.currency)}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Category</dt>
            <dd>{CATEGORIES[review.category] || review.category}</dd>
            <dt className="text-muted-foreground">For</dt>
            <dd>{review.description}</dd>
            <dt className="text-muted-foreground">Recipient</dt>
            <dd>{review.recipientName}</dd>
            <dt className="text-muted-foreground">By</dt>
            <dd>{review.initiatedByName}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {done === "approved"
                ? "Approved"
                : done === "rejected"
                  ? "Rejected"
                  : review.status === "PENDING_APPROVAL"
                    ? "Pending approval"
                    : review.status}
            </dd>
          </dl>
          {review.canApprove && !done ? (
            <div className="space-y-2 border-t border-black/10 pt-3">
              <p className="text-xs text-muted-foreground">
                This amount is already taken out of the till. Approve if the cash
                left for a valid reason, or reject if it should be put back.
              </p>
              <textarea
                className="min-h-[3rem] w-full resize-y border border-black/15 bg-white px-2 py-1.5 text-sm"
                placeholder="Reject reason (required to reject)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy != null}
                  className="rounded-none"
                  onClick={() => void approve()}
                >
                  {busy === "approve" ? "Approving…" : "Approve"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy != null}
                  className="rounded-none"
                  onClick={() => void reject()}
                >
                  {busy === "reject" ? "Rejecting…" : "Reject"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {done === "approved"
                ? "Approved. The till already reflects this drawout."
                : done === "rejected"
                  ? "Rejected. Put the cash back in the till if it was taken out."
                  : "This drawout is no longer waiting for approval."}
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

export default function DrawoutReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-10 text-sm text-muted-foreground">Loading…</main>
      }
    >
      <ReviewBody />
    </Suspense>
  );
}
