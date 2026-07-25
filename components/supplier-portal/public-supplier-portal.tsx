"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2, MessageSquareWarning, Package, Receipt } from "lucide-react";

import {
  fetchPublicSupplierPortal,
  submitPublicSupplierComplaint,
  type PublicSupplierPortal,
} from "@/lib/public-supplier-portal";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";
import { cn } from "@/lib/utils";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  logoUrl: string | null;
};

type Props = {
  username: string;
  branding: Branding;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusTone(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "PAID") return "text-emerald-800";
  if (s === "PARTIAL") return "text-amber-800";
  return "text-rose-800";
}

export function PublicSupplierPortalView({ username, branding }: Props) {
  const [data, setData] = useState<PublicSupplierPortal | null>(null);
  const [busy, setBusy] = useState(true);
  const [missing, setMissing] = useState(false);

  const [noteName, setNoteName] = useState("");
  const [notePhone, setNotePhone] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteDone, setNoteDone] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const theme = useMemo(
    () =>
      ({
        ["--pos-primary" as string]: branding.primaryHex || "#1c1915",
      }) as CSSProperties,
    [branding.primaryHex],
  );

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void fetchPublicSupplierPortal(username).then((portal) => {
      if (cancelled) return;
      setBusy(false);
      if (!portal) {
        setMissing(true);
        setData(null);
        return;
      }
      setMissing(false);
      setData(portal);
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const onSubmitNote = async () => {
    setNoteError(null);
    if (noteBody.trim().length < 8) {
      setNoteError("Write a short note (at least a sentence).");
      return;
    }
    setNoteBusy(true);
    try {
      await submitPublicSupplierComplaint(username, {
        name: noteName,
        phone: notePhone,
        message: noteBody,
      });
      setNoteDone(true);
      setNoteBody("");
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "Could not send note");
    } finally {
      setNoteBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading supplier portal…
      </div>
    );
  }

  if (missing || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" style={theme}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {branding.shopName}
        </p>
        <h1 className="mt-2 font-serif text-2xl text-[var(--pos-ink,#1c1915)]">
          Supplier not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No supplier on this shop matches{" "}
          <span className="font-mono text-foreground">/s/{username}</span>.
          Check the name under Suppliers, or open the link from the SMS / supply
          slip (it uses the supplier&apos;s full slug).
        </p>
      </div>
    );
  }

  const currency = data.currency;

  return (
    <div
      className="min-h-dvh bg-[linear-gradient(165deg,#f7f3eb_0%,#f1ece3_45%,#e8e1d4_100%)] text-[var(--pos-ink,#1c1915)]"
      style={theme}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-3 py-5 sm:px-4 sm:py-8">
        <header className="relative border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#fff_88%,#faf7f1)] p-4 pl-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary)]"
          />
          <div className="flex items-start gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="size-10 object-contain"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Supplier portal · {data.shopName}
              </p>
              <h1 className="mt-1 font-serif text-[1.55rem] leading-none tracking-tight">
                {data.supplierName}
              </h1>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                /s/{data.supplierSlug}
              </p>
            </div>
          </div>
        </header>

        <section className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-white/90 p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Amount owed
          </p>
          <p className="mt-1 font-serif text-3xl leading-none tabular-nums">
            {fmtMoney(data.openBalance, currency)}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Reference only — {data.invoiceCount} supply
            {data.invoiceCount === 1 ? "" : "ies"} · paid{" "}
            {fmtMoney(data.totalPaid, currency)} of{" "}
            {fmtMoney(data.totalSpent, currency)}
          </p>
          <p className="mt-2 border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] pt-2 text-[11px] leading-relaxed text-muted-foreground">
            Supplies are usually settled within 48 hours. If payment is delayed,
            leave a note below or call the shop.
          </p>
        </section>

        <section className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-white/90">
          <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2">
            <Receipt className="size-3.5 text-[var(--pos-primary)]" aria-hidden />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Supply history
            </h2>
          </div>
          {data.supplies.length === 0 ? (
            <p className="px-3 py-8 text-center text-[11px] text-muted-foreground">
              No posted supplies yet.
            </p>
          ) : (
            <ul className="divide-y divide-dashed divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
              {data.supplies.map((row) => (
                <li
                  key={`${row.invoiceNumber}-${row.invoiceDate}`}
                  className="flex items-start justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {row.invoiceNumber}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {fmtDate(row.invoiceDate)} · {row.sourceType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[12px] font-semibold tabular-nums">
                      {fmtMoney(row.grandTotal, currency)}
                    </p>
                    <p
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wide",
                        statusTone(row.paymentStatus),
                      )}
                    >
                      {row.paymentStatus}
                      {toNum(row.balanceOpen) > 0.009
                        ? ` · ${fmtMoney(row.balanceOpen, currency)} open`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-white/90">
          <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2">
            <Package className="size-3.5 text-[var(--pos-primary)]" aria-hidden />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Product movements
            </h2>
          </div>
          {data.movements.length === 0 ? (
            <p className="px-3 py-8 text-center text-[11px] text-muted-foreground">
              No line movements yet.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-dashed divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] overflow-y-auto">
              {data.movements.map((m, i) => (
                <li
                  key={`${m.invoiceNumber}-${m.description}-${i}`}
                  className="px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] font-medium">
                      {m.description}
                    </p>
                    <p className="shrink-0 font-mono text-[11px] tabular-nums">
                      {fmtMoney(m.lineTotal, currency)}
                    </p>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {fmtDate(m.invoiceDate)} · qty {toNum(m.quantity)} ×{" "}
                    {toNum(m.unitCost).toFixed(2)} · {m.invoiceNumber}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {data.linkedProducts.length > 0 ? (
            <div className="border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Linked catalogue
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {data.linkedProducts.slice(0, 24).join(" · ")}
                {data.linkedProducts.length > 24
                  ? ` · +${data.linkedProducts.length - 24} more`
                  : ""}
              </p>
            </div>
          ) : null}
        </section>

        <section className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-white/90 p-3">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquareWarning
              className="size-3.5 text-[var(--pos-primary)]"
              aria-hidden
            />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Voice a complaint
            </h2>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Short note to the shop — delays, shortages, pricing, or anything else.
          </p>
          {noteDone ? (
            <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] px-3 py-4 text-center text-[12px]">
              Thanks — the shop has your note.
            </p>
          ) : (
            <div className="space-y-2">
              <input
                className="h-9 w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent px-2 text-[13px] outline-none focus:border-[var(--pos-primary)]"
                placeholder="Your name (optional)"
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
                disabled={noteBusy}
              />
              <input
                className="h-9 w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent px-2 text-[13px] outline-none focus:border-[var(--pos-primary)]"
                placeholder="Phone (optional)"
                value={notePhone}
                onChange={(e) => setNotePhone(e.target.value)}
                disabled={noteBusy}
              />
              <textarea
                className="min-h-[5.5rem] w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent px-2 py-2 text-[13px] outline-none focus:border-[var(--pos-primary)]"
                placeholder="What should the shop know?"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                disabled={noteBusy}
              />
              {/* honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden
              />
              {noteError ? (
                <p className="text-[11px] text-rose-700">{noteError}</p>
              ) : null}
              <button
                type="button"
                disabled={noteBusy}
                onClick={() => void onSubmitNote()}
                className="h-9 w-full bg-[var(--pos-primary)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--pos-primary-ink,#fff)] disabled:opacity-60"
              >
                {noteBusy ? "Sending…" : "Send note"}
              </button>
            </div>
          )}
        </section>

        <p className="pb-6 text-center text-[10px] text-muted-foreground">
          Reference portal for {data.shopName}. Not a formal statement of account.
        </p>
      </div>
    </div>
  );
}
