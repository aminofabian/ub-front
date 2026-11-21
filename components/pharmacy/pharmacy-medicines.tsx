"use client";

import { ProductsToReviewPanel } from "@/components/pharmacy/products-to-review";
import { Pill, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  RX_INK,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  classTone,
  errorText,
} from "@/components/pharmacy/pharmacy-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { MedicineStockDialog, type MedicineStockTarget } from "@/components/pharmacy/medicine-stock-dialog";
import { Chip, EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchItemTypes, fetchItems, type ItemSummaryRecord, type ItemTypeRecord } from "@/lib/api";
import {
  DISPENSING_CLASSES,
  DISPENSING_CLASS_HINT,
  DISPENSING_CLASS_LABEL,
  classifyMedicines,
  confirmSuggestedClasses,
  fetchMedicines,
  markMedicines,
  saveMedicine,
  unmarkMedicine,
  type DispensingClass,
  type MedicineRecord,
} from "@/lib/pharmacy-api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type Props = {
  canManage: boolean;
  initialClass: DispensingClass | null;
  onChanged: () => void;
};

export function PharmacyMedicines({ canManage, initialClass, onChanged }: Props) {
  const [cls, setCls] = useState<DispensingClass | null>(initialClass);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<MedicineRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkClass, setBulkClass] = useState<DispensingClass>("OTC");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<MedicineRecord | null>(null);
  const [marking, setMarking] = useState(false);
  const [stocking, setStocking] = useState<MedicineStockTarget[] | null>(null);
  const { me } = useDashboard();
  const canAddStock = hasPermission(me?.permissions, Permission.InventoryWrite);

  const load = useCallback(() => {
    setLoading(true);
    fetchMedicines({ dispensingClass: cls, q: search, page, size: PAGE_SIZE })
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setError("");
      })
      .catch((err) => setError(errorText(err, "Could not load medicines.")))
      .finally(() => setLoading(false));
  }, [cls, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const refresh = useCallback(() => {
    setSelected(new Set());
    load();
    onChanged();
  }, [load, onChanged]);

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.itemId));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) rows.forEach((r) => next.delete(r.itemId));
      else rows.forEach((r) => next.add(r.itemId));
      return next;
    });
  };
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulk = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await classifyMedicines([...selected], bulkClass);
      toast.success(
        `${res.changed} set to ${DISPENSING_CLASS_LABEL[bulkClass].toLowerCase()}${res.skipped ? `, ${res.skipped} unchanged` : ""}`,
      );
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Could not classify."));
    } finally {
      setBusy(false);
    }
  };

  const suggestedSelected = rows.filter(
    (r) => selected.has(r.itemId) && r.dispensingClass === "UNCLASSIFIED" && r.suggestedClass,
  );
  const suggestedOnPage = rows.filter((r) => r.dispensingClass === "UNCLASSIFIED" && r.suggestedClass);
  const selectSuggested = () => setSelected(new Set(suggestedOnPage.map((r) => r.itemId)));
  const selectedOnPage = rows.filter((r) => selected.has(r.itemId));

  const acceptSuggested = async () => {
    if (suggestedSelected.length === 0) return;
    setBusy(true);
    try {
      const res = await confirmSuggestedClasses(suggestedSelected.map((r) => r.itemId));
      toast.success(`${res.changed} set to the suggested class`);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Could not accept the suggested classes."));
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {canManage ? (
        <ProductsToReviewPanel
          onChanged={() => {
            load();
            onChanged?.();
          }}
        />
      ) : null}
      <Panel
        title="Medicines"
        description="A product marked as a medicine must be received with a lot number and expiry, is sold earliest-expiry-first, and is never sold without real stock."
        aside={
          canManage ? (
            <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setMarking(true)}>
              Mark medicines
            </Button>
          ) : null
        }
        flush
      >
        <div className={cn("flex flex-wrap items-center gap-2 border-b px-4 py-3", RX_RULE)}>
          <div className="relative min-w-[14rem] flex-1">
            <Search className={cn("pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2", RX_MUTED)} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand, generic name, SKU or barcode"
              aria-label="Search medicines"
              className={cn(RX_INPUT, "pl-8")}
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by dispensing class">
            <FilterButton active={cls === null} onClick={() => { setCls(null); setPage(0); }}>
              All
            </FilterButton>
            {DISPENSING_CLASSES.map((c) => (
              <FilterButton key={c} active={cls === c} onClick={() => { setCls(c); setPage(0); }}>
                {DISPENSING_CLASS_LABEL[c]}
              </FilterButton>
            ))}
          </div>
        </div>

        {(canManage || canAddStock) && selected.size > 0 ? (
          <div className={cn("flex flex-wrap items-center gap-2 border-b px-4 py-2.5", RX_RULE)}>
            <span className={cn("text-sm font-medium", RX_INK)}>{selected.size} selected</span>
            <select
              aria-label="Dispensing class for the selected medicines"
              className={cn(RX_INPUT, "w-auto")}
              value={bulkClass}
              onChange={(e) => setBulkClass(e.target.value as DispensingClass)}
            >
              {DISPENSING_CLASSES.filter((c) => c !== "UNCLASSIFIED").map((c) => (
                <option key={c} value={c}>
                  {DISPENSING_CLASS_LABEL[c]}
                </option>
              ))}
            </select>
            <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => void applyBulk()}>
              Set class
            </Button>
            <span className={cn("text-[12.5px]", RX_MUTED)}>{DISPENSING_CLASS_HINT[bulkClass]}</span>
            {canAddStock && selectedOnPage.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="ml-auto h-11 rounded-[2px] px-3.5 sm:h-9"
                disabled={busy}
                onClick={() => setStocking(selectedOnPage.map((r) => ({ itemId: r.itemId, name: r.name })))}
              >
                Add stock for {selectedOnPage.length}
              </Button>
            ) : null}
            {suggestedSelected.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className={cn("h-11 rounded-[2px] px-3.5 sm:h-9", canAddStock ? "" : "ml-auto")}
                disabled={busy}
                onClick={() => void acceptSuggested()}
              >
                Accept suggested class for {suggestedSelected.length}
              </Button>
            ) : null}
          </div>
        ) : null}

        {canManage && suggestedOnPage.length > 0 && selected.size === 0 ? (
          <p className={cn("border-b px-4 py-2.5 text-[13px]", RX_RULE, RX_MUTED)}>
            {suggestedOnPage.length === 1
              ? "1 medicine on this page has a class suggested by the catalogue."
              : `${suggestedOnPage.length} medicines on this page have a class suggested by the catalogue.`}{" "}
            <button
              type="button"
              className="font-medium text-[var(--op-accent,#1d4b3b)] underline underline-offset-4"
              onClick={selectSuggested}
            >
              Select {suggestedOnPage.length === 1 ? "it" : "them"}
            </button>{" "}
            to check and accept.
          </p>
        ) : null}

        {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}

        {!loading && rows.length === 0 && !error ? (
          <EmptyState
            icon={Pill}
            title={search || cls ? "Nothing matches" : "No medicines yet"}
            body={
              search || cls
                ? "Try another search or filter."
                : "Mark the products that are medicines. You can mark a whole department at once. Medicines you add from the pharmacy catalogue are marked for you."
            }
            action={
              canManage && !search && !cls ? (
                <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setMarking(true)}>
                  Mark medicines
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  {canManage ? (
                    <th className={cn(RX_TH, "w-10")}>
                      <input
                        type="checkbox"
                        aria-label="Select every medicine on this page"
                        checked={allOnPage}
                        onChange={toggleAll}
                      />
                    </th>
                  ) : null}
                  <th className={RX_TH}>Medicine</th>
                  <th className={RX_TH}>Generic and strength</th>
                  <th className={RX_TH}>Class</th>
                  <th className={cn(RX_TH, "text-right")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.itemId} className={RX_ROW}>
                    {canManage ? (
                      <td className={RX_TD}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.name}`}
                          checked={selected.has(r.itemId)}
                          onChange={() => toggle(r.itemId)}
                        />
                      </td>
                    ) : null}
                    <td className={RX_TD}>
                      <p className={cn("font-medium", RX_INK)}>{r.name}</p>
                      {r.sku ? <p className={cn("font-mono text-[12px]", RX_MUTED)}>{r.sku}</p> : null}
                    </td>
                    <td className={cn(RX_TD, RX_MUTED)}>
                      {[r.genericName, r.strength, r.dosageForm].filter(Boolean).join(" · ") || "Not recorded"}
                    </td>
                    <td className={RX_TD}>
                      <Chip tone={classTone(r.dispensingClass)}>{DISPENSING_CLASS_LABEL[r.dispensingClass]}</Chip>
                      {r.dispensingClass === "UNCLASSIFIED" && r.suggestedClass ? (
                        <p className={cn("mt-1 text-[12.5px] leading-snug", RX_MUTED)}>
                          Catalogue suggests {DISPENSING_CLASS_LABEL[r.suggestedClass].toLowerCase()}
                        </p>
                      ) : null}
                    </td>
                    <td className={cn(RX_TD, "text-right")}>
                      <div className="flex justify-end gap-1.5">
                        {canAddStock ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-[2px] px-3.5 sm:h-9"
                            onClick={() => setStocking([{ itemId: r.itemId, name: r.name }])}
                          >
                            Add stock
                          </Button>
                        ) : null}
                        {canManage ? (
                          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setEditing(r)}>
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {total > PAGE_SIZE ? (
          <div className={cn("flex items-center justify-between border-t px-4 py-2.5 text-sm", RX_RULE, RX_MUTED)}>
            <span>
              Page {page + 1} of {pages} · {total} medicines
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {editing ? (
        <MedicineEditor
          medicine={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
      {stocking ? (
        <MedicineStockDialog
          medicines={stocking}
          onClose={() => setStocking(null)}
          onSaved={() => {
            setStocking(null);
            refresh();
          }}
        />
      ) : null}
      {marking ? (
        <MarkMedicinesDialog
          onClose={() => setMarking(false)}
          onDone={() => {
            setMarking(false);
            refresh();
          }}
        />
      ) : null}
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-[2px] border px-2.5 text-[13px] transition-colors",
        active
          ? "border-[var(--op-accent,#1d4b3b)] bg-[var(--op-accent,#1d4b3b)] text-white"
          : cn(RX_RULE, RX_MUTED, "hover:text-[var(--op-ink,#121a16)]"),
      )}
    >
      {children}
    </button>
  );
}

export function MedicineEditor({
  medicine,
  isNew = false,
  onClose,
  onSaved,
}: {
  medicine: MedicineRecord;
  /** The product is not a medicine yet: saving marks it, and there is nothing to un-mark. */
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    genericName: medicine.genericName ?? "",
    strength: medicine.strength ?? "",
    dosageForm: medicine.dosageForm ?? "",
    packSize: medicine.packSize ?? "",
    manufacturer: medicine.manufacturer ?? "",
    registrationNo: medicine.registrationNo ?? "",
    storageNote: medicine.storageNote ?? "",
  });
  const [cls, setCls] = useState<DispensingClass>(medicine.dispensingClass);
  const [restock, setRestock] = useState(medicine.restockOnRefund);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await saveMedicine(medicine.itemId, { ...form, dispensingClass: cls, restockOnRefund: restock });
      toast.success("Saved");
      onSaved();
    } catch (err) {
      setError(errorText(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Stop treating ${medicine.name} as a medicine? Its stock and dispensing rules will no longer apply.`)) {
      return;
    }
    setBusy(true);
    try {
      await unmarkMedicine(medicine.itemId);
      toast.success("No longer marked as a medicine");
      onSaved();
    } catch (err) {
      setError(errorText(err, "Could not remove."));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent side="center" className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>{medicine.name}</DialogTitle>
            <DialogDescription>
              {isNew
                ? "Marking this as a medicine means it needs a lot number and expiry date when received. Stock already on the shelf without them cannot be sold until you add them."
                : "Medicine details and how the till treats it."}
            </DialogDescription>
          </DialogHeader>
          <Field label="Dispensing class" hint={DISPENSING_CLASS_HINT[cls]}>
            <select className={RX_INPUT} value={cls} onChange={(e) => setCls(e.target.value as DispensingClass)}>
              {DISPENSING_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {DISPENSING_CLASS_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          {medicine.dispensingClass === "UNCLASSIFIED" && medicine.suggestedClass && cls === "UNCLASSIFIED" ? (
            <p className={cn("-mt-2 text-[13px] leading-snug", RX_MUTED)}>
              The catalogue suggests {DISPENSING_CLASS_LABEL[medicine.suggestedClass].toLowerCase()}. Check it
              against the pack, then{" "}
              <button
                type="button"
                className="font-medium text-[var(--op-accent,#1d4b3b)] underline underline-offset-4"
                onClick={() => setCls(medicine.suggestedClass as DispensingClass)}
              >
                use it
              </button>
              .
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Generic name" className="sm:col-span-2">
              <input className={RX_INPUT} value={form.genericName} onChange={set("genericName")} maxLength={255} placeholder="e.g. Amoxicillin" />
            </Field>
            <Field label="Strength">
              <input className={RX_INPUT} value={form.strength} onChange={set("strength")} maxLength={64} placeholder="e.g. 500 mg" />
            </Field>
            <Field label="Dosage form">
              <input className={RX_INPUT} value={form.dosageForm} onChange={set("dosageForm")} maxLength={64} placeholder="e.g. Capsule" />
            </Field>
            <Field label="Pack size">
              <input className={RX_INPUT} value={form.packSize} onChange={set("packSize")} maxLength={64} placeholder="e.g. 100 capsules" />
            </Field>
            <Field label="Manufacturer">
              <input className={RX_INPUT} value={form.manufacturer} onChange={set("manufacturer")} maxLength={191} />
            </Field>
            <Field label="Registration number">
              <input className={RX_INPUT} value={form.registrationNo} onChange={set("registrationNo")} maxLength={64} />
            </Field>
            <Field label="Storage note">
              <input className={RX_INPUT} value={form.storageNote} onChange={set("storageNote")} maxLength={255} placeholder="e.g. Keep refrigerated" />
            </Field>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={restock}
              disabled={cls !== "OTC"}
              onChange={(e) => setRestock(e.target.checked)}
            />
            <span>
              <span className={cn("font-medium", RX_INK)}>Put refunded units back on the shelf</span>
              <span className={cn("block text-[12.5px] leading-snug", RX_MUTED)}>
                Only for sealed over-the-counter items. Otherwise a refunded medicine is quarantined for disposal.
              </span>
            </span>
          </label>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {isNew ? (
              <span />
            ) : (
              <Button type="button" variant="outline" className="text-destructive" disabled={busy} onClick={() => void remove()}>
                Not a medicine
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {isNew ? "Mark as a medicine" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MarkMedicinesDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [types, setTypes] = useState<ItemTypeRecord[]>([]);
  const [itemTypeId, setItemTypeId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [cls, setCls] = useState<DispensingClass>("UNCLASSIFIED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchItemTypes()
      .then((list) => setTypes(list.filter((t) => t.active)))
      .catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      fetchItems(q, { size: 20 })
        .then((list) => {
          if (alive) setResults(list);
        })
        .catch(() => {
          if (alive) setResults([]);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const pickedList = useMemo(() => [...picked.entries()], [picked]);

  const submit = async () => {
    if (!itemTypeId && picked.size === 0) {
      setError("Choose a department or at least one product.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await markMedicines({
        itemIds: [...picked.keys()],
        itemTypeId: itemTypeId || undefined,
        dispensingClass: cls,
      });
      toast.success(
        `${res.changed} marked as medicines${res.skipped ? `, ${res.skipped} already marked` : ""}`,
      );
      onDone();
    } catch (err) {
      setError(errorText(err, "Could not mark."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent side="center" className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Mark medicines</DialogTitle>
            <DialogDescription>
              Mark every product in a department, pick products one by one, or both. Things like plasters
              and thermometers do not need marking.
            </DialogDescription>
          </DialogHeader>
          <Field label="A whole department" hint="Products already marked are left as they are.">
            <select className={RX_INPUT} value={itemTypeId} onChange={(e) => setItemTypeId(e.target.value)}>
              <option value="">None</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Single products">
            <input
              className={RX_INPUT}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
            />
          </Field>
          {results.length > 0 ? (
            <ul className={cn("max-h-44 overflow-y-auto rounded-[2px] border", RX_RULE)}>
              {results.map((item) => {
                const on = picked.has(item.id);
                return (
                  <li key={item.id} className={RX_ROW}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked((prev) => {
                            const next = new Map(prev);
                            if (on) next.delete(item.id);
                            else next.set(item.id, item.name);
                            return next;
                          })
                        }
                      />
                      <span className="min-w-0 truncate">{item.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {pickedList.length > 0 ? (
            <p className={cn("text-[13px]", RX_MUTED)}>
              Picked: {pickedList.map(([, name]) => name).join(", ")}
            </p>
          ) : null}
          <Field label="Dispensing class for these" hint={DISPENSING_CLASS_HINT[cls]}>
            <select className={RX_INPUT} value={cls} onChange={(e) => setCls(e.target.value as DispensingClass)}>
              {DISPENSING_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c === "UNCLASSIFIED" ? "Decide later" : DISPENSING_CLASS_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Mark as medicines
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
