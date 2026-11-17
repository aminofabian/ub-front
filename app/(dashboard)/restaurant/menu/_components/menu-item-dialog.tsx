"use client";

import { ChefHat, ChevronDown, Package, Wine } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { NO_PICTURE_CHANGE, PictureField, type PictureChange } from "@/components/pictures/picture-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { ApiRequestError, fetchItems, fetchTaxRates, type ItemSummaryRecord, type TaxRateRecord } from "@/lib/api";
import {
  createMenuItem,
  removeMenuItemPicture,
  setMenuItemPicture,
  updateMenuItem,
  type MenuItemKind,
  type MenuItemRecord,
  type MenuRecord,
} from "@/lib/restaurant-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";
import { cn } from "@/lib/utils";

function hhmm(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function toMinute(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const minute = Number(m[1]) * 60 + Number(m[2]);
  return minute >= 0 && minute < 1440 ? minute : null;
}

/**
 * Add or change one thing on the menu. A dish is made to order and has its own price; a product
 * is something already in the catalogue (a soda, a beer) and keeps its shelf price and stock.
 */
export function MenuItemDialog({
  item,
  menu,
  onClose,
  onSaved,
}: {
  item: MenuItemRecord | null;
  menu: MenuRecord;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [kind, setKind] = useState<MenuItemKind>(item?.kind ?? "DISH");
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item?.price != null && item.kind === "DISH" ? String(item.price) : "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
  const [stationId, setStationId] = useState(item?.stationId ?? "");
  const [taxRateId, setTaxRateId] = useState(item?.taxRateId ?? "");
  const [groupIds, setGroupIds] = useState<string[]>(item?.modifierGroupIds ?? []);
  const [taxRates, setTaxRates] = useState<TaxRateRecord[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(
    item?.kind === "ITEM" && item.itemId ? { id: item.itemId, name: item.name } : null,
  );
  const [serveFrom, setServeFrom] = useState(item?.serveFromMinute != null ? hhmm(item.serveFromMinute) : "");
  const [serveTo, setServeTo] = useState(item?.serveToMinute != null ? hhmm(item.serveToMinute) : "");
  const [happyPrice, setHappyPrice] = useState(item?.happyPrice != null ? String(item.happyPrice) : "");
  const [happyFrom, setHappyFrom] = useState(item?.happyFromMinute != null ? hhmm(item.happyFromMinute) : "");
  const [happyTo, setHappyTo] = useState(item?.happyToMinute != null ? hhmm(item.happyToMinute) : "");
  const [happyDays, setHappyDays] = useState(item?.happyDays ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [picture, setPicture] = useState<PictureChange>(NO_PICTURE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Existing items may already use the advanced fields, so open the fold for them.
  const [moreOpen, setMoreOpen] = useState(
    Boolean(item && (item.stationId || item.serveFromMinute != null || item.happyPrice != null || (item.modifierGroupIds?.length ?? 0) > 0)),
  );
  const searchSeq = useRef(0);

  useEffect(() => {
    // Tax rates are optional on a dish; the form works without the list.
    void fetchTaxRates()
      .then(setTaxRates)
      .catch(() => setTaxRates([]));
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (kind !== "ITEM" || term.length < 2) {
      setResults([]);
      return;
    }
    // Only the newest search may show its results; a slow earlier one must not overwrite it.
    const seq = ++searchSeq.current;
    const timer = window.setTimeout(() => {
      void fetchItems(term, { size: 8 })
        .then((found) => {
          if (seq === searchSeq.current) setResults(found);
        })
        .catch(() => {
          if (seq === searchSeq.current) setResults([]);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, kind]);

  async function save() {
    setError(null);
    const trimmed = name.trim();
    const amount = parseMoney(price);
    if (kind === "DISH") {
      if (!trimmed) return setError("Give the dish a name");
      if (amount == null || amount <= 0) return setError("Type the price of the dish");
    } else if (!product) {
      return setError("Choose the product this sells");
    }
    // Serving hours and happy hour: each is all or nothing.
    const times: Partial<Parameters<typeof updateMenuItem>[1]> = {};
    if (serveFrom || serveTo) {
      const from = toMinute(serveFrom);
      const to = toMinute(serveTo);
      if (from == null || to == null) return setError("Serving hours need a start and an end");
      times.serveFromMinute = from;
      times.serveToMinute = to;
    } else if (item?.serveFromMinute != null) {
      times.clearServingHours = true;
    }
    if (kind === "DISH" && (happyPrice || happyFrom || happyTo)) {
      const from = toMinute(happyFrom);
      const to = toMinute(happyTo);
      const cost = parseMoney(happyPrice);
      if (from == null || to == null || cost == null || cost <= 0) {
        return setError("Happy hour needs a price, a start and an end");
      }
      times.happyPrice = cost;
      times.happyFromMinute = from;
      times.happyToMinute = to;
      times.happyDays = happyDays;
    } else if (item?.happyPrice != null) {
      times.clearHappyHour = true;
    }
    setSaving(true);
    try {
      const shared = { categoryId: categoryId || "", stationId: stationId || "", description: description.trim(), ...times };
      let saved: MenuItemRecord;
      if (kind === "DISH") {
        const body = {
          ...shared,
          name: trimmed,
          price: amount ?? undefined,
          taxRateId: taxRateId || "",
          modifierGroupIds: groupIds,
        };
        saved = item ? await updateMenuItem(item.id, body) : await createMenuItem({ ...body, kind: "DISH" });
      } else {
        const body = { ...shared, itemId: product!.id, ...(trimmed ? { name: trimmed } : {}) };
        saved = item ? await updateMenuItem(item.id, body) : await createMenuItem({ ...body, kind: "ITEM" });
      }
      // The picture goes up after the dish is saved, so a new dish has somewhere to put it. If
      // it fails the dish is still saved, and the owner is told only the picture was not.
      let pictureFailed: string | null = null;
      try {
        if (picture.file) await setMenuItemPicture(saved.id, picture.file);
        else if (picture.remove) await removeMenuItemPicture(saved.id);
      } catch (e) {
        pictureFailed = e instanceof ApiRequestError && e.message ? e.message : "The picture could not be saved";
      }
      if (pictureFailed) toast.error(`Saved, but without the picture: ${pictureFailed}`);
      else toast.success(item ? "Menu item saved" : "Added to the menu");
      await onSaved();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const previewName = name.trim() || (kind === "ITEM" ? product?.name ?? "" : "");
  const previewPrice = kind === "DISH" ? parseMoney(price) : null;
  // The entrance plays once when the drawer opens; each block comes in a beat after the one above
  // (the beat is the `--d` delay set per block). Honours reduced motion via `motion-safe`.
  const stepIn = () =>
    "motion-safe:animate-fade-in-up motion-safe:[animation-delay:var(--d)] motion-safe:[animation-fill-mode:both]";

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        side="right"
        className="w-[min(100%,34rem)] gap-0 rounded-none p-0 sm:rounded-none"
        overlayClassName="bg-[color-mix(in_srgb,var(--kiosk-text,#121A16)_32%,transparent)]"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header band */}
          <div className="border-b border-[var(--op-rule,var(--border))] bg-[var(--kiosk-panel,#EFEBE2)] px-5 pb-4 pt-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-serif text-[1.6rem] italic leading-none tracking-[-0.01em] text-[var(--kiosk-text,#121A16)]">
                {item ? `Change ${item.name}` : "Add to the menu"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[var(--kiosk-text-muted,#556159)]">
                {item
                  ? "Edit the details and save."
                  : "A dish is made to order. A product is something from your shelf, like a bottled soda."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {/* Live preview — the tile the customer will tap, built as you type */}
            <div
              className={cn(
                "mb-4 flex items-stretch gap-3 overflow-hidden rounded-[2px] border border-[var(--op-rule,var(--border))] bg-[var(--kiosk-elevated,#FCFAF5)] p-3",
                stepIn(),
              )}
              style={{ "--d": "40ms" } as CSSProperties}
            >
              <PreviewSwatch imageUrl={item?.imageUrl} localFile={picture.file} kind={kind} />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="truncate text-[15px] font-semibold text-[var(--kiosk-text,#121A16)]">
                  {previewName || <span className="text-[var(--kiosk-text-faint,#626D66)]">Your {kind === "DISH" ? "dish" : "drink"}…</span>}
                </p>
                {description.trim() ? (
                  <p className="truncate text-[12px] text-[var(--kiosk-text-muted,#556159)]">{description.trim()}</p>
                ) : null}
                <p className="mt-0.5 font-mono text-[13px] tabular-nums text-[var(--kiosk-highlight,#A55237)]">
                  {kind === "ITEM"
                    ? "Shelf price"
                    : previewPrice != null
                      ? formatMoney(previewPrice, "KES")
                      : "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {/* 1 · What it is */}
              {!item ? (
                <div className={cn("grid grid-cols-2 gap-2", stepIn())} style={{ "--d": "90ms" } as CSSProperties} role="radiogroup" aria-label="What is it">
                  <ChoiceCard
                    active={kind === "DISH"}
                    icon={<ChefHat className="size-5" aria-hidden />}
                    title="A dish we make"
                    hint="Made to order, your price"
                    onClick={() => {
                      setKind("DISH");
                      setError(null);
                    }}
                  />
                  <ChoiceCard
                    active={kind === "ITEM"}
                    icon={<Package className="size-5" aria-hidden />}
                    title="From the shelf"
                    hint="A soda, a beer — shelf price"
                    onClick={() => {
                      setKind("ITEM");
                      setError(null);
                    }}
                  />
                </div>
              ) : null}

              {/* Product picker (products only) */}
              {kind === "ITEM" ? (
                <div className={cn("grid gap-1", stepIn())} style={{ "--d": "140ms" } as CSSProperties}>
                  <span className={dashboardLabelClass()}>Which product?</span>
                  {product ? (
                    <div className="flex items-center justify-between gap-2 rounded-[2px] border border-[var(--op-rule,var(--border))] bg-[var(--kiosk-elevated,#FCFAF5)] px-3 py-2.5 text-sm">
                      <span className="font-medium">{product.name}</span>
                      <button type="button" className="text-[var(--pos-primary,#1D4B3B)] underline" onClick={() => setProduct(null)}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        className={dashboardInputClass(false, "h-11")}
                        placeholder="Search your products…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search.trim().length >= 2 ? (
                        results.length === 0 ? (
                          <span className={dashboardHintClass()}>No product found. Add it to your stock first.</span>
                        ) : (
                          <ul className="divide-y divide-[var(--op-rule,var(--border))] rounded-[2px] border border-[var(--op-rule,var(--border))]">
                            {results.map((r) => (
                              <li key={r.id}>
                                <button
                                  type="button"
                                  className="min-h-11 w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_6%,transparent)]"
                                  onClick={() => {
                                    setProduct({ id: r.id, name: r.variantName ? `${r.name} ${r.variantName}` : r.name });
                                    setSearch("");
                                  }}
                                >
                                  {r.name}
                                  {r.variantName ? ` · ${r.variantName}` : ""}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : null}
                    </>
                  )}
                  <span className={dashboardHintClass()}>It sells at its shelf price and comes off your stock.</span>
                </div>
              ) : null}

              {/* 2 · The basics */}
              <div className={cn("grid gap-4", stepIn())} style={{ "--d": "190ms" } as CSSProperties}>
                <label className="grid gap-1">
                  <span className={dashboardLabelClass()}>{kind === "DISH" ? "Name" : "Name on the menu (optional)"}</span>
                  <input
                    className={dashboardInputClass(false, "h-11")}
                    value={name}
                    maxLength={191}
                    autoFocus={!item && kind === "DISH"}
                    placeholder={kind === "ITEM" ? "Uses the product's name if left empty" : "e.g. Nyama choma"}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                {kind === "DISH" ? (
                  <label className="grid gap-1">
                    <span className={dashboardLabelClass()}>Price (KES)</span>
                    <input
                      className={dashboardInputClass(false, "h-11 font-mono")}
                      inputMode="decimal"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(cleanMoneyText(e.target.value))}
                    />
                    <span className={dashboardHintClass()}>Before any choices that cost extra.</span>
                  </label>
                ) : null}

                <label className="grid gap-1">
                  <span className={dashboardLabelClass()}>What it is (optional)</span>
                  <textarea
                    className={dashboardInputClass(false, "min-h-[4.5rem] py-2")}
                    value={description}
                    maxLength={500}
                    rows={2}
                    placeholder={kind === "DISH" ? "Grilled beef, kachumbari, a side of ugali" : undefined}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <span className={dashboardHintClass()}>A line customers read under the name.</span>
                </label>

                <PictureField currentUrl={item?.imageUrl} change={picture} onChange={setPicture} disabled={saving} />

                <label className="grid gap-1">
                  <span className={dashboardLabelClass()}>Heading</span>
                  <select className={dashboardSelectClass(false, "h-11")} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">No heading</option>
                    {menu.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 3 · The rest, folded away until wanted */}
              <div className={stepIn()} style={{ "--d": "240ms" } as CSSProperties}>
                <MoreOptions open={moreOpen} onToggle={() => setMoreOpen((v) => !v)}>
                  {menu.stations.length > 0 ? (
                    <label className="grid gap-1">
                      <span className={dashboardLabelClass()}>Made at</span>
                      <select className={dashboardSelectClass(false, "h-11")} value={stationId} onChange={(e) => setStationId(e.target.value)}>
                        <option value="">
                          {kind === "DISH" ? "Where its heading says, else the kitchen" : "Where its heading says, else nowhere"}
                        </option>
                        {menu.stations.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {kind === "ITEM" ? (
                        <span className={dashboardHintClass()}>
                          A product with no station is handed over at the counter and never shows in the kitchen.
                        </span>
                      ) : null}
                    </label>
                  ) : null}

                  {kind === "DISH" && menu.modifierGroups.length > 0 ? (
                    <fieldset className="grid gap-1">
                      <legend className={dashboardLabelClass()}>Choices offered with it</legend>
                      {menu.modifierGroups.map((g) => (
                        <label key={g.id} className="flex min-h-9 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="accent-[var(--pos-primary,#1D4B3B)]"
                            checked={groupIds.includes(g.id)}
                            onChange={(e) =>
                              setGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)))
                            }
                          />
                          <span>
                            {g.name} <span className={dashboardHintClass()}>· {g.options.map((o) => o.name).join(", ")}</span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ) : null}

                  {kind === "DISH" && taxRates.length > 0 ? (
                    <label className="grid gap-1">
                      <span className={dashboardLabelClass()}>Tax rate</span>
                      <select className={dashboardSelectClass(false, "h-11")} value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}>
                        <option value="">None set</option>
                        {taxRates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <span className={dashboardHintClass()}>
                        The price already includes it. Ask your accountant which rate applies to food you prepare.
                      </span>
                    </label>
                  ) : null}

                  <fieldset className="grid gap-1">
                    <legend className={dashboardLabelClass()}>Served only between (optional)</legend>
                    <div className="flex items-center gap-2">
                      <input type="time" aria-label="Served from" className={dashboardInputClass(false, "h-11 w-32 font-mono")} value={serveFrom} onChange={(e) => setServeFrom(e.target.value)} />
                      <span className="text-sm text-[var(--kiosk-text-muted,#556159)]">and</span>
                      <input type="time" aria-label="Served until" className={dashboardInputClass(false, "h-11 w-32 font-mono")} value={serveTo} onChange={(e) => setServeTo(e.target.value)} />
                    </div>
                    <span className={dashboardHintClass()}>
                      Breakfast until 11:00, say. Outside these hours it cannot be ordered. Leave both empty for all day.
                    </span>
                  </fieldset>

                  {kind === "DISH" ? (
                    <fieldset className="grid gap-1">
                      <legend className={dashboardLabelClass()}>Happy hour (optional)</legend>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className={dashboardInputClass(false, "h-11 w-28 font-mono")}
                          inputMode="decimal"
                          aria-label="Happy hour price"
                          placeholder="Price"
                          value={happyPrice}
                          onChange={(e) => setHappyPrice(cleanMoneyText(e.target.value))}
                        />
                        <span className="text-sm text-[var(--kiosk-text-muted,#556159)]">from</span>
                        <input type="time" aria-label="Happy hour starts" className={dashboardInputClass(false, "h-11 w-32 font-mono")} value={happyFrom} onChange={(e) => setHappyFrom(e.target.value)} />
                        <span className="text-sm text-[var(--kiosk-text-muted,#556159)]">to</span>
                        <input type="time" aria-label="Happy hour ends" className={dashboardInputClass(false, "h-11 w-32 font-mono")} value={happyTo} onChange={(e) => setHappyTo(e.target.value)} />
                      </div>
                      <div className="flex flex-wrap gap-1" role="group" aria-label="Days happy hour runs">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
                          const digit = String(i + 1);
                          const on = happyDays.includes(digit);
                          return (
                            <button
                              key={digit}
                              type="button"
                              aria-pressed={on}
                              className={cn(
                                "min-h-9 min-w-10 rounded-[2px] border px-2 text-sm transition-colors",
                                "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
                                on &&
                                  "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)] font-semibold",
                              )}
                              onClick={() =>
                                setHappyDays((prev) =>
                                  (on ? prev.replace(digit, "") : prev + digit).split("").sort().join(""),
                                )
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <span className={dashboardHintClass()}>
                        The dish costs this instead of its usual price during these hours. No day ticked means every day.
                        An end before the start runs past midnight.
                      </span>
                    </fieldset>
                  ) : null}
                </MoreOptions>
              </div>

              {error ? (
                <p role="alert" className="rounded-[2px] bg-[color-mix(in_srgb,#b91c1c_8%,transparent)] px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--op-rule,var(--border))] bg-[var(--kiosk-elevated,#FCFAF5)] px-5 py-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button className="min-w-32" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : item ? "Save" : kind === "DISH" ? "Add the dish" : "Add it"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A tactile dish/product choice. The chosen one lifts and tints forest. */
function ChoiceCard({
  active,
  icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "group grid content-start gap-1.5 rounded-[2px] border px-3 py-3 text-left transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] bg-[var(--kiosk-elevated,#FCFAF5)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
        "motion-safe:active:scale-[0.98]",
        active
          ? "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)] shadow-[0_8px_24px_-16px_rgba(29,75,59,0.5)] motion-safe:-translate-y-0.5"
          : "hover:border-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_40%,transparent)]",
      )}
    >
      <span className={cn("transition-colors", active ? "text-[var(--pos-primary,#1D4B3B)]" : "text-[var(--kiosk-text-muted,#556159)]")}>
        {icon}
      </span>
      <span className="text-sm font-semibold text-[var(--kiosk-text,#121A16)]">{title}</span>
      <span className="text-[12px] text-[var(--kiosk-text-muted,#556159)]">{hint}</span>
    </button>
  );
}

/** The preview swatch: the chosen picture, else a quiet icon placeholder. */
function PreviewSwatch({ imageUrl, localFile, kind }: { imageUrl?: string | null; localFile?: File | null; kind: MenuItemKind }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);
  const src = localUrl ?? imageUrl ?? null;
  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-[var(--op-rule,var(--border))] bg-[var(--kiosk-panel,#EFEBE2)]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : kind === "ITEM" ? (
        <Wine className="size-5 text-[var(--kiosk-text-faint,#626D66)]" aria-hidden />
      ) : (
        <ChefHat className="size-5 text-[var(--kiosk-text-faint,#626D66)]" aria-hidden />
      )}
    </div>
  );
}

/** A quiet disclosure for the fields most dishes leave alone. Opens with a smooth reveal. */
function MoreOptions({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="rounded-[2px] border border-[var(--op-rule,var(--border))]">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--kiosk-text,#121A16)]"
      >
        <span>
          More options
          <span className="ml-1.5 font-normal text-[var(--kiosk-text-muted,#556159)]">heading, station, hours, happy hour</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--kiosk-text-muted,#556159)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="grid gap-4 border-t border-[var(--op-rule,var(--border))] p-3 motion-safe:animate-fade-in-up">
          {children}
        </div>
      ) : null}
    </div>
  );
}
