"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Link2, Loader2, PackagePlus, Truck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addItemSupplierLink,
  createSupplier,
  createSupplierContact,
  fetchItems,
  fetchSuppliersPage,
  type ItemSummaryRecord,
  type SupplierRecord,
} from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

type TabId = "create" | "link";

type CashierSuppliersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  canWrite: boolean;
  canLink: boolean;
  canReceive?: boolean;
  /** Open the receive-supply drawer; optional supplier preselect. */
  onReceiveSupply?: (supplier?: SupplierRecord | null) => void;
};

const fieldClass = cn(
  "w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm shadow-sm",
  "placeholder:text-muted-foreground/60",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_25%,transparent)]",
);

export function CashierSuppliersModal({
  open,
  onOpenChange,
  brandTheme,
  canWrite,
  canLink,
  canReceive = false,
  onReceiveSupply,
}: CashierSuppliersModalProps) {
  const defaultTab: TabId = canWrite ? "create" : "link";
  const [tab, setTab] = useState<TabId>(defaultTab);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierHits, setSupplierHits] = useState<SupplierRecord[]>([]);
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);

  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<ItemSummaryRecord[]>([]);
  const [productBusy, setProductBusy] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ItemSummaryRecord[]>(
    [],
  );
  const [costStr, setCostStr] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((p) => p.id)),
    [selectedProducts],
  );

  useEffect(() => {
    if (!open) return;
    setTab(canWrite ? "create" : "link");
    setName("");
    setPhone("");
    setCode("");
    setSupplierQuery("");
    setSupplierHits([]);
    setSupplier(null);
    setProductQuery("");
    setProductHits([]);
    setSelectedProducts([]);
    setCostStr("");
  }, [open, canWrite]);

  useEffect(() => {
    if (!open || tab !== "link" || supplier) {
      if (supplier) {
        setSupplierHits([]);
        setSupplierBusy(false);
      }
      return;
    }
    const q = supplierQuery.trim();
    let cancelled = false;
    const t = window.setTimeout(
      () => {
        setSupplierBusy(true);
        void fetchSuppliersPage({
          ...(q ? { search: q } : {}),
          size: 20,
          status: "active",
        })
          .then((page) => {
            if (!cancelled) setSupplierHits(page.content);
          })
          .catch(() => {
            if (!cancelled) setSupplierHits([]);
          })
          .finally(() => {
            if (!cancelled) setSupplierBusy(false);
          });
      },
      q.length > 0 ? 220 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, tab, supplierQuery, supplier]);

  useEffect(() => {
    if (!open || tab !== "link" || !supplier) {
      setProductHits([]);
      setProductBusy(false);
      return;
    }
    const q = productQuery.trim();
    if (q.length < 1) {
      setProductHits([]);
      return;
    }
    let cancelled = false;
    setProductBusy(true);
    const t = window.setTimeout(() => {
      void fetchItems(q, { size: 16, catalogScope: "ALL", softAuth: true })
        .then((rows) => {
          if (!cancelled) {
            setProductHits(rows.filter((r) => !r.groupLabelOnly));
          }
        })
        .catch(() => {
          if (!cancelled) setProductHits([]);
        })
        .finally(() => {
          if (!cancelled) setProductBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, tab, productQuery, supplier]);

  const toggleProduct = (item: ItemSummaryRecord) => {
    setSelectedProducts((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Supplier name is required");
      return;
    }
    setCreateBusy(true);
    try {
      const created = await createSupplier({
        name: trimmed,
        ...(code.trim() ? { code: code.trim() } : {}),
        status: "active",
      });
      if (phone.trim()) {
        await createSupplierContact(created.id, {
          name: trimmed,
          phone: phone.trim(),
          primaryContact: true,
        });
      }
      toast.success(`Supplier “${created.name}” created`);
      if (canReceive && onReceiveSupply) {
        onReceiveSupply(created);
        return;
      }
      if (canLink) {
        setSupplier(created);
        setTab("link");
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create supplier");
    } finally {
      setCreateBusy(false);
    }
  };

  const onLink = async () => {
    if (!supplier) {
      toast.error("Pick a supplier");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("Pick at least one product");
      return;
    }
    let cost: number | undefined;
    if (costStr.trim()) {
      const n = Number(costStr);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Cost must be a valid non-negative number");
        return;
      }
      cost = n;
    }
    setLinkBusy(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const product of selectedProducts) {
        try {
          await addItemSupplierLink(product.id, {
            supplierId: supplier.id,
            ...(cost != null ? { defaultCostPrice: cost } : {}),
            setPrimary: ok === 0,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      if (ok > 0) {
        toast.success(
          ok === 1
            ? `Linked 1 product → ${supplier.name}`
            : `Linked ${ok} products → ${supplier.name}`,
        );
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "1 product could not be linked"
            : `${failed} products could not be linked`,
        );
      }
      setSelectedProducts([]);
      setProductQuery("");
      setProductHits([]);
      setCostStr("");
    } finally {
      setLinkBusy(false);
    }
  };

  const showTabs = canWrite && canLink;
  const linkCount = selectedProducts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="max-h-[min(92dvh,42rem)] max-w-md gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Truck className="size-4 text-[var(--pos-primary)]" />
              Suppliers
            </DialogTitle>
            <DialogDescription className="text-xs">
              {canReceive
                ? "Receive stock, add a vendor, or link products — without leaving the till."
                : canWrite && canLink
                  ? "Add a vendor or link catalog products without leaving the till."
                  : canWrite
                    ? "Create a supplier from the till."
                    : "Link catalog products to a supplier from the till."}
            </DialogDescription>
          </DialogHeader>

          {canReceive && onReceiveSupply ? (
            <Button
              type="button"
              className="mt-3 w-full gap-1.5 rounded-xl"
              onClick={() => onReceiveSupply(supplier)}
            >
              <PackagePlus className="size-3.5" />
              {supplier
                ? `Receive stock · ${supplier.name}`
                : "Receive stock"}
            </Button>
          ) : null}

          {showTabs ? (
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                  tab === "create"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("create")}
              >
                New supplier
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                  tab === "link"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("link")}
              >
                Link products
              </button>
            </div>
          ) : null}
        </div>

        <div className="max-h-[min(56dvh,26rem)] space-y-3 overflow-y-auto px-4 py-4">
          {tab === "create" && canWrite ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Supplier name
                </span>
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Siena Distributors"
                  autoFocus
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Phone (optional)
                </span>
                <input
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07…"
                  inputMode="tel"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Code (optional)
                </span>
                <input
                  className={fieldClass}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Internal code"
                />
              </label>
            </>
          ) : null}

          {tab === "link" && canLink ? (
            <>
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Supplier
                </span>
                {supplier ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {supplier.name}
                      </p>
                      {supplier.code ? (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {supplier.code}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => {
                        setSupplier(null);
                        setSupplierQuery("");
                        setSelectedProducts([]);
                      }}
                      aria-label="Change supplier"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        className={fieldClass}
                        value={supplierQuery}
                        onChange={(e) => setSupplierQuery(e.target.value)}
                        placeholder="Search suppliers…"
                        autoFocus
                      />
                      {supplierBusy ? (
                        <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                    {supplierHits.length > 0 ? (
                      <ul className="max-h-40 overflow-auto rounded-xl border border-border bg-popover py-1 shadow-sm">
                        {supplierHits.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/60"
                              onClick={() => {
                                setSupplier(s);
                                setSupplierQuery("");
                                setSupplierHits([]);
                              }}
                            >
                              <span className="font-medium">{s.name}</span>
                              {s.code ? (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {s.code}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : !supplierBusy ? (
                      <p className="px-1 text-xs text-muted-foreground">
                        {supplierQuery.trim()
                          ? "No suppliers match"
                          : "No active suppliers yet"}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Products
                  </span>
                  {linkCount > 0 ? (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => setSelectedProducts([])}
                    >
                      Clear {linkCount}
                    </button>
                  ) : null}
                </div>

                {selectedProducts.length > 0 ? (
                  <ul className="flex max-h-28 flex-col gap-1 overflow-auto rounded-xl border border-border/60 bg-muted/15 p-1.5">
                    {selectedProducts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-background px-2.5 py-1.5"
                      >
                        <p className="min-w-0 truncate text-sm font-medium">
                          {cashierItemPrimaryLabel(p)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => toggleProduct(p)}
                          aria-label={`Remove ${cashierItemPrimaryLabel(p)}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="relative">
                  <input
                    className={fieldClass}
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder={
                      supplier
                        ? "Search products to add…"
                        : "Pick a supplier first"
                    }
                    disabled={!supplier}
                  />
                  {productBusy ? (
                    <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                {productHits.length > 0 ? (
                  <ul className="max-h-44 overflow-auto rounded-xl border border-border bg-popover py-1 shadow-sm">
                    {productHits.map((item) => {
                      const selected = selectedIds.has(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60",
                              selected && "bg-primary/[0.06]",
                            )}
                            onClick={() => toggleProduct(item)}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background",
                              )}
                              aria-hidden
                            >
                              {selected ? (
                                <Check className="size-2.5" strokeWidth={3} />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">
                                {cashierItemPrimaryLabel(item)}
                              </span>
                              {item.barcode || item.sku ? (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {[item.barcode, item.sku]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Default buying price (optional)
                </span>
                <input
                  className={fieldClass}
                  value={costStr}
                  onChange={(e) => setCostStr(e.target.value)}
                  placeholder="Applies to all selected"
                  inputMode="decimal"
                  disabled={linkCount === 0}
                />
              </label>
            </>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/40 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={createBusy || linkBusy}
          >
            Close
          </Button>
          {tab === "create" && canWrite ? (
            <Button
              type="button"
              className="rounded-xl gap-1.5"
              onClick={() => void onCreate()}
              disabled={createBusy || !name.trim()}
            >
              {createBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : canReceive ? (
                <PackagePlus className="size-3.5" />
              ) : (
                <Truck className="size-3.5" />
              )}
              {canReceive ? "Create & receive" : "Create supplier"}
            </Button>
          ) : null}
          {tab === "link" && canLink ? (
            <Button
              type="button"
              className="rounded-xl gap-1.5"
              onClick={() => void onLink()}
              disabled={linkBusy || !supplier || linkCount === 0}
            >
              {linkBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              {linkCount <= 1
                ? "Link product"
                : `Link ${linkCount} products`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
