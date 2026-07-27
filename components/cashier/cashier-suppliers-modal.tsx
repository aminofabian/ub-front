"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  Link2,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
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
import { getSessionTenantId } from "@/lib/auth";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import {
  attachMarketplaceSupplier,
  attachMarketplaceSupplierByNumber,
  attachMarketplaceSupplierFromSeed,
  checkSupplierDuplicates,
  type MarketplaceAttachResult,
  type SupplierDuplicateMatch,
} from "@/lib/marketplace-api";
import {
  formatReceiveTillDraftAge,
  listReceiveTillDraftSummaries,
  type ReceiveTillDraftSummary,
} from "@/lib/supply-draft-storage";
import { cn } from "@/lib/utils";

type PanelId = "find" | "create" | "link";

type CashierSuppliersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  canWrite: boolean;
  canLink: boolean;
  canReceive?: boolean;
  /** Open the receive till; optional supplier preselect. */
  onReceiveSupply?: (
    supplier?: Pick<SupplierRecord, "id" | "name" | "code"> | null,
  ) => void;
};

/** Classic sharp fields — readable on Win7 / Chrome 109 without soft radii. */
const fieldClass = cn(
  "w-full rounded-none border border-[#8a8a8a] bg-[#ffffff] px-2.5 py-2 text-sm text-[#1a1a1a]",
  "placeholder:text-[#888]",
  "shadow-[inset_1px_1px_0_#d4d4d4]",
  "focus-visible:border-[var(--pos-primary)] focus-visible:outline-none",
  "focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)]",
  "disabled:bg-[#f0f0f0] disabled:text-[#888]",
  "dark:border-border dark:bg-background dark:text-foreground dark:shadow-none",
);

