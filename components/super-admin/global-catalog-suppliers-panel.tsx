"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSaSupplierTemplate,
  deleteSaProductSupplierLink,
  fetchSaProductSupplierLinks,
  fetchSaSupplierTemplates,
  patchSaSupplierTemplate,
  upsertSaProductSupplierLink,
  type SaProductSupplierLink,
  type SaSupplierTemplate,
} from "@/lib/super-admin-api";

type GlobalCatalogSuppliersPanelProps = {
  catalogId: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => Promise<void>;
};

export function GlobalCatalogSuppliersPanel({
  catalogId,
  busy,
  onBusyChange,
  onSaved,
}: GlobalCatalogSuppliersPanelProps) {
  const [rows, setRows] = useState<SaSupplierTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [supplierType, setSupplierType] = useState("distributor");
  const [vatPin, setVatPin] = useState("");
  const [notes, setNotes] = useState("");

  const [attachProductId, setAttachProductId] = useState("");
  const [attachLinks, setAttachLinks] = useState<SaProductSupplierLink[]>([]);
  const [attachCost, setAttachCost] = useState("");
  const [attachSku, setAttachSku] = useState("");

  const reload = useCallback(async () => {
    const list = await fetchSaSupplierTemplates(catalogId);
    setRows(list);
  }, [catalogId]);

  useEffect(() => {
    setSelectedId(null);
    setCreating(false);
    setAttachProductId("");
    setAttachLinks([]);
  }, [catalogId]);

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load supplier templates.");
      }
    })();
  }, [reload]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!selected || creating) return;
    setCode(selected.code);
    setName(selected.name);
    setSupplierType(selected.supplierType || "distributor");
    setVatPin(selected.vatPin ?? "");
    setNotes(selected.notes ?? "");
  }, [selected, creating]);

  const beginCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setCode("");
    setName("");
    setSupplierType("distributor");
    setVatPin("");
    setNotes("");
  };

  const onSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (creating && !code.trim()) {
      toast.error("Code is required.");
      return;
    }
    onBusyChange(true);
    try {
      if (creating) {
        const created = await createSaSupplierTemplate(
          {
            code: code.trim(),
            name: name.trim(),
            supplierType: supplierType.trim() || "distributor",
            vatPin: vatPin.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          catalogId,
        );
        setCreating(false);
        setSelectedId(created.id);
        toast.success("Supplier template created.");
      } else if (selectedId) {
        await patchSaSupplierTemplate(
          selectedId,
          {
            name: name.trim(),
            supplierType: supplierType.trim() || "distributor",
            vatPin: vatPin.trim() || null,
            notes: notes.trim() || null,
          },
          catalogId,
        );
        toast.success("Supplier template updated.");
      }
      await reload();
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      onBusyChange(false);
    }
  };

  const loadProductLinks = async () => {
    if (!attachProductId.trim()) {
      toast.error("Enter a global product id.");
      return;
    }
    onBusyChange(true);
    try {
      const links = await fetchSaProductSupplierLinks(attachProductId.trim());
      setAttachLinks(links);
      toast.success(`Loaded ${links.length} link${links.length === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load product links.");
      setAttachLinks([]);
    } finally {
      onBusyChange(false);
    }
  };

  const attachAsPrimary = async () => {
    if (!selectedId) {
      toast.error("Select a supplier template first.");
      return;
    }
    if (!attachProductId.trim()) {
      toast.error("Enter a global product id.");
      return;
    }
    const cost = attachCost.trim() ? Number.parseFloat(attachCost) : undefined;
    if (attachCost.trim() && !Number.isFinite(cost)) {
      toast.error("Cost must be a number.");
      return;
    }
    onBusyChange(true);
    try {
      await upsertSaProductSupplierLink(attachProductId.trim(), {
        globalSupplierTemplateId: selectedId,
        primary: true,
        defaultCostPrice: cost,
        supplierSku: attachSku.trim() || null,
      });
      const links = await fetchSaProductSupplierLinks(attachProductId.trim());
      setAttachLinks(links);
      toast.success("Attached as primary supplier.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Attach failed.");
    } finally {
      onBusyChange(false);
    }
  };

  const removeLink = async (templateId: string) => {
    if (!attachProductId.trim()) return;
    onBusyChange(true);
    try {
      await deleteSaProductSupplierLink(attachProductId.trim(), templateId);
      const links = await fetchSaProductSupplierLinks(attachProductId.trim());
      setAttachLinks(links);
      toast.success("Link removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
      <section className="overflow-hidden rounded-2xl border border-border/70">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Supplier templates ({rows.length})
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={beginCreate}>
            New
          </Button>
        </div>
        <ul className="max-h-[28rem] divide-y divide-border/50 overflow-auto">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40 ${
                  selectedId === row.id && !creating ? "bg-primary/8" : ""
                }`}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(row.id);
                }}
              >
                <span className="font-medium">{row.name}</span>
                <span className="text-xs text-muted-foreground">
                  {row.code} · tenant code {row.tenantSupplierCodeHint}
                </span>
              </button>
            </li>
          ))}
          {!rows.length ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No supplier templates yet.
            </li>
          ) : null}
        </ul>
      </section>

      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-medium">
            {creating ? "Create template" : selected ? "Edit template" : "Select a template"}
          </h3>
          {(creating || selected) && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="gst-code">Code</Label>
                <Input
                  id="gst-code"
                  value={code}
                  disabled={!creating || busy}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BIDCO"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gst-name">Name</Label>
                <Input
                  id="gst-name"
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gst-type">Type</Label>
                <Input
                  id="gst-type"
                  value={supplierType}
                  disabled={busy}
                  onChange={(e) => setSupplierType(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gst-vat">VAT PIN</Label>
                <Input
                  id="gst-vat"
                  value={vatPin}
                  disabled={busy}
                  onChange={(e) => setVatPin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gst-notes">Notes</Label>
                <Input
                  id="gst-notes"
                  value={notes}
                  disabled={busy}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              {selected && !creating ? (
                <p className="text-xs text-muted-foreground">
                  Adopt creates tenant supplier{" "}
                  <span className="font-mono">{selected.tenantSupplierCodeHint}</span>
                </p>
              ) : null}
              <Button type="button" disabled={busy} onClick={() => void onSave()}>
                {creating ? "Create" : "Save"}
              </Button>
            </>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-medium">Attach to product</h3>
          <div className="space-y-1.5">
            <Label htmlFor="gst-product">Global product id</Label>
            <Input
              id="gst-product"
              value={attachProductId}
              disabled={busy}
              onChange={(e) => setAttachProductId(e.target.value)}
              placeholder="uuid"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void loadProductLinks()}
            >
              Load links
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || !selectedId}
              onClick={() => void attachAsPrimary()}
            >
              Set selected as primary
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gst-cost">Default cost</Label>
              <Input
                id="gst-cost"
                value={attachCost}
                disabled={busy}
                onChange={(e) => setAttachCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gst-sku">Supplier SKU</Label>
              <Input
                id="gst-sku"
                value={attachSku}
                disabled={busy}
                onChange={(e) => setAttachSku(e.target.value)}
              />
            </div>
          </div>
          <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
            {attachLinks.map((link) => (
              <li
                key={link.globalSupplierTemplateId}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {link.templateName ?? link.globalSupplierTemplateId}
                    {link.primary ? (
                      <span className="ml-2 text-xs text-muted-foreground">primary</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{link.templateCode}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void removeLink(link.globalSupplierTemplateId)}
                >
                  Remove
                </Button>
              </li>
            ))}
            {!attachLinks.length ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                No links loaded.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
