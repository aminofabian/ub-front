"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { NO_PICTURE_CHANGE, PictureField, type PictureChange } from "@/components/pictures/picture-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? `Change ${item.name}` : "Add to the menu"}</DialogTitle>
          <DialogDescription>
            A dish is made to order. A product is something from your shelf, like a bottled soda.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {!item ? (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What is it">
              {(["DISH", "ITEM"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className={cn(
                    "min-h-11 rounded-[2px] border px-3 py-2 text-sm font-semibold",
                    "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]",
                    kind === k &&
                      "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]",
                  )}
                  onClick={() => {
                    setKind(k);
                    setError(null);
                  }}
                >
                  {k === "DISH" ? "A dish we make" : "A product from the shelf"}
                </button>
              ))}
            </div>
          ) : null}

          {kind === "ITEM" ? (
            <div className="grid gap-1">
              <span className={dashboardLabelClass()}>Product</span>
              {product ? (
                <p className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{product.name}</span>
                  <button type="button" className="underline" onClick={() => setProduct(null)}>
                    Change
                  </button>
                </p>
              ) : (
                <>
                  <input
                    className={dashboardInputClass(false)}
                    placeholder="Search your products"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search.trim().length >= 2 ? (
                    results.length === 0 ? (
                      <span className={dashboardHintClass()}>No product found.</span>
                    ) : (
                      <ul className="divide-y rounded-[2px] border">
                        {results.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:underline"
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

          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>
              {kind === "DISH" ? "Name" : "Name on the menu (optional)"}
            </span>
            <input
              className={dashboardInputClass(false)}
              value={name}
              maxLength={191}
              placeholder={kind === "ITEM" ? "Uses the product's name if left empty" : undefined}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {kind === "DISH" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Price (KES)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
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
            <select className={dashboardSelectClass(false)} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No heading</option>
              {menu.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {menu.stations.length > 0 ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Made at</span>
              <select className={dashboardSelectClass(false)} value={stationId} onChange={(e) => setStationId(e.target.value)}>
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
              <select className={dashboardSelectClass(false)} value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}>
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
              <input type="time" aria-label="Served from" className={dashboardInputClass(false, "w-32 font-mono")} value={serveFrom} onChange={(e) => setServeFrom(e.target.value)} />
              <span>and</span>
              <input type="time" aria-label="Served until" className={dashboardInputClass(false, "w-32 font-mono")} value={serveTo} onChange={(e) => setServeTo(e.target.value)} />
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
                  className={dashboardInputClass(false, "w-28 font-mono")}
                  inputMode="decimal"
                  aria-label="Happy hour price"
                  placeholder="Price"
                  value={happyPrice}
                  onChange={(e) => setHappyPrice(cleanMoneyText(e.target.value))}
                />
                <span>from</span>
                <input type="time" aria-label="Happy hour starts" className={dashboardInputClass(false, "w-32 font-mono")} value={happyFrom} onChange={(e) => setHappyFrom(e.target.value)} />
                <span>to</span>
                <input type="time" aria-label="Happy hour ends" className={dashboardInputClass(false, "w-32 font-mono")} value={happyTo} onChange={(e) => setHappyTo(e.target.value)} />
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
                        "min-h-9 rounded-[2px] border px-2 text-sm",
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

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
