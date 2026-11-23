"use client";

import { Check, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import {
  becomeSupplier,
  changeBusinessFormats,
  fetchBusinessFormats,
  type BusinessFormatOption,
} from "@/lib/api";
import { useDashboard } from "@/components/dashboard-provider";
import {
  FOOD_STORE_TYPES,
  isSupplierBusiness,
  LODGING_STORE_TYPES,
  SERVICE_STORE_TYPES,
} from "@/lib/business-store-type";
import { STORE_TYPE_OPTIONS } from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";

// Section order and copy mirror onboarding and the Super Admin catalogue, so the three read alike.
const SECTIONS: { key: "food" | "service" | "lodging" | "shop"; title: string; blurb: string }[] = [
  { key: "food", title: "Food and drink", blurb: "A restaurant, café, takeaway or bar — a floor, a menu, kitchen tickets." },
  { key: "lodging", title: "Lodging", blurb: "A few rooms to let, on their own or above a bar — a front desk and stays." },
  { key: "service", title: "Services", blurb: "A salon, kinyozi or spa — chairs, bookings and what each person earns." },
  { key: "shop", title: "Shops", blurb: "Retail off the shelf — stock, barcodes and the counter." },
];

function sectionOf(code: string): "food" | "service" | "lodging" | "shop" {
  if ((FOOD_STORE_TYPES as readonly string[]).includes(code)) return "food";
  if ((LODGING_STORE_TYPES as readonly string[]).includes(code)) return "lodging";
  if ((SERVICE_STORE_TYPES as readonly string[]).includes(code)) return "service";
  return "shop";
}

const LABELS = new Map(STORE_TYPE_OPTIONS.map((o) => [o.value, { label: o.label, hint: o.hint }]));

export function BusinessFormatsEditor({
  typeImages,
}: {
  /** Optional code -> image URL from the business-type catalogue (ADR 0029). */
  typeImages?: Record<string, string>;
}) {
  const { business, refreshSession } = useDashboard();
  // A supplier's shop: the format the platform set, shown so the owner sees what the business is.
  const supplier = isSupplierBusiness(business);
  const [formats, setFormats] = useState<BusinessFormatOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSupplier, setConfirmSupplier] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const record = await fetchBusinessFormats();
      setFormats(record.formats);
      setSelected(new Set(record.storeTypes));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your business formats.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lockedReason = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const f of formats ?? []) map.set(f.code, f.lockedReason);
    return map;
  }, [formats]);

  const original = useMemo(
    () => new Set((formats ?? []).filter((f) => f.selected).map((f) => f.code)),
    [formats],
  );

  const dirty = useMemo(() => {
    if (selected.size !== original.size) return true;
    for (const c of selected) if (!original.has(c)) return true;
    return false;
  }, [selected, original]);

  function toggle(code: string) {
    setActionError("");
    setSuccess("");
    const on = selected.has(code);
    // A format currently on but not removable (open orders, guests in) can't be switched off here.
    if (on && original.has(code) && lockedReason.get(code)) {
      setActionError(lockedReason.get(code) ?? "That format is in use.");
      return;
    }
    const next = new Set(selected);
    if (on) next.delete(code);
    else next.add(code);
    setSelected(next);
  }

  async function save() {
    setActionError("");
    setSuccess("");
    if (selected.size === 0) {
      setActionError("Keep at least one business format.");
      return;
    }
    setBusy(true);
    try {
      const record = await changeBusinessFormats([...selected]);
      setFormats(record.formats);
      setSelected(new Set(record.storeTypes));
      setSuccess("Saved. Your tools now match the formats you run.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not save. Try again.");
      void load();
    } finally {
      setBusy(false);
    }
  }

  /** Makes this shop a supplier's shop. Saved at once: it is not part of "Save formats". */
  async function startSupplying() {
    setActionError("");
    setSuccess("");
    setBusy(true);
    try {
      await becomeSupplier();
      setConfirmSupplier(false);
      await Promise.all([refreshSession(), load()]);
      setSuccess("You are now a supplier. Open Trade in the menu to set up your page.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not make this a supplier's shop. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <AuthAlert variant="error">{loadError}</AuthAlert>;
  if (formats == null) {
    return <p className="text-sm text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">Loading…</p>;
  }

  const codesBySection = (key: string) =>
    STORE_TYPE_OPTIONS.map((o) => o.value).filter((c) => sectionOf(c) === key);

  return (
    <div className="space-y-6">
      {actionError ? <AuthAlert variant="error">{actionError}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      <section aria-label="Wholesale">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--op-ink,#121A16)_55%,transparent)]">
          Wholesale
        </h3>
        <p className="mt-0.5 text-[13px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
          Selling to other shops: trade orders, buyer accounts and a page on the Kiosk marketplace.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {supplier ? (
            <div className="flex items-center gap-2.5 rounded-[2px] border border-[#1D4B3B] bg-[color-mix(in_srgb,#1D4B3B_7%,var(--op-surface,#FCFAF5))] px-3 py-2.5">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-[2px] bg-[#1D4B3B] text-[#F4F1EA]">
                <Check className="size-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[var(--op-ink,#121A16)]">Supplier / wholesaler</span>
                  <Lock className="size-3 text-[#8f3f2f]" aria-label="Cannot be turned off here" />
                </span>
                <span className="mt-0.5 block text-[12px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                  On. Your orders are under Trade. To stop, ask Kiosk support.
                </span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              aria-pressed={false}
              disabled={busy}
              onClick={() => {
                setActionError("");
                setSuccess("");
                setConfirmSupplier(true);
              }}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-[2px] border px-3 py-2.5 text-left",
                "transition-[border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--op-surface,#FCFAF5)]",
                "border-[color-mix(in_srgb,var(--op-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)] hover:border-[color-mix(in_srgb,var(--op-ink,#121A16)_22%,transparent)]",
              )}
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--op-ink,#121A16)_7%,transparent)]"
              >
                <span className="font-serif text-lg italic text-[color-mix(in_srgb,var(--op-ink,#121A16)_45%,transparent)]">S</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--op-ink,#121A16)]">Supplier / wholesaler</span>
                <span className="mt-0.5 line-clamp-1 text-[12px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                  Sell to other shops on Kiosk
                </span>
              </span>
            </button>
          )}
        </div>
        {!supplier && confirmSupplier ? (
          <div className="mt-2 border border-[color-mix(in_srgb,var(--op-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)] px-3 py-3">
            <p className="text-sm font-semibold text-[var(--op-ink,#121A16)]">Become a supplier?</p>
            <p className="mt-1 max-w-[70ch] text-[13px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_70%,transparent)]">
              Kiosk makes your marketplace page and adds Trade to your menu. Shops cannot see the page until you
              list it. Your other formats stay as they are. You cannot turn this off here afterwards; Kiosk
              support can.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void startSupplying()}>
                {busy ? "Setting up…" : "Become a supplier"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setConfirmSupplier(false)}>
                Not now
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {SECTIONS.map((section) => {
        const codes = codesBySection(section.key);
        if (codes.length === 0) return null;
        return (
          <section key={section.key} aria-label={section.title}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--op-ink,#121A16)_55%,transparent)]">
              {section.title}
            </h3>
            <p className="mt-0.5 text-[13px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
              {section.blurb}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {codes.map((code) => {
                const meta = LABELS.get(code);
                const on = selected.has(code);
                const lockedOn = on && original.has(code) && Boolean(lockedReason.get(code));
                const image = typeImages?.[code];
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => toggle(code)}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-[2px] border px-3 py-2.5 text-left",
                      "transition-[border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--op-surface,#FCFAF5)]",
                      on
                        ? "border-[#1D4B3B] bg-[color-mix(in_srgb,#1D4B3B_7%,var(--op-surface,#FCFAF5))]"
                        : "border-[color-mix(in_srgb,var(--op-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)] hover:border-[color-mix(in_srgb,var(--op-ink,#121A16)_22%,transparent)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[2px]",
                        on ? "bg-[#1D4B3B] text-[#F4F1EA]" : "bg-[color-mix(in_srgb,var(--op-ink,#121A16)_7%,transparent)]",
                      )}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" className="size-full object-cover" />
                      ) : on ? (
                        <Check className="size-4" strokeWidth={2} />
                      ) : (
                        <span className="font-serif text-lg italic text-[color-mix(in_srgb,var(--op-ink,#121A16)_45%,transparent)]">
                          {(meta?.label ?? code).trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-[var(--op-ink,#121A16)]">
                          {meta?.label ?? code}
                        </span>
                        {lockedOn ? (
                          <Lock className="size-3 text-[#8f3f2f]" aria-label="In use — cannot remove now" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-[12px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                        {lockedOn ? lockedReason.get(code) : meta?.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--op-ink,#121A16)_10%,transparent)] pt-4">
        <p className="text-[13px] text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
          Nothing is deleted when you turn a format off — its tools just hide, and come back if you turn it on again.
        </p>
        <Button disabled={busy || !dirty} onClick={() => void save()}>
          {busy ? "Saving…" : "Save formats"}
        </Button>
      </div>
    </div>
  );
}
