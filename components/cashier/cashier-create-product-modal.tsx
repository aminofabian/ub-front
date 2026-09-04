"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { Check, ImagePlus, Layers, PackagePlus, Plus, Trash2, X } from "lucide-react";
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
  fetchItemById,
  fetchItems,
  createPosQuickItem,
  uploadItemImageFile,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import {
  clearCashierCreateProductDraft,
  dataUrlToFile,
  fileToDataUrl,
  loadCashierCreateProductDraft,
  saveCashierCreateProductDraft,
} from "@/lib/cashier-create-product-draft";
import { cn } from "@/lib/utils";
import styles from "./cashier-create-product-modal.module.css";

type CreateMode = "single" | "group";

type VariantRow = {
  key: string;
  label: string;
  barcode: string;
  buyingPrice: string;
  unitPrice: string;
  stock: string;
  /** Optional photo preview / draft payload. */
  imageDataUrl: string | null;
};

type CashierCreateProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
  branchId: string;
  itemTypes: ItemTypeRecord[];
  preferredItemTypeId?: string | null;
  onCreated: (item: ItemSummaryRecord, unitPrice: string) => void;
  /** Defaults to cart copy. Use receive for supply/receive-stock flows. */
  purpose?: "cart" | "receive";
};

function relatedLinkHint(related: ItemSummaryRecord): string {
  if (related.variantOfItemId?.trim()) {
    return `Sibling of “${cashierItemPrimaryLabel(related)}”. Same parent product.`;
  }
  return `Child of “${cashierItemPrimaryLabel(related)}”.`;
}

function newVariantRow(seed?: Partial<VariantRow>): VariantRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    barcode: "",
    buyingPrice: "",
    unitPrice: "",
    stock: "1",
    imageDataUrl: null,
    ...seed,
  };
}

function parsePosMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNegMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parsePosQty(raw: string, allowZero = false): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (allowZero) return n >= 0 ? n : null;
  return n > 0 ? n : null;
}

