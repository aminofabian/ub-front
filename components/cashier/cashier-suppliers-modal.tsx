"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Link2, Loader2, Truck, X } from "lucide-react";
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
  const [product, setProduct] = useState<ItemSummaryRecord | null>(null);
  const [costStr, setCostStr] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

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
    setProduct(null);
    setCostStr("");
  }, [open, canWrite]);

  useEffect(() => {
    if (!open || tab !== "link" || supplier) {
      setSupplierHits([]);
      setSupplierBusy(false);
      return;
    }
    const q = supplierQuery.trim();
    if (q.length < 1) {
      setSupplierHits([]);
      return;
    }
    let cancelled = false;
    setSupplierBusy(true);
    const t = window.setTimeout(() => {
      void fetchSuppliersPage({ search: q, size: 8, status: "active" })
        .then((page) => {
          if (!cancelled) setSupplierHits(page.content);
        })
        .catch(() => {
          if (!cancelled) setSupplierHits([]);
        })
        .finally(() => {
          if (!cancelled) setSupplierBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, tab, supplierQuery, supplier]);

  useEffect(() => {
    if (!open || tab !== "link" || product) {
      setProductHits([]);
      setProductBusy(false);
      return;
    }
    const q = productQuery.trim();
    if (q.length < 2) {
      setProductHits([]);
      return;
    }
    let cancelled = false;
    setProductBusy(true);
    const t = window.setTimeout(() => {
      void fetchItems(q, { size: 8, catalogScope: "ALL" })
        .then((rows) => {
          if (!cancelled) setProductHits(rows);
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
  }, [open, tab, productQuery, product]);

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
    if (!product) {
      toast.error("Pick a product");
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
    try {
      await addItemSupplierLink(product.id, {
        supplierId: supplier.id,
        ...(cost != null ? { defaultCostPrice: cost } : {}),
        setPrimary: true,
      });
      toast.success(
        `Linked ${cashierItemPrimaryLabel(product)} → ${supplier.name}`,
      );
      setProduct(null);
      setProductQuery("");
      setCostStr("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link product");
    } finally {
      setLinkBusy(false);
    }
  };

  const showTabs = canWrite && canLink;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="max-h-[min(92dvh,40rem)] max-w-md gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Truck className="size-4 text-[var(--pos-primary)]" />
              Suppliers
            </DialogTitle>
            <DialogDescription className="text-xs">
              {canWrite && canLink
                ? "Add a vendor or link a catalog product without leaving the till."
                : canWrite
                  ? "Create a private supplier from the till."
                  : "Link a catalog product to a supplier from the till."}
            </DialogDescription>
          </DialogHeader>
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
                Link product
              </button>
            </div>
          ) : null}
        </div>

        <div className="max-h-[min(60dvh,28rem)] space-y-3 overflow-y-auto px-4 py-4">
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
                      }}
                      aria-label="Change supplier"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
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
                    {supplierHits.length > 0 ? (
                      <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-xl border border-border bg-popover py-1 shadow-lg">
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
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Product
                </span>
                {product ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {cashierItemPrimaryLabel(product)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => {
                        setProduct(null);
                        setProductQuery("");
                      }}
                      aria-label="Change product"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className={fieldClass}
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Search product name or barcode…"
                      disabled={!supplier}
                    />
                    {productBusy ? (
                      <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}
                    {productHits.length > 0 ? (
                      <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-xl border border-border bg-popover py-1 shadow-lg">
                        {productHits.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/60"
                              onClick={() => {
                                setProduct(item);
                                setProductQuery("");
                                setProductHits([]);
                              }}
                            >
                              <span className="font-medium">
                                {cashierItemPrimaryLabel(item)}
                              </span>
                              {item.barcode || item.sku ? (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {[item.barcode, item.sku]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Buying price (optional)
                </span>
                <input
                  className={fieldClass}
                  value={costStr}
                  onChange={(e) => setCostStr(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  disabled={!product}
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
              ) : (
                <Truck className="size-3.5" />
              )}
              Create supplier
            </Button>
          ) : null}
          {tab === "link" && canLink ? (
            <Button
              type="button"
              className="rounded-xl gap-1.5"
              onClick={() => void onLink()}
              disabled={linkBusy || !supplier || !product}
            >
              {linkBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              Link product
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
