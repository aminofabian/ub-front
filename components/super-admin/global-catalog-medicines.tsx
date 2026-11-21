"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  exportSaCatalogMedicinesCsv,
  fetchSaProductMedicine,
  importSaCatalogMedicinesCsv,
  removeSaProductMedicine,
  saveSaProductMedicine,
  type SaMedicineImportResult,
  type SaProductMedicineInput,
  type SaSuggestedClass,
} from "@/lib/super-admin-api";

const CLASS_OPTIONS: Array<{ value: SaSuggestedClass | ""; label: string }> = [
  { value: "", label: "No suggestion" },
  { value: "OTC", label: "Over the counter" },
  { value: "PRESCRIPTION_ONLY", label: "Prescription only" },
  { value: "CONTROLLED", label: "Controlled" },
];

const EMPTY: SaProductMedicineInput = {
  genericName: "",
  strength: "",
  dosageForm: "",
  packSize: "",
  manufacturer: "",
  suggestedClass: "",
};

function message(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Medicine details for one catalogue product, shown in the Curate editor. Saves on its own button
 * because it is a separate record from the product.
 */
export function GlobalCatalogMedicineFields({
  productId,
  storeKitId,
}: {
  productId: string;
  storeKitId: string | null | undefined;
}) {
  const isPharmacy = (storeKitId ?? "").trim().toLowerCase() === "pharmacy";
  const [form, setForm] = useState<SaProductMedicineInput>(EMPTY);
  const [marked, setMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isPharmacy) return;
    let alive = true;
    setLoading(true);
    fetchSaProductMedicine(productId)
      .then((m) => {
        if (!alive) return;
        setMarked(m.medicine);
        setForm({
          genericName: m.genericName ?? "",
          strength: m.strength ?? "",
          dosageForm: m.dosageForm ?? "",
          packSize: m.packSize ?? "",
          manufacturer: m.manufacturer ?? "",
          suggestedClass: m.suggestedClass ?? "",
        });
      })
      .catch((e) => {
        if (alive) toast.error(message(e, "Could not load medicine details."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [productId, isPharmacy]);

  if (!isPharmacy) return null;

  const set = (key: keyof SaProductMedicineInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSaProductMedicine(productId, form);
      setMarked(true);
      toast.success("Medicine details saved.");
    } catch (e) {
      toast.error(message(e, "Could not save medicine details."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await removeSaProductMedicine(productId);
      setMarked(false);
      setForm(EMPTY);
      toast.success("No longer a medicine in the catalogue.");
    } catch (e) {
      toast.error(message(e, "Could not remove medicine details."));
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div>
        <p className="text-sm font-semibold">Medicine details</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {marked
            ? "Shops that add this product get it marked as a medicine with these details."
            : "Not marked as a medicine. Save details here to mark it."}{" "}
          The class is only a suggestion: each shop&apos;s pharmacist confirms it before the product can be sold.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="gc-med-generic">Generic name</Label>
          <Input id="gc-med-generic" value={form.genericName} onChange={set("genericName")} maxLength={255} disabled={disabled} placeholder="e.g. Amoxicillin" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gc-med-strength">Strength</Label>
          <Input id="gc-med-strength" value={form.strength} onChange={set("strength")} maxLength={64} disabled={disabled} placeholder="e.g. 500 mg" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gc-med-form">Dosage form</Label>
          <Input id="gc-med-form" value={form.dosageForm} onChange={set("dosageForm")} maxLength={64} disabled={disabled} placeholder="e.g. Capsule" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gc-med-pack">Pack size</Label>
          <Input id="gc-med-pack" value={form.packSize} onChange={set("packSize")} maxLength={64} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gc-med-maker">Manufacturer</Label>
          <Input id="gc-med-maker" value={form.manufacturer} onChange={set("manufacturer")} maxLength={191} disabled={disabled} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="gc-med-class">Suggested class</Label>
          <select
            id="gc-med-class"
            className={saSelectClass}
            value={form.suggestedClass}
            disabled={disabled}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, suggestedClass: e.target.value as SaSuggestedClass | "" }))
            }
          >
            {CLASS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void save()}>
          {marked ? "Save medicine details" : "Mark as a medicine"}
        </Button>
        {marked ? (
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => void remove()}>
            Not a medicine
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** The Medicines tab: fill in medicine details for the whole pharmacy catalogue from a sheet. */
export function GlobalCatalogMedicinesPanel({
  catalogId,
  busy,
  onBusyChange,
}: {
  catalogId: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [checked, setChecked] = useState<SaMedicineImportResult | null>(null);
  const [applied, setApplied] = useState<SaMedicineImportResult | null>(null);

  useEffect(() => {
    setFile(null);
    setChecked(null);
    setApplied(null);
  }, [catalogId]);

  const download = async () => {
    onBusyChange(true);
    try {
      const exported = await exportSaCatalogMedicinesCsv(catalogId);
      const url = URL.createObjectURL(exported.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exported.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(message(e, "Could not download the sheet."));
    } finally {
      onBusyChange(false);
    }
  };

  const run = async (dryRun: boolean) => {
    if (!file) return;
    onBusyChange(true);
    try {
      const result = await importSaCatalogMedicinesCsv(file, { catalogId, dryRun });
      if (dryRun) {
        setChecked(result);
        setApplied(null);
      } else {
        setApplied(result);
        setChecked(null);
        toast.success(`${result.created + result.updated} products updated.`);
      }
    } catch (e) {
      toast.error(message(e, dryRun ? "Could not check the file." : "Could not apply the file."));
    } finally {
      onBusyChange(false);
    }
  };

  const result = applied ?? checked;
  const changes = checked ? checked.created + checked.updated : 0;

  return (
    <SaSection
      title="Medicines"
      description="Give pharmacy products a generic name, strength, form and a suggested class. Shops that add them get the product marked as a medicine; their pharmacist confirms the class before it can be sold."
      actions={
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void download()}>
          Download sheet
        </Button>
      }
    >
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Download the sheet. It lists every product in the pharmacy vertical.</li>
          <li>
            Fill in generic_name, strength, dosage_form, pack_size, manufacturer and suggested_class (OTC,
            PRESCRIPTION_ONLY or CONTROLLED). Rows you leave blank are skipped.
          </li>
          <li>Upload it, check what will change, then apply.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Medicine details CSV"
            disabled={busy}
            className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setChecked(null);
              setApplied(null);
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy || !file} onClick={() => void run(true)}>
            Check file
          </Button>
          <Button type="button" size="sm" disabled={busy || !file || !checked || changes === 0} onClick={() => void run(false)}>
            {changes > 0 ? `Apply ${changes} changes` : "Apply"}
          </Button>
        </div>
        {result ? (
          <div className="space-y-3 rounded-lg border border-border/60 p-3 text-sm" aria-live="polite">
            <p className="font-medium">
              {applied ? "Applied." : "Checked. Nothing has been changed yet."}
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {(
                [
                  ["Newly marked", result.created],
                  ["Updated", result.updated],
                  ["Already up to date", result.unchanged],
                  ["Skipped", result.skipped.length],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {result.skipped.length > 0 ? (
              <ul className="max-h-56 space-y-1 overflow-y-auto border-t border-border/60 pt-2 text-[13px] leading-snug text-muted-foreground">
                {result.skipped.slice(0, 200).map((s) => (
                  <li key={`${s.row}-${s.reason}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                    <span className="tabular-nums text-foreground">Row {s.row}</span>
                    <span>{s.reason}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </SaSection>
  );
}