export function CashierCreateProductModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
  branchId,
  itemTypes,
  preferredItemTypeId,
  onCreated,
  purpose = "cart",
}: CashierCreateProductModalProps) {
  const modeId = useId();
  const pendingOptionFocus = useRef<string | null>(null);
  const skipEnter = useRef<Set<string>>(new Set());
  const prevReady = useRef(0);
  const prevArmed = useRef(false);
  const [inviteOn, setInviteOn] = useState(false);
  const [stamp, setStamp] = useState(0);
  const [mode, setMode] = useState<CreateMode>("single");
  const forReceive = purpose === "receive";

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [initialStockQty, setInitialStockQty] = useState("1");
  const [itemTypeId, setItemTypeId] = useState("");
  const [linkAsVariant, setLinkAsVariant] = useState(false);
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedHits, setRelatedHits] = useState<ItemSummaryRecord[]>([]);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [relatedItem, setRelatedItem] = useState<ItemSummaryRecord | null>(
    null,
  );
  const [variantName, setVariantName] = useState("");
  const [groupVariants, setGroupVariants] = useState<VariantRow[]>(() => [
    newVariantRow(),
    newVariantRow(),
  ]);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [photoOver, setPhotoOver] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const optionFileRef = useRef<HTMLInputElement>(null);
  const pendingOptionPhotoKey = useRef<string | null>(null);
  const draftHydrated = useRef(false);
  const suppressDraftSave = useRef(false);
  const draftSnapshotRef = useRef({
    branchId,
    purpose,
    mode,
    name,
    barcode,
    buyingPrice,
    unitPrice,
    initialStockQty,
    itemTypeId,
    linkAsVariant,
    variantName,
    relatedItem,
    groupVariants,
    imageDataUrl,
  });
  draftSnapshotRef.current = {
    branchId,
    purpose,
    mode,
    name,
    barcode,
    buyingPrice,
    unitPrice,
    initialStockQty,
    itemTypeId,
    linkAsVariant,
    variantName,
    relatedItem,
    groupVariants,
    imageDataUrl,
  };

  const flushDraft = () => {
    if (suppressDraftSave.current) return;
    const s = draftSnapshotRef.current;
    saveCashierCreateProductDraft({
      branchId: s.branchId,
      purpose: s.purpose,
      mode: s.mode,
      name: s.name,
      barcode: s.barcode,
      buyingPrice: s.buyingPrice,
      unitPrice: s.unitPrice,
      initialStockQty: s.initialStockQty,
      itemTypeId: s.itemTypeId,
      linkAsVariant: s.linkAsVariant,
      variantName: s.variantName,
      relatedItem: s.relatedItem,
      groupVariants: s.groupVariants.map((r) => ({
        key: r.key,
        label: r.label,
        barcode: r.barcode,
        buyingPrice: r.buyingPrice,
        unitPrice: r.unitPrice,
        stock: r.stock,
        imageDataUrl: r.imageDataUrl,
      })),
      imageDataUrl: s.imageDataUrl,
    });
  };

  const defaultItemTypeId = () => {
    const preferred = preferredItemTypeId?.trim();
    if (preferred && itemTypes.some((t) => t.id === preferred)) return preferred;
    return itemTypes.find((t) => t.isDefault)?.id || itemTypes[0]?.id || "";
  };

  const resetBlankForm = () => {
    setMode("single");
    setName("");
    setBarcode("");
    setBuyingPrice("");
    setUnitPrice("");
    setInitialStockQty(purpose === "receive" ? "0" : "1");
    setLinkAsVariant(false);
    setRelatedQuery("");
    setRelatedHits([]);
    setRelatedItem(null);
    setVariantName("");
    const stockSeed = purpose === "receive" ? "0" : "1";
    const first = newVariantRow({ stock: stockSeed });
    const second = newVariantRow({ stock: stockSeed });
    skipEnter.current = new Set([first.key, second.key]);
    setGroupVariants([first, second]);
    setImageFile(null);
    setImageDataUrl(null);
    setPhotoOver(false);
    prevReady.current = 0;
    prevArmed.current = false;
    setInviteOn(false);
    setStamp(0);
    setItemTypeId(defaultItemTypeId());
  };

  useEffect(() => {
    if (!open) {
      if (draftReady) flushDraft();
      draftHydrated.current = false;
      setDraftReady(false);
      return;
    }
    if (draftHydrated.current) return;
    draftHydrated.current = true;
    suppressDraftSave.current = false;

    const draft = loadCashierCreateProductDraft(branchId, purpose);
    if (draft) {
      setMode(draft.mode === "group" ? "group" : "single");
      setName(draft.name ?? "");
      setBarcode(draft.barcode ?? "");
      setBuyingPrice(draft.buyingPrice ?? "");
      setUnitPrice(draft.unitPrice ?? "");
      setInitialStockQty(
        draft.initialStockQty?.trim()
          ? draft.initialStockQty
          : purpose === "receive"
            ? "0"
            : "1",
      );
      setLinkAsVariant(Boolean(draft.linkAsVariant));
      setRelatedQuery("");
      setRelatedHits([]);
      setRelatedItem(draft.relatedItem ?? null);
      setVariantName(draft.variantName ?? "");
      const rows =
        Array.isArray(draft.groupVariants) && draft.groupVariants.length > 0
          ? draft.groupVariants.map((r) =>
              newVariantRow({
                key: r.key || undefined,
                label: r.label ?? "",
                barcode: r.barcode ?? "",
                buyingPrice: r.buyingPrice ?? "",
                unitPrice: r.unitPrice ?? "",
                stock:
                  r.stock?.trim() ||
                  (purpose === "receive" ? "0" : "1"),
                imageDataUrl: r.imageDataUrl?.trim() || null,
              }),
            )
          : [
              newVariantRow({ stock: purpose === "receive" ? "0" : "1" }),
              newVariantRow({ stock: purpose === "receive" ? "0" : "1" }),
            ];
      skipEnter.current = new Set(rows.map((r) => r.key));
      setGroupVariants(rows);
      const typeOk =
        draft.itemTypeId && itemTypes.some((t) => t.id === draft.itemTypeId)
          ? draft.itemTypeId
          : defaultItemTypeId();
      setItemTypeId(typeOk);
      if (draft.imageDataUrl) {
        const restored = dataUrlToFile(draft.imageDataUrl);
        if (restored) {
          setImageDataUrl(draft.imageDataUrl);
          setImageFile(restored);
        } else {
          setImageDataUrl(null);
          setImageFile(null);
        }
      } else {
        setImageDataUrl(null);
        setImageFile(null);
      }
      prevReady.current = 0;
      prevArmed.current = false;
      setInviteOn(false);
      setStamp(0);
    } else {
      resetBlankForm();
    }
    setDraftReady(true);
    // Hydrate once per open; preferred type / itemTypes apply as fallbacks above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot hydrate
  }, [open, branchId, purpose]);

  useEffect(() => {
    if (!open || !draftReady || itemTypeId.trim()) return;
    const fallback = defaultItemTypeId();
    if (fallback) setItemTypeId(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fill empty department when types load
  }, [open, draftReady, itemTypes, preferredItemTypeId, itemTypeId]);

  useEffect(() => {
    if (!open || !draftReady) return;
    const t = window.setTimeout(() => flushDraft(), 280);
    return () => window.clearTimeout(t);
  }, [
    open,
    draftReady,
    branchId,
    purpose,
    mode,
    name,
    barcode,
    buyingPrice,
    unitPrice,
    initialStockQty,
    itemTypeId,
    linkAsVariant,
    variantName,
    relatedItem,
    groupVariants,
    imageDataUrl,
  ]);

  useEffect(() => {
    if (!open || !draftReady) return;
    const onHide = () => flushDraft();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [open, draftReady]);

  const applyImageFile = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImageDataUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    setImageFile(file);
    void fileToDataUrl(file)
      .then((url) => setImageDataUrl(url))
      .catch(() => {
        setImageDataUrl(null);
        toast.error("Could not read that photo");
      });
  };

  const applyOptionImageFile = (rowKey: string, file: File | null) => {
    if (!file) {
      setGroupVariants((prev) =>
        prev.map((row) =>
          row.key === rowKey ? { ...row, imageDataUrl: null } : row,
        ),
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    void fileToDataUrl(file)
      .then((url) => {
        setGroupVariants((prev) =>
          prev.map((row) =>
            row.key === rowKey ? { ...row, imageDataUrl: url } : row,
          ),
        );
      })
      .catch(() => toast.error("Could not read that photo"));
  };

  const openOptionPhotoPicker = (rowKey: string) => {
    pendingOptionPhotoKey.current = rowKey;
    optionFileRef.current?.click();
  };

  const handlePhotoDrop = (e: DragEvent) => {
    e.preventDefault();
    setPhotoOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) applyImageFile(file);
  };

  const uploadGroupPhotos = async (
    firstVariantId: string,
    optionRows: { label: string; imageDataUrl: string | null }[],
    familyFile: File | null,
  ) => {
    let fail = 0;
    try {
      const first = await fetchItemById(firstVariantId, { toast: false });
      const parentId = first.variantOfItemId?.trim();
      if (familyFile) {
        const targetId = parentId || firstVariantId;
        try {
          await uploadItemImageFile(targetId, familyFile, { primary: true });
        } catch {
          fail += 1;
        }
      }
      const withPhotos = optionRows.filter((r) => r.imageDataUrl?.trim());
      if (withPhotos.length === 0) {
        if (fail > 0) toast.error("Group created, but a photo did not upload");
        return;
      }
      let variants: ItemSummaryRecord[] = [];
      if (parentId) {
        const parent = await fetchItemById(parentId, { toast: false });
        variants = parent.variants ?? [];
      } else {
        variants = [first];
      }
      for (const row of withPhotos) {
        const needle = row.label.trim().toLowerCase();
        const match =
          variants.find(
            (v) => (v.variantName ?? "").trim().toLowerCase() === needle,
          ) ??
          variants.find((v) =>
            (v.name ?? "").toLowerCase().includes(needle),
          );
        const file = dataUrlToFile(
          row.imageDataUrl!,
          `${row.label.trim() || "option"}.jpg`,
        );
        if (!match || !file) {
          fail += 1;
          continue;
        }
        try {
          await uploadItemImageFile(match.id, file, { primary: true });
        } catch {
          fail += 1;
        }
      }
      if (fail > 0) {
        toast.error(
          fail === 1
            ? "Group created, but 1 photo did not upload"
            : `Group created, but ${fail} photos did not upload`,
        );
      }
    } catch {
      toast.error("Group created, but photos could not be attached");
    }
  };

  useEffect(() => {
    if (!open || mode !== "single" || !linkAsVariant || relatedItem) {
      setRelatedHits([]);
      setRelatedBusy(false);
      return;
    }
    const q = relatedQuery.trim();
    if (q.length < 2) {
      setRelatedHits([]);
      setRelatedBusy(false);
      return;
    }
    let cancelled = false;
    setRelatedBusy(true);
    const t = window.setTimeout(() => {
      void fetchItems(q, { size: 8, catalogScope: "ALL", softAuth: true })
        .then((rows) => {
          if (!cancelled) setRelatedHits(rows);
        })
        .catch(() => {
          if (!cancelled) setRelatedHits([]);
        })
        .finally(() => {
          if (!cancelled) setRelatedBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, mode, linkAsVariant, relatedQuery, relatedItem]);

  useEffect(() => {
    const key = pendingOptionFocus.current;
    if (!key) return;
    pendingOptionFocus.current = null;
    document.getElementById(`${modeId}-opt-${key}`)?.focus();
  }, [groupVariants, modeId]);

  const priceNum = Number(unitPrice);
  const buyingNum = buyingPrice.trim() === "" ? null : Number(buyingPrice);
  const stockNum = Number(initialStockQty);
  const buyingOk =
    buyingNum == null || (Number.isFinite(buyingNum) && buyingNum >= 0);
  const stockOk = Number.isFinite(stockNum) && (forReceive ? stockNum >= 0 : stockNum > 0);
  const variantLinkOk = !linkAsVariant || relatedItem != null;

  const readyGroupVariants = groupVariants
    .map((row) => {
      const label = row.label.trim();
      const sell = parsePosMoney(row.unitPrice);
      const buy = parseNonNegMoney(row.buyingPrice);
      const stock = parsePosQty(row.stock, forReceive);
      if (!label || sell == null || stock == null) return null;
      if (row.buyingPrice.trim() && buy == null) return null;
      return {
        key: row.key,
        label,
        barcode: row.barcode.trim(),
        unitPrice: sell,
        buyingPrice: buy,
        stock,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const canSubmitSingle =
    mode === "single" &&
    name.trim().length > 0 &&
    itemTypeId.trim().length > 0 &&
    branchId.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    buyingOk &&
    stockOk &&
    variantLinkOk;

  const canSubmitGroup =
    mode === "group" &&
    name.trim().length > 0 &&
    itemTypeId.trim().length > 0 &&
    branchId.trim().length > 0 &&
    readyGroupVariants.length >= 1 &&
    readyGroupVariants.length ===
      groupVariants.filter((r) => r.label.trim() || r.unitPrice.trim()).length;

  const canSubmit = canSubmitSingle || canSubmitGroup;

  useEffect(() => {
    const n = readyGroupVariants.length;
    if (n > prevReady.current) setInviteOn(true);
    prevReady.current = n;
  }, [readyGroupVariants.length]);

  useEffect(() => {
    if (canSubmit && !prevArmed.current) setStamp((s) => s + 1);
    prevArmed.current = canSubmit;
  }, [canSubmit]);

  const patchVariant = (key: string, patch: Partial<VariantRow>) => {
    setGroupVariants((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (mode === "group") {
        const created = await createPosQuickItem({
          name: name.trim(),
          itemTypeId: itemTypeId.trim(),
          branchId: branchId.trim() || undefined,
          unitType: "each",
          createAsGroup: true,
          variants: readyGroupVariants.map((v) => ({
            variantName: v.label,
            barcode: v.barcode || undefined,
            unitPrice: v.unitPrice,
            buyingPrice: v.buyingPrice ?? undefined,
            initialStockQty: v.stock,
          })),
        });
        if (imageFile || readyGroupVariants.some((v) => {
          const row = groupVariants.find((g) => g.key === v.key);
          return Boolean(row?.imageDataUrl);
        })) {
          await uploadGroupPhotos(
            created.id,
            readyGroupVariants.map((v) => {
              const row = groupVariants.find((g) => g.key === v.key);
              return {
                label: v.label,
                imageDataUrl: row?.imageDataUrl ?? null,
              };
            }),
            imageFile,
          );
        }
        const first = readyGroupVariants[0];
        const priceStr = first.unitPrice.toFixed(2);
        onCreated(
          {
            id: created.id,
            name: created.name,
            sku: created.sku ?? "",
            barcode: first.barcode || undefined,
            stockQty: first.stock,
            variantName: first.label,
            variantOfItemId: undefined,
          },
          priceStr,
        );
        toast.success(
          readyGroupVariants.length === 1
            ? "Group created with 1 option"
            : `Group created with ${readyGroupVariants.length} options`,
        );
        clearCashierCreateProductDraft(branchId, purpose);
        suppressDraftSave.current = true;
        draftHydrated.current = false;
        setDraftReady(false);
        onOpenChange(false);
        return;
      }

      const created = await createPosQuickItem({
        name: name.trim(),
        itemTypeId: itemTypeId.trim(),
        barcode: barcode.trim() || undefined,
        branchId: branchId.trim() || undefined,
        unitPrice: priceNum,
        buyingPrice: buyingNum ?? undefined,
        initialStockQty: stockNum,
        unitType: "each",
        relatedItemId: linkAsVariant ? relatedItem?.id : undefined,
        variantName:
          linkAsVariant && variantName.trim()
            ? variantName.trim()
            : undefined,
      });
      if (imageFile) {
        try {
          await uploadItemImageFile(created.id, imageFile, { primary: true });
        } catch {
          toast.error("Product created, but the photo did not upload");
        }
      }
      const priceStr = priceNum.toFixed(2);
      onCreated(
        {
          id: created.id,
          name: created.name,
          sku: created.sku ?? "",
          barcode: barcode.trim() || undefined,
          stockQty: stockNum,
          variantName: linkAsVariant
            ? variantName.trim() || name.trim()
            : undefined,
          variantOfItemId: linkAsVariant
            ? relatedItem?.variantOfItemId?.trim() || relatedItem?.id
            : undefined,
        },
        priceStr,
      );
      toast.success(linkAsVariant ? "Variant created" : "Product created");
      clearCashierCreateProductDraft(branchId, purpose);
      suppressDraftSave.current = true;
      draftHydrated.current = false;
      setDraftReady(false);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create product";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const labelClass = "block text-[12px] font-medium text-zinc-600";
  const fieldClass = cn(
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm",
    "focus:outline-none focus-visible:border-[var(--pos-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
  );
  const cellClass = cn(
    "h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm",
    "focus:outline-none focus-visible:border-[var(--pos-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
  );
  const currencySuffix = currency ? ` (${currency})` : "";

  const addOptionRow = () => {
    if (busy || groupVariants.length >= 24) return;
    const row = newVariantRow({ stock: forReceive ? "0" : "1" });
    pendingOptionFocus.current = row.key;
    setGroupVariants((prev) => [...prev, row]);
  };

  const removeOption = (key: string) => {
    if (busy || groupVariants.length <= 1) return;
    const go = () =>
      setGroupVariants((prev) =>
        prev.length <= 1 ? prev : prev.filter((r) => r.key !== key),
      );
    const el = document.getElementById(`${modeId}-row-${key}`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce) {
      go();
      return;
    }
    const anim = el.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(12px)" },
      ],
      {
        duration: 160,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "forwards",
      },
    );
    void anim.finished.then(go).catch(go);
  };

  const submitOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canSubmit && !busy) {
      e.preventDefault();
      void onSubmit();
    }
  };

  const handleOptionEnter = (index: number, row: VariantRow) => {
    const isLast = index === groupVariants.length - 1;
    const started = Boolean(row.label.trim() || row.unitPrice.trim());
    if (isLast && started) {
      addOptionRow();
      return;
    }
    if (isLast && canSubmit && !busy) {
      void onSubmit();
      return;
    }
    if (!isLast) {
      const next = groupVariants[index + 1];
      document.getElementById(`${modeId}-opt-${next.key}`)?.focus();
    }
  };

  const startedGroupCount = groupVariants.filter(
    (r) => r.label.trim() || r.unitPrice.trim(),
  ).length;
  const incompleteGroupCount = startedGroupCount - readyGroupVariants.length;
  const groupStatus =
    startedGroupCount === 0
      ? "Each option needs a name and sell price"
      : incompleteGroupCount > 0
        ? `${incompleteGroupCount} still need a name and sell price`
        : readyGroupVariants.length === 1
          ? "1 ready to create"
          : `${readyGroupVariants.length} ready to create`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        overlayClassName="bg-black/40 supports-[backdrop-filter]:backdrop-blur-[2px]"
        className={cn(
          styles.root,
          "gap-0 overflow-hidden p-0 sm:rounded-l-2xl",
          "w-[min(100%,40rem)] max-w-[40rem]",
        )}
        style={brandTheme}
      >
        <div className={styles.header}>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className={styles.iconMark}>
                <PackagePlus className="size-3.5" />
              </span>
              Add product
            </DialogTitle>
            <DialogDescription className="text-[13px] text-zinc-600">
              {mode === "group"
                ? forReceive
                  ? "Name the family, then each size or flavour. Stock can stay 0 until you receive."
                  : "Name the family, then each size or flavour you sell."
                : forReceive
                  ? "Creates a catalog item you can receive on the supply grid."
                  : "Creates the item and adds it to this sale."}
            </DialogDescription>
          </DialogHeader>

          <div
            className={styles.modeTrack}
            data-mode={mode}
            role="tablist"
            aria-label="Product shape"
          >
            <div className={styles.modeThumb} aria-hidden />
            <button
              type="button"
              role="tab"
              id={`${modeId}-single`}
              aria-selected={mode === "single"}
              disabled={busy}
              className={styles.modeBtn}
              onClick={() => {
                setMode("single");
              }}
            >
              <PackagePlus className="size-3.5" />
              Single item
            </button>
            <button
              type="button"
              role="tab"
              id={`${modeId}-group`}
              aria-selected={mode === "group"}
              disabled={busy}
              className={styles.modeBtn}
              onClick={() => {
                setMode("group");
                setLinkAsVariant(false);
                setRelatedItem(null);
              }}
            >
              <Layers className="size-3.5" />
              Group + options
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.identity}>
            <label className="block min-w-0 space-y-1.5">
              <span className={labelClass}>
                {mode === "group" ? "Group name" : "Name"}
              </span>
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  mode === "group"
                    ? "e.g. Fresh milk, Phone cases"
                    : "Product name"
                }
                autoFocus
              />
            </label>
            <div className="space-y-1.5">
              <span className={labelClass}>Photo</span>
              <div
                onDrop={handlePhotoDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setPhotoOver(true);
                }}
                onDragLeave={() => setPhotoOver(false)}
                className={styles.photo}
                data-filled={imageDataUrl ? "" : undefined}
                data-over={photoOver ? "" : undefined}
              >
                {imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local draft preview
                  <img
                    src={imageDataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={styles.photoBtn}
                    aria-label="Add a photo"
                    disabled={busy}
                  >
                    <ImagePlus className="size-5" aria-hidden />
                    <span>Add</span>
                  </button>
                )}
                {imageDataUrl ? (
                  <div className={styles.photoBar}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => applyImageFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) applyImageFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className={labelClass}>Department</span>
            <select
              className={fieldClass}
              value={itemTypeId}
              onChange={(e) => setItemTypeId(e.target.value)}
              disabled={
                itemTypes.length === 0 ||
                (mode === "single" && linkAsVariant && relatedItem != null)
              }
            >
              {itemTypes.length === 0 ? (
                <option value="">No departments</option>
              ) : (
                itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))
              )}
            </select>
            {mode === "single" && linkAsVariant && relatedItem != null ? (
              <span className="text-[11px] text-zinc-500">
                Department is inherited from the parent product.
              </span>
            ) : mode === "group" ? (
              <span className="text-[11px] text-zinc-500">
                Options inherit this department.
              </span>
            ) : null}
          </label>

          {mode === "single" ? (
            <div className={cn("flex flex-col gap-3", styles.enter)}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className={labelClass}>
                    Sell price{currencySuffix}
                  </span>
                  <input
                    className={cn(
                      fieldClass,
                      "text-right font-semibold tabular-nums",
                    )}
                    inputMode="decimal"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    onKeyDown={submitOnEnter}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelClass}>Stock</span>
                  <input
                    className={cn(fieldClass, "text-right tabular-nums")}
                    inputMode="decimal"
                    value={initialStockQty}
                    onChange={(e) => setInitialStockQty(e.target.value)}
                    placeholder={forReceive ? "0" : "1"}
                    onKeyDown={submitOnEnter}
                  />
                  <span className="text-[11px] text-zinc-500">
                    {forReceive
                      ? "Can stay 0. You'll receive qty on the supply grid."
                      : "Stocked at this till so it can sell right away."}
                  </span>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className={labelClass}>Barcode (optional)</span>
                <input
                  className={fieldClass}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type"
                  onKeyDown={submitOnEnter}
                />
              </label>

              <label className="block space-y-1.5">
                <span className={labelClass}>
                  Buy price{currencySuffix}
                </span>
                <input
                  className={cn(fieldClass, "text-right tabular-nums")}
                  inputMode="decimal"
                  value={buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  placeholder="0.00"
                  onKeyDown={submitOnEnter}
                />
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--pos-primary)]"
                  checked={linkAsVariant}
                  disabled={busy}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setLinkAsVariant(on);
                    if (!on) {
                      setRelatedItem(null);
                      setRelatedQuery("");
                      setRelatedHits([]);
                      setVariantName("");
                    }
                  }}
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-zinc-900">
                    Add as a variant
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    Link under an existing product or sibling option.
                  </span>
                </span>
              </label>

              {linkAsVariant ? (
                <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-3">
                  {relatedItem ? (
                    <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {cashierItemPrimaryLabel(relatedItem)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {relatedLinkHint(relatedItem)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                        aria-label="Clear related product"
                        onClick={() => {
                          setRelatedItem(null);
                          setRelatedQuery("");
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="block space-y-1.5">
                      <span className={labelClass}>Find parent or sibling</span>
                      <input
                        className={fieldClass}
                        value={relatedQuery}
                        onChange={(e) => setRelatedQuery(e.target.value)}
                        placeholder="Search name, SKU, or barcode"
                      />
                      {relatedBusy ? (
                        <p className="text-[11px] text-zinc-500">Searching…</p>
                      ) : null}
                      {relatedHits.length > 0 ? (
                        <ul className="max-h-36 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
                          {relatedHits.map((hit) => (
                            <li key={hit.id}>
                              <button
                                type="button"
                                className="flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left hover:bg-zinc-50"
                                onClick={() => {
                                  setRelatedItem(hit);
                                  setRelatedQuery("");
                                  setRelatedHits([]);
                                  if (!variantName.trim() && hit.size?.trim()) {
                                    setVariantName(hit.size.trim());
                                  }
                                }}
                              >
                                <span className="text-sm font-medium text-zinc-900">
                                  {cashierItemPrimaryLabel(hit)}
                                </span>
                                <span className="text-[11px] text-zinc-500">
                                  {hit.variantOfItemId?.trim()
                                    ? "Sibling variant"
                                    : hit.groupLabelOnly
                                      ? "Parent group"
                                      : "Parent / product"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : relatedQuery.trim().length >= 2 && !relatedBusy ? (
                        <p className="text-[11px] text-zinc-500">No matches.</p>
                      ) : null}
                    </label>
                  )}

                  <label className="block space-y-1.5">
                    <span className={labelClass}>Variant label</span>
                    <input
                      className={fieldClass}
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="e.g. 500ml, Tray, Large"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <section className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <p className="text-[13px] font-medium text-zinc-800">
                  Options{currency ? ` · ${currency}` : ""}
                </p>
                <span
                  key={readyGroupVariants.length}
                  className={cn(
                    styles.tick,
                    readyGroupVariants.length > 0 && styles.tickHot,
                  )}
                >
                  {groupStatus}
                </span>
              </div>

              <div className={styles.pad}>
                <div className={styles.head}>
                  <span className={styles.headNum}>#</span>
                  <span className={styles.headPhoto}>Photo</span>
                  <span className={styles.headOpt}>Option</span>
                  <span className={styles.headSell}>Sell</span>
                  <span className={styles.headStock}>Stock</span>
                  <span className={styles.headCost}>Cost</span>
                  <span className={styles.headCode}>Barcode</span>
                  <span className={styles.headRemove} />
                </div>
                <input
                  ref={optionFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const key = pendingOptionPhotoKey.current;
                    const file = e.target.files?.[0] ?? null;
                    pendingOptionPhotoKey.current = null;
                    e.target.value = "";
                    if (key && file) applyOptionImageFile(key, file);
                  }}
                />
                {groupVariants.map((row, index) => {
                  const sellOk = parsePosMoney(row.unitPrice) != null;
                  const labelOk = row.label.trim().length > 0;
                  const started = labelOk || row.unitPrice.trim().length > 0;
                  const rowReady = sellOk && labelOk;
                  const onRowEnter = (
                    e: KeyboardEvent<HTMLInputElement>,
                  ) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    handleOptionEnter(index, row);
                  };
                  return (
                    <div
                      key={row.key}
                      id={`${modeId}-row-${row.key}`}
                      className={styles.row}
                      data-ready={rowReady ? "" : undefined}
                      data-enter={
                        skipEnter.current.has(row.key) ? undefined : ""
                      }
                    >
                      <div className={styles.wash} aria-hidden />
                      <div className={styles.num}>
                        <span className={styles.index}>{index + 1}</span>
                        <Check className={cn(styles.check, "size-3.5")} />
                      </div>
                      <div className={cn(styles.cell, styles.cellPhoto)}>
                        <button
                          type="button"
                          className={styles.optPhoto}
                          data-filled={row.imageDataUrl ? "" : undefined}
                          disabled={busy}
                          aria-label={
                            row.imageDataUrl
                              ? `Change photo for option ${index + 1}`
                              : `Add photo for option ${index + 1} (optional)`
                          }
                          onClick={() => openOptionPhotoPicker(row.key)}
                          onContextMenu={(e) => {
                            if (!row.imageDataUrl) return;
                            e.preventDefault();
                            applyOptionImageFile(row.key, null);
                          }}
                        >
                          {row.imageDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- local draft preview
                            <img
                              src={row.imageDataUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus className="size-3.5" aria-hidden />
                          )}
                        </button>
                      </div>
                      <div className={styles.cell}>
                        <input
                          id={`${modeId}-opt-${row.key}`}
                          className={cellClass}
                          value={row.label}
                          disabled={busy}
                          onChange={(e) =>
                            patchVariant(row.key, {
                              label: e.target.value,
                            })
                          }
                          onKeyDown={onRowEnter}
                          placeholder={
                            index === 0 ? "500ml, Red…" : undefined
                          }
                          aria-label={`Option ${index + 1} name`}
                        />
                      </div>
                      <div className={cn(styles.cell, styles.cellSell)}>
                        <input
                          className={cn(
                            cellClass,
                            "text-right font-semibold tabular-nums",
                            started && !sellOk && "border-red-300",
                            rowReady &&
                              "border-[color-mix(in_srgb,var(--pos-primary)_40%,#d4d4d8)]",
                          )}
                          inputMode="decimal"
                          value={row.unitPrice}
                          disabled={busy}
                          onChange={(e) =>
                            patchVariant(row.key, {
                              unitPrice: e.target.value,
                            })
                          }
                          onKeyDown={onRowEnter}
                          placeholder="0.00"
                          aria-label={`Option ${index + 1} sell price`}
                        />
                      </div>
                      <div className={cn(styles.cell, styles.cellStock)}>
                        <input
                          className={cn(cellClass, "text-right tabular-nums")}
                          inputMode="decimal"
                          value={row.stock}
                          disabled={busy}
                          onChange={(e) =>
                            patchVariant(row.key, {
                              stock: e.target.value,
                            })
                          }
                          onKeyDown={onRowEnter}
                          placeholder={forReceive ? "0" : "1"}
                          aria-label={`Option ${index + 1} stock`}
                        />
                      </div>
                      <div className={cn(styles.cell, styles.cellCost)}>
                        <input
                          className={cn(cellClass, "text-right tabular-nums")}
                          inputMode="decimal"
                          value={row.buyingPrice}
                          disabled={busy}
                          onChange={(e) =>
                            patchVariant(row.key, {
                              buyingPrice: e.target.value,
                            })
                          }
                          onKeyDown={onRowEnter}
                          placeholder="0.00"
                          aria-label={`Option ${index + 1} cost`}
                        />
                      </div>
                      <div className={cn(styles.cell, styles.cellCode)}>
                        <input
                          className={cellClass}
                          value={row.barcode}
                          disabled={busy}
                          onChange={(e) =>
                            patchVariant(row.key, {
                              barcode: e.target.value,
                            })
                          }
                          onKeyDown={onRowEnter}
                          placeholder="Scan"
                          aria-label={`Option ${index + 1} barcode`}
                        />
                      </div>
                      <div className={cn(styles.cell, styles.cellRemove)}>
                        {groupVariants.length > 1 ? (
                          <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Remove option ${index + 1}`}
                            disabled={busy}
                            onClick={() => removeOption(row.key)}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {groupVariants.length < 24 ? (
                  <button
                    type="button"
                    className={cn(styles.ghost, inviteOn && styles.ghostInvite)}
                    disabled={busy}
                    onClick={addOptionRow}
                    onAnimationEnd={() => setInviteOn(false)}
                  >
                    <span className={styles.ghostIcon}>
                      <Plus className="size-3.5" />
                    </span>
                    Next size or flavour
                  </button>
                ) : null}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-zinc-200 px-4 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <button
            type="button"
            className={styles.create}
            disabled={!canSubmit || busy}
            data-armed={canSubmit ? "true" : "false"}
            data-busy={busy ? "true" : undefined}
            data-stamp={canSubmit && stamp > 0 ? stamp : undefined}
            onClick={() => void onSubmit()}
          >
            {busy
              ? "Creating…"
              : mode === "group"
                ? readyGroupVariants.length === 0
                  ? "Create group"
                  : readyGroupVariants.length === 1
                    ? "Create 1 option"
                    : `Create ${readyGroupVariants.length} options`
                : forReceive
                  ? "Create product"
                  : "Create & add to sale"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