const labelClass =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-[#555] dark:text-muted-foreground";

const panelBtn = cn(
  "flex flex-col items-start gap-0.5 rounded-none border px-3 py-2.5 text-left transition-colors",
  "border-[#a0a0a0] bg-[#f3f3f3] text-[#1a1a1a]",
  "hover:bg-[#e8e8e8]",
  "dark:border-border dark:bg-muted/40 dark:text-foreground dark:hover:bg-muted/60",
);

const panelBtnActive = cn(
  "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,#fff)]",
  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
  "dark:bg-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)]",
);

const classicBtn = cn(
  "rounded-none border border-[#707070] bg-[#e1e1e1] text-[#1a1a1a]",
  "shadow-[inset_0_1px_0_#fff,0_1px_0_#b0b0b0]",
  "hover:bg-[#ececec] dark:border-border dark:bg-muted dark:text-foreground dark:shadow-none",
);

const classicPrimary = cn(
  "rounded-none border border-[color-mix(in_srgb,var(--pos-primary)_55%,#333)]",
  "bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
  "hover:brightness-105",
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
  const { me, business, canConnectMarketplace } = useDashboard();
  const draftBusinessId =
    business?.id?.trim() || getSessionTenantId()?.trim() || "";
  const draftUserId = me?.id?.trim() || "";
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const defaultPanel = (): PanelId => {
    if (canReceive || canLink) return "find";
    if (canWrite) return "create";
    return "find";
  };

  const [panel, setPanel] = useState<PanelId>(defaultPanel);
  const [unfinishedTills, setUnfinishedTills] = useState<
    ReceiveTillDraftSummary[]
  >([]);

  const [lookup, setLookup] = useState("");
  const [code, setCode] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [globalMatches, setGlobalMatches] = useState<SupplierDuplicateMatch[]>(
    [],
  );
  const [globalLookupBusy, setGlobalLookupBusy] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierHits, setSupplierHits] = useState<SupplierRecord[]>([]);
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [findGlobalMatches, setFindGlobalMatches] = useState<
    SupplierDuplicateMatch[]
  >([]);

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
    setPanel(defaultPanel());
    setLookup("");
    setCode("");
    setGlobalMatches([]);
    setAttachingId(null);
    setSupplierQuery("");
    setFindGlobalMatches([]);
    setSupplierHits([]);
    setSupplier(null);
    setProductQuery("");
    setProductHits([]);
    setSelectedProducts([]);
    setCostStr("");
    if (canReceive && draftBusinessId && draftUserId) {
      setUnfinishedTills(
        listReceiveTillDraftSummaries(draftBusinessId, draftUserId),
      );
    } else {
      setUnfinishedTills([]);
    }
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when dialog opens
  }, [open, canWrite, canLink, canReceive, draftBusinessId, draftUserId]);

  useEffect(() => {
    const needSearch =
      open &&
      !supplier &&
      (panel === "find" || panel === "link");
    if (!needSearch) {
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
        const localPromise = fetchSuppliersPage({
          ...(q ? { search: q } : {}),
          size: 24,
          status: "active",
        })
          .then((page) => {
            if (!cancelled) setSupplierHits(page.content);
          })
          .catch(() => {
            if (!cancelled) setSupplierHits([]);
          });

        const looksLikeNumber = /^s-?\d{1,4}$/i.test(q) || /^\d{1,4}$/.test(q);
        const canLookupGlobal =
          canConnectMarketplace && (looksLikeNumber || q.length >= 2);
        const globalPromise = canLookupGlobal
            ? checkSupplierDuplicates({ query: q })
                .then((result) => {
                  if (!cancelled) {
                    setFindGlobalMatches(
                      (result.matches ?? []).filter(
                        (m) =>
                          m.source === "marketplace" ||
                          m.source === "platform",
                      ),
                    );
                  }
                })
                .catch(() => {
                  if (!cancelled) setFindGlobalMatches([]);
                })
            : Promise.resolve().then(() => {
                if (!cancelled) setFindGlobalMatches([]);
              });

        void Promise.all([localPromise, globalPromise]).finally(() => {
          if (!cancelled) setSupplierBusy(false);
        });
      },
      q.length > 0 ? 180 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, panel, supplierQuery, supplier, canConnectMarketplace]);

  useEffect(() => {
    if (!open || panel !== "link" || !supplier) {
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
  }, [open, panel, productQuery, supplier]);

  useEffect(() => {
    if (!open || panel !== "create") {
      setGlobalMatches([]);
      setGlobalLookupBusy(false);
      return;
    }
    const q = lookup.trim();
    if (!q) {
      setGlobalMatches([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setGlobalLookupBusy(true);
      void checkSupplierDuplicates({ query: q })
        .then((result) => {
          if (!cancelled) setGlobalMatches(result.matches ?? []);
        })
        .catch(() => {
          if (!cancelled) setGlobalMatches([]);
        })
        .finally(() => {
          if (!cancelled) setGlobalLookupBusy(false);
        });
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, panel, lookup]);

  const finishWithSupplier = (created: SupplierRecord, message: string) => {
    toast.success(message);
    if (canReceive && onReceiveSupply) {
      onReceiveSupply(created);
      return;
    }
    if (canLink) {
      setSupplier(created);
      setPanel("link");
    } else {
      onOpenChange(false);
    }
  };

  const applyAttachResult = async (result: MarketplaceAttachResult) => {
    const local = await fetchSuppliersPage({
      search: result.supplierName,
      size: 8,
      status: "active",
    })
      .then((page) =>
        page.content.find((s) => s.id === result.localSupplierId) ?? null,
      )
      .catch(() => null);

    const supplierRow: SupplierRecord =
      local ??
      ({
        id: result.localSupplierId,
        name: result.supplierName,
        code: null,
        supplierType: "distributor",
        vatPin: null,
        taxExempt: false,
        creditTermsDays: null,
        creditLimit: null,
        rating: null,
        status: "active",
        notes: null,
        paymentMethodPreferred: null,
        paymentDetails: null,
        payoutType: null,
        payoutPhone: null,
        marketplaceSupplierId: result.marketplaceSupplierId,
        supplierNumber: result.supplierNumber,
        version: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies SupplierRecord);

    const parts = [
      result.linkedExisting > 0 ? `${result.linkedExisting} linked` : null,
      result.createdItems > 0 ? `${result.createdItems} items created` : null,
    ].filter(Boolean);
    const numberNote = result.supplierNumber
      ? ` (${result.supplierNumber})`
      : "";
    finishWithSupplier(
      supplierRow,
      `Attached ${result.supplierName}${numberNote}${parts.length ? ` — ${parts.join(", ")}` : ""}`,
    );
  };

  const toggleProduct = (item: ItemSummaryRecord) => {
    setSelectedProducts((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const pickSupplier = (s: SupplierRecord) => {
    setSupplier(s);
    setSupplierQuery("");
    setSupplierHits([]);
  };

  const clearSupplier = () => {
    setSupplier(null);
    setSupplierQuery("");
    setSelectedProducts([]);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const openTill = () => {
    if (!supplier || !onReceiveSupply) return;
    onReceiveSupply(supplier);
  };

  const onCreate = async () => {
    const q = lookup.trim();
    if (!q) {
      toast.error("Enter a name, phone, or S-number");
      return;
    }
    // Pure number with no match → don't invent a supplier named "42"
    if (/^s-?\d{1,4}$/i.test(q) || (/^\d{1,4}$/.test(q) && q.length <= 4)) {
      toast.error("No supplier found for that number");
      return;
    }
    setCreateBusy(true);
    try {
      const digits = q.replace(/\D/g, "");
      const looksPhone = /^[\d\s+().-]+$/.test(q) && digits.length >= 9;
      const created = await createSupplier({
        name: looksPhone ? q : q,
        ...(code.trim() ? { code: code.trim() } : {}),
        ...(looksPhone ? { payoutPhone: q } : {}),
        status: "active",
      });
      if (looksPhone) {
        await createSupplierContact(created.id, {
          name: created.name,
          phone: q,
          primaryContact: true,
        });
      }
      const numberNote = created.supplierNumber
        ? ` · ${created.supplierNumber}`
        : "";
      finishWithSupplier(
        created,
        `Supplier “${created.name}” created${numberNote}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create supplier");
    } finally {
      setCreateBusy(false);
    }
  };

  const onUseMatch = async (match: SupplierDuplicateMatch) => {
    if (match.source === "own_business" && match.localSupplierId) {
      const localHit = {
        id: match.localSupplierId,
        name: match.name ?? "Supplier",
        code: null,
        supplierType: "distributor",
        vatPin: null,
        taxExempt: false,
        creditTermsDays: null,
        creditLimit: null,
        rating: null,
        status: "active",
        notes: null,
        paymentMethodPreferred: null,
        paymentDetails: null,
        payoutType: null,
        payoutPhone: match.phone,
        marketplaceSupplierId: match.marketplaceSupplierId,
        supplierNumber: match.supplierNumber,
        version: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies SupplierRecord;
      finishWithSupplier(localHit, `Using “${localHit.name}”`);
      return;
    }

    if (!canConnectMarketplace) {
      toast.error("You don’t have permission to attach global suppliers");
      return;
    }

    const attachKey =
      match.marketplaceSupplierId ?? match.localSupplierId ?? "seed";
    setAttachingId(attachKey);
    setCreateBusy(true);
    try {
      let result: MarketplaceAttachResult;
      if (match.marketplaceSupplierId) {
        result = await attachMarketplaceSupplier(match.marketplaceSupplierId);
      } else if (match.source === "platform" && match.localSupplierId) {
        result = await attachMarketplaceSupplierFromSeed(match.localSupplierId);
      } else if (match.supplierNumber) {
        result = await attachMarketplaceSupplierByNumber(match.supplierNumber);
      } else {
        throw new Error("Cannot attach this match");
      }
      await applyAttachResult(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not attach supplier");
    } finally {
      setAttachingId(null);
      setCreateBusy(false);
    }
  };

  const onUseGlobalSupplier = async (marketplaceSupplierId: string) => {
    await onUseMatch({
      confidence: "strong",
      source: "marketplace",
      localSupplierId: null,
      marketplaceSupplierId,
      name: null,
      phone: null,
      email: null,
      taxId: null,
      regionHint: null,
      supplierNumber: null,
    });
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

  const linkCount = selectedProducts.length;
  const title = canReceive ? "Open till" : "Suppliers";

  const supplierList = (
    <ul className="max-h-48 divide-y divide-[#c8c8c8] overflow-auto border border-[#8a8a8a] bg-[#fff] dark:divide-border dark:border-border dark:bg-popover">
      {supplierHits.map((s) => {
        const active = supplier?.id === s.id;
        return (
          <li key={s.id}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm",
                active
                  ? "bg-[color-mix(in_srgb,var(--pos-primary)_18%,#fff)] dark:bg-primary/20"
                  : "hover:bg-[#e8f0fc] dark:hover:bg-muted/50",
              )}
              onClick={() => pickSupplier(s)}
            >
              <Truck
                className="size-3.5 shrink-0 text-[var(--pos-primary)]"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name}</span>
                {s.supplierNumber || s.code ? (
                  <span className="font-mono text-[10px] text-[#666] dark:text-muted-foreground">
                    {[s.supplierNumber, s.code].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </span>
              {active ? (
                <Check className="size-3.5 shrink-0 text-[var(--pos-primary)]" />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        showCloseButton
        className={cn(
          "max-h-[min(92dvh,44rem)] max-w-lg gap-0 overflow-hidden rounded-none border-2 border-[#6d6d6d] p-0",
          "bg-[#f0f0f0] shadow-[4px_4px_0_rgba(0,0,0,0.18)]",
          "dark:border-border dark:bg-background dark:shadow-none",
          "sm:rounded-none",
        )}
        style={brandTheme}
        overlayClassName="bg-[rgba(0,0,0,0.45)] supports-[backdrop-filter]:backdrop-blur-none"
      >
        {/* Classic title bar */}
        <div
          className={cn(
            "flex items-center gap-2 border-b border-[#707070] px-3 py-2",
            "bg-[linear-gradient(180deg,#6ba3d8_0%,#3a7ab8_8%,#2b5f96_100%)]",
            "dark:border-border dark:bg-primary",
          )}
        >
          <Truck className="size-4 shrink-0 text-white" aria-hidden />
          <DialogHeader className="min-w-0 flex-1 space-y-0 p-0 text-left">
            <DialogTitle className="truncate text-sm font-semibold text-white">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Find or create a supplier, then open the receive till without
              leaving cashier.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Immediate actions — find first, new supplier always visible */}
        <div className="grid grid-cols-2 gap-px border-b border-[#a0a0a0] bg-[#a0a0a0] dark:border-border dark:bg-border">
          <button
            type="button"
            className={cn(
              panelBtn,
              "border-0 bg-[#f3f3f3] dark:bg-muted/30",
              panel === "find" && panelBtnActive,
            )}
            onClick={() => {
              setPanel("find");
              window.requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Search className="size-3.5" aria-hidden />
              Find supplier
            </span>
            <span className="text-[11px] text-[#555] dark:text-muted-foreground">
              Search who delivers today
            </span>
          </button>
          {canWrite ? (
            <button
              type="button"
              className={cn(
                panelBtn,
                "border-0 bg-[#f3f3f3] dark:bg-muted/30",
                panel === "create" && panelBtnActive,
              )}
              onClick={() => setPanel("create")}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                <UserPlus className="size-3.5" aria-hidden />
                New supplier
              </span>
              <span className="text-[11px] text-[#555] dark:text-muted-foreground">
                First time? Add them here
              </span>
            </button>
          ) : (
            <div className="flex items-center bg-[#ebebeb] px-3 text-[11px] text-[#666] dark:bg-muted/20 dark:text-muted-foreground">
              Ask an admin to enable supplier create
            </div>
          )}
        </div>

        {canLink ? (
          <div className="border-b border-[#c0c0c0] bg-[#e8e8e8] px-3 py-1.5 dark:border-border dark:bg-muted/20">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 border border-transparent px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                panel === "link"
                  ? "border-[#707070] bg-[#fff] text-[#1a1a1a] dark:border-border dark:bg-background dark:text-foreground"
                  : "text-[#555] hover:border-[#a0a0a0] hover:bg-[#f5f5f5] dark:text-muted-foreground",
              )}
              onClick={() => setPanel("link")}
            >
              <Link2 className="size-3" aria-hidden />
              Link products to a supplier
            </button>
          </div>
        ) : null}

        <div className="max-h-[min(52dvh,28rem)] space-y-3 overflow-y-auto bg-[#f7f7f7] px-3 py-3 dark:bg-background">
          {canReceive && onReceiveSupply && unfinishedTills.length > 0 ? (
            <section className="space-y-1.5">
              <p className={labelClass}>Resume unfinished</p>
              <ul className="divide-y divide-[#c8c8c8] border border-[#8a8a8a] bg-white dark:divide-border dark:border-border dark:bg-card">
                {unfinishedTills.map((draft) => (
                  <li key={draft.supplierId}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-[#e8f0fc] dark:hover:bg-muted/40"
                      onClick={() =>
                        onReceiveSupply({
                          id: draft.supplierId,
                          name: draft.supplierName,
                          code: null,
                        })
                      }
                    >
                      <PackagePlus
                        className="size-3.5 shrink-0 text-[var(--pos-primary)]"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {draft.supplierName}
                        </span>
                        <span className="block text-[11px] text-[#666] dark:text-muted-foreground">
                          {draft.lineCount} item
                          {draft.lineCount === 1 ? "" : "s"} ·{" "}
                          {formatReceiveTillDraftAge(draft.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {panel === "find" ? (
            <section className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <p className={labelClass}>Who is delivering?</p>
                {canWrite ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 border border-[#707070] bg-[#fff] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1a1a1a] hover:bg-[#eef6ff] dark:border-border dark:bg-background dark:text-foreground"
                    onClick={() => setPanel("create")}
                  >
                    <Plus className="size-3" aria-hidden />
                    New
                  </button>
                ) : null}
              </div>

              {supplier ? (
                <div className="flex items-center justify-between gap-2 border border-[#8a8a8a] bg-white px-2.5 py-2 dark:border-border dark:bg-card">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{supplier.name}</p>
                    {supplier.code ? (
                      <p className="font-mono text-[10px] text-[#666]">
                        {supplier.code}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(classicBtn, "h-8 gap-1 px-2")}
                    onClick={clearSupplier}
                  >
                    <X className="size-3.5" />
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#666]" />
                    <input
                      ref={searchInputRef}
                      className={cn(fieldClass, "pl-8")}
                      value={supplierQuery}
                      onChange={(e) => setSupplierQuery(e.target.value)}
                      placeholder="Name, phone, or S-0001…"
                      autoFocus
                    />
                    {supplierBusy ? (
                      <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[#666]" />
                    ) : null}
                  </div>
                  {supplierHits.length > 0 ? supplierList : null}

                  {findGlobalMatches.length > 0 ? (
                    <div className="border border-[#c0a060] bg-[#fffaf0] dark:border-border dark:bg-muted/30">
                      <p className="border-b border-[#c0a060] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5a4510] dark:border-border dark:text-muted-foreground">
                        Global directory
                      </p>
                      <ul className="max-h-36 divide-y divide-[#e0d0a0] overflow-auto dark:divide-border">
                        {findGlobalMatches.map((match) => (
                          <li
                            key={match.marketplaceSupplierId ?? match.name}
                            className="flex items-center justify-between gap-2 px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {match.name ?? "Supplier"}
                              </p>
                              <p className="font-mono text-[10px] text-[#666]">
                                {[match.supplierNumber, match.phone]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className={cn(
                                classicPrimary,
                                "h-8 shrink-0 px-2 text-xs",
                              )}
                              disabled={
                                createBusy ||
                                attachingId ===
                                  (match.marketplaceSupplierId ??
                                    match.localSupplierId)
                              }
                              onClick={() => void onUseMatch(match)}
                            >
                              {attachingId ===
                                (match.marketplaceSupplierId ??
                                  match.localSupplierId) ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                "Use"
                              )}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {supplierHits.length === 0 &&
                  findGlobalMatches.length === 0 &&
                  !supplierBusy ? (
                    <div className="border border-dashed border-[#a0a0a0] bg-[#fafafa] px-3 py-4 text-center dark:border-border dark:bg-muted/20">
                      <p className="text-xs text-[#555] dark:text-muted-foreground">
                        {supplierQuery.trim()
                          ? "No match — try name, phone, or S-number, or add them."
                          : "Start typing to find a supplier."}
                      </p>
                      {canWrite ? (
                        <Button
                          type="button"
                          className={cn(classicPrimary, "mt-3 h-9 gap-1.5")}
                          onClick={() => {
                            const q = supplierQuery.trim();
                            if (q) setLookup(q);
                            setPanel("create");
                          }}
                        >
                          <UserPlus className="size-3.5" aria-hidden />
                          {supplierQuery.trim()
                            ? `Add “${supplierQuery.trim()}” as new supplier`
                            : "Add new supplier"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}

              {canReceive && onReceiveSupply ? (
                <Button
                  type="button"
                  className={cn(classicPrimary, "h-11 w-full gap-2 text-sm font-bold")}
                  disabled={!supplier}
                  onClick={openTill}
                >
                  <ShoppingCart className="size-4" aria-hidden />
                  {supplier
                    ? `Open till · ${supplier.name}`
                    : "Select a supplier above, then open till"}
                </Button>
              ) : null}
            </section>
          ) : null}

          {panel === "create" && canWrite ? (
            <section className="space-y-2.5">
              <p className="border border-[#c0c0c0] bg-[#fff8dc] px-2.5 py-2 text-xs text-[#333] dark:border-border dark:bg-amber-950/30 dark:text-amber-100">
                One field: type a name, phone, or S-0001. We’ll detect which it
                is. If they already exist anywhere on the platform, use them —
                otherwise saving registers them globally
                {canReceive ? " and opens the receive till." : "."}
              </p>
              <label className="block space-y-1">
                <span className={labelClass}>Name, phone, or S-number</span>
                <input
                  className={fieldClass}
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  placeholder="e.g. Simon Mukiha · 07… · S-0001"
                  autoFocus
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Internal code (optional)</span>
                <input
                  className={fieldClass}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Your shop’s short code"
                />
              </label>

              {globalLookupBusy ? (
                <p className="flex items-center gap-1.5 text-[11px] text-[#555] dark:text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Checking directory…
                </p>
              ) : null}

              {!globalLookupBusy && globalMatches.length > 0 ? (
                <div className="border border-[#c0a060] bg-[#fffaf0] dark:border-border dark:bg-muted/30">
                  <p className="border-b border-[#c0a060] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5a4510] dark:border-border dark:text-muted-foreground">
                    {globalMatches.length} possible match
                    {globalMatches.length === 1 ? "" : "es"}
                  </p>
                  <ul className="max-h-40 divide-y divide-[#e0d0a0] overflow-auto dark:divide-border">
                    {globalMatches.map((match, index) => {
                      const key =
                        match.localSupplierId ??
                        match.marketplaceSupplierId ??
                        String(index);
                      const sourceLabel =
                        match.source === "own_business"
                          ? "Already in your directory"
                          : match.source === "platform"
                            ? "On another shop"
                            : "Global";
                      const busyKey =
                        match.marketplaceSupplierId ??
                        match.localSupplierId ??
                        null;
                      return (
                        <li
                          key={key}
                          className="flex items-start justify-between gap-2 px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#1a1a1a] dark:text-foreground">
                              {match.name ?? "Unnamed supplier"}
                            </p>
                            <p className="font-mono text-[10px] text-[#666]">
                              {[
                                match.supplierNumber,
                                match.phone,
                                sourceLabel,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className={cn(
                              classicPrimary,
                              "h-8 shrink-0 px-2 text-xs",
                            )}
                            disabled={createBusy || attachingId === busyKey}
                            onClick={() => void onUseMatch(match)}
                          >
                            {attachingId === busyKey ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              "Use"
                            )}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {!globalLookupBusy &&
              lookup.trim() &&
              globalMatches.length === 0 ? (
                <p className="text-[11px] text-[#555] dark:text-muted-foreground">
                  No match yet — saving will create them and assign an S-number
                  (e.g. S-0001).
                </p>
              ) : null}

              <button
                type="button"
                className="text-[11px] font-semibold text-[#2558a8] underline-offset-2 hover:underline dark:text-primary"
                onClick={() => {
                  setPanel("find");
                  window.requestAnimationFrame(() =>
                    searchInputRef.current?.focus(),
                  );
                }}
              >
                ← Back to find supplier
              </button>
            </section>
          ) : null}

          {panel === "link" && canLink ? (
            <section className="space-y-2.5">
              <p className={labelClass}>Supplier</p>
              {supplier ? (
                <div className="flex items-center justify-between gap-2 border border-[#8a8a8a] bg-white px-2.5 py-2 dark:border-border dark:bg-card">
                  <p className="truncate text-sm font-semibold">{supplier.name}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(classicBtn, "h-8")}
                    onClick={clearSupplier}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#666]" />
                    <input
                      ref={searchInputRef}
                      className={cn(fieldClass, "pl-8")}
                      value={supplierQuery}
                      onChange={(e) => setSupplierQuery(e.target.value)}
                      placeholder="Search suppliers…"
                      autoFocus
                    />
                    {supplierBusy ? (
                      <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[#666]" />
                    ) : null}
                  </div>
                  {supplierHits.length > 0 ? supplierList : null}
                </>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={labelClass}>Products</span>
                  {linkCount > 0 ? (
                    <button
                      type="button"
                      className="text-[10px] font-bold uppercase text-[#555] underline-offset-2 hover:underline"
                      onClick={() => setSelectedProducts([])}
                    >
                      Clear {linkCount}
                    </button>
                  ) : null}
                </div>
                {selectedProducts.length > 0 ? (
                  <ul className="max-h-28 divide-y divide-[#c8c8c8] overflow-auto border border-[#8a8a8a] bg-white dark:divide-border dark:border-border dark:bg-card">
                    {selectedProducts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5"
                      >
                        <p className="min-w-0 truncate text-sm font-medium">
                          {cashierItemPrimaryLabel(p)}
                        </p>
                        <button
                          type="button"
                          className="p-1 text-[#888] hover:text-destructive"
                          onClick={() => toggleProduct(p)}
                          aria-label={`Remove ${cashierItemPrimaryLabel(p)}`}
                        >
                          <X className="size-3.5" />
                        </button>
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
                    <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[#666]" />
                  ) : null}
                </div>
                {productHits.length > 0 ? (
                  <ul className="max-h-40 divide-y divide-[#c8c8c8] overflow-auto border border-[#8a8a8a] bg-white dark:divide-border dark:border-border dark:bg-popover">
                    {productHits.map((item) => {
                      const selected = selectedIds.has(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 px-2.5 py-2 text-left text-sm hover:bg-[#e8f0fc] dark:hover:bg-muted/50",
                              selected &&
                                "bg-[color-mix(in_srgb,var(--pos-primary)_12%,#fff)]",
                            )}
                            onClick={() => toggleProduct(item)}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                                selected
                                  ? "border-[var(--pos-primary)] bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]"
                                  : "border-[#8a8a8a] bg-white",
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
                                <span className="font-mono text-[10px] text-[#666]">
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

              <label className="block space-y-1">
                <span className={labelClass}>Default buying price (optional)</span>
                <input
                  className={fieldClass}
                  value={costStr}
                  onChange={(e) => setCostStr(e.target.value)}
                  placeholder="Applies to all selected"
                  inputMode="decimal"
                  disabled={linkCount === 0}
                />
              </label>
            </section>
          ) : null}
        </div>

        <DialogFooter
          className={cn(
            "flex-row justify-end gap-2 border-t border-[#a0a0a0] bg-[#e8e8e8] px-3 py-2.5",
            "dark:border-border dark:bg-muted/30",
          )}
        >
          <Button
            type="button"
            variant="outline"
            className={cn(classicBtn, "h-9")}
            onClick={() => onOpenChange(false)}
            disabled={createBusy || linkBusy}
          >
            Close
          </Button>
          {panel === "create" && canWrite ? (
            <Button
              type="button"
              className={cn(classicPrimary, "h-9 gap-1.5")}
              onClick={() => void onCreate()}
              disabled={createBusy || !lookup.trim()}
            >
              {createBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              {canReceive ? "Save & open till" : "Save supplier"}
            </Button>
          ) : null}
          {panel === "link" && canLink ? (
            <Button
              type="button"
              className={cn(classicPrimary, "h-9 gap-1.5")}
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
          {panel === "find" && canReceive && onReceiveSupply && supplier ? (
            <Button
              type="button"
              className={cn(classicPrimary, "h-9 gap-1.5")}
              onClick={openTill}
            >
              <ShoppingCart className="size-3.5" />
              Open till
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
