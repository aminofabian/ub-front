"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  bookPickupMtaaniShipment,
  cancelPickupMtaaniShipment,
  refreshPickupMtaaniShipment,
  type WebOrderDetail,
  type WebOrderShipmentSummary,
} from "@/lib/api";

type Props = {
  order: WebOrderDetail;
  onUpdated: (next: WebOrderDetail) => void;
};

function money(value: number | string | null | undefined, currency: string): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "KES",
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function statusLabel(shipment: WebOrderShipmentSummary): string {
  switch (shipment.bookStatus) {
    case "pending":
      return "Not booked";
    case "booking":
      return "Booking…";
    case "booked":
      return "Booked";
    case "book_failed":
      return "Booking failed";
    case "cancelled":
      return "Cancelled";
    case "voided":
      return "Voided";
    default:
      return shipment.bookStatus;
  }
}

/** Pickup Mtaani shipment mirror + manual booking (scope §8, step 5). */
export function WebOrderShipmentCard({ order, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shipment = order.shipment;
  if (!shipment) return null;

  // A voided order leaves the parcel live upstream, so it still refreshes and
  // cancels like a normal booking — just without the payment prompt.
  const liveParcel =
    shipment.bookStatus === "booked" || shipment.bookStatus === "voided";
  const canBook =
    shipment.bookStatus === "pending" || shipment.bookStatus === "book_failed";
  const canRefresh = liveParcel;
  const canCancel =
    liveParcel &&
    (shipment.upstreamState == null || shipment.upstreamState === "request");
  const paid = order.status === "paid";

  const book = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await bookPickupMtaaniShipment(order.id);
      onUpdated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book the parcel.");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await refreshPickupMtaaniShipment(order.id);
      onUpdated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh the parcel.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (
      !window.confirm(
        "Cancel this Pickup Mtaani parcel? Only a parcel that has not started moving can be cancelled here.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await cancelPickupMtaaniShipment(order.id);
      onUpdated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel the parcel.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Truck className="size-4" aria-hidden />
        Pickup Mtaani delivery
      </p>

      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {shipment.mode === "doorstep" ? "Doorstep" : "Agent"}
          </dt>
          <dd className="font-medium">{shipment.destinationLabel ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Delivery fee</dt>
          <dd className="font-medium">{money(shipment.shopperFeeKes, order.currency)}</dd>
        </div>
        {shipment.locationDescription ? (
          <div className="flex justify-between gap-2 sm:col-span-2">
            <dt className="text-muted-foreground">Landmark</dt>
            <dd className="font-medium">{shipment.locationDescription}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-2 text-xs text-muted-foreground">
        Status: <span className="font-medium text-foreground">{statusLabel(shipment)}</span>
        {shipment.receiptNo ? ` · ${shipment.receiptNo}` : ""}
        {shipment.trackId ? ` · ${shipment.trackId}` : ""}
      </p>

      {shipment.lastTrackDescription ? (
        <p className="mt-1 text-xs text-muted-foreground">{shipment.lastTrackDescription}</p>
      ) : null}

      {shipment.paymentStatus === "Not Paid" && shipment.bookStatus === "booked" ? (
        <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Pickup Mtaani has not been paid for this delivery. Pay it in Pickup Mtaani,
          then it will be collected.
        </p>
      ) : null}

      {shipment.bookError ? (
        <p className="mt-2 text-xs text-destructive">{shipment.bookError}</p>
      ) : null}

      {canBook ? (
        <div className="mt-3">
          <Button type="button" size="sm" disabled={busy || !paid} onClick={() => void book()}>
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            Book pickup
          </Button>
          {!paid ? (
            <span className="ml-2 text-xs text-muted-foreground">
              Available once the order is paid.
            </span>
          ) : null}
        </div>
      ) : null}

      {canRefresh ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void refresh()}>
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Refresh status
          </Button>
          {canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void cancel()}
            >
              Cancel booking
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
