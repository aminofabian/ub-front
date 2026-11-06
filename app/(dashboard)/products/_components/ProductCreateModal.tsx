"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  ChevronDown,
  Globe2,
  ImagePlus,
  Layers,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  ScanBarcode,
} from "lucide-react";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormDrawerProps } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { isButcheryBusiness } from "@/lib/business-store-type";
import {
  BUTCHER_PRODUCT_TEMPLATES,
  matchItemTypeIdForTemplate,
} from "@/lib/butcher-product-templates";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";
import {
  fetchGlobalCatalogProductFamily,
  type BranchRecord,
  type GlobalProductFamilyRecord,
  type GlobalProductRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import type { GenerateProductDescriptionResponse } from "@/lib/catalog-description-api";
import { resolveGeneratedCatalogIds } from "@/lib/resolve-generated-catalog";

import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import type { ParentDraft } from "../_types";
import { formatAmount, toNumber } from "../_utils";
import { categorySelectOptions } from "./category-select-options";
import {
  CreateGroupOptionsPad,
  MAX_GROUP_OPTIONS,
  newGroupOptionRow,
  readyGroupOptions,
  type GroupOptionRow,
} from "./CreateGroupOptionsPad";
import { OptionBarcodeLookup } from "./OptionBarcodeLookup";
import { PackageVariantsSection } from "./PackageVariantsSection";
import { ProductDescriptionField } from "./ProductDescriptionField";
import { ProductNameSuggestions } from "./ProductNameSuggestions";
import { PRODUCTS_CATALOG_VARS } from "./products-page-layout";
import {
  SearchableSelect,
  type SearchableSelectHandle,
} from "./SearchableSelect";
import {
  fetchImageAsFile,
  fillEmptyOptionFields,
  planFamilyFill,
  sharedProductToOptionSeed,
} from "./shared-option-fill";
import { useInlineCategoryCreate } from "../_hooks/useInlineCategoryCreate";
import { useInlineItemTypeCreate } from "../_hooks/useInlineItemTypeCreate";
import { useInlineAisleCreate } from "../_hooks/useInlineAisleCreate";
import {
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";
import styles from "./product-create-modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  catalog: Pick<
    CatalogListApi,
    | "itemTypes"
    | "sortedCategories"
    | "aisles"
    | "upsertCategory"
    | "upsertItemType"
    | "upsertAisle"
  >;
  canCreateCategory?: boolean;
  m: Pick<
    ProductMutationsApi,
    | "parentDraft"
    | "setParentDraft"
    | "nextAutoSkuHint"
    | "suppliersForLink"
    | "suppliersLoading"
    | "loadSuppliersForLink"
    | "onCreateParent"
    | "pendingCreateImage"
    | "setPendingCreateImage"
    | "parentCreateBusy"
  >;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  currencyCode: string;
  branches: BranchRecord[];
  canGlobalCatalog?: boolean;
  onOpenExistingProduct?: (itemId: string) => void;
};

/** What a shared-catalog family put into the Family + options form. */
type FamilyFill = {
  name: string;
  photoUrl: string | null;
  /** The option rows this fill added, with the barcode each was filled with. */
  rows: Array<{ key: string; barcode: string }>;
  count: number;
  /** Family members already on the shelf, left out. */
  onShelf: number;
  /** Members that did not fit under the option limit. */
  trimmed: number;
};

function describeFamilyFill(fill: FamilyFill): string {
  if (fill.count === 0) {
    return fill.onShelf > 0
      ? "Everything in this family is already on your shelf."
      : "Nothing from the shared catalog could be added.";
  }
  const parts = [
    `${fill.count} option${fill.count === 1 ? "" : "s"} filled from the shared catalog — confirm the prices and how many you have.`,
  ];
  if (fill.onShelf > 0) {
    parts.push(`${fill.onShelf} already on your shelf, left out.`);
  }
  if (fill.trimmed > 0) {
    parts.push(`Only ${MAX_GROUP_OPTIONS} fit in one family.`);
  }
  return parts.join(" ");
}

function matchItemTypeFromHint(
  itemTypes: ItemTypeRecord[],
  hint: string | null | undefined,
): string | null {
  const key = hint?.trim().toLowerCase();
  if (!key) return null;
  const byKey = itemTypes.find((t) => t.key.trim().toLowerCase() === key);
  if (byKey) return byKey.id;
  return matchItemTypeIdForTemplate(itemTypes, key);
}

function matchCategoryIdByName(
  categories: { id: string; name: string }[],
  name: string | null | undefined,
): string | null {
  const needle = name?.trim().toLowerCase();
  if (!needle) return null;
  const exact = categories.find((c) => c.name.trim().toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = categories.find((c) =>
    c.name.trim().toLowerCase().includes(needle),
  );
  return partial?.id ?? null;
}

const fieldClass = cn(
  "h-12 w-full rounded-2xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-3 text-base text-[var(--catalog-ink,#15231f)] shadow-none sm:h-10 sm:rounded-none sm:text-[14px]",
  "placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]",
  "focus-visible:border-[var(--catalog-ink,#15231f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_28%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--catalog-shelf,#ffffff)_80%,transparent)]",
);

const labelClass =
  "text-[12px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_62%,transparent)]";

function formatFamilyPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className={labelClass}>
        {children}
      </label>
      {hint ? (
        <span className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function QtyStepper({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const qty = value.trim() === "" ? 0 : Number(value);
  const safe = Number.isFinite(qty) && qty >= 0 ? qty : 0;

  return (
    <div className="flex h-12 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white sm:h-10 sm:rounded-none">
      <button
        type="button"
        disabled={disabled || safe <= 0}
        onClick={() => onChange(safe <= 1 ? "" : String(safe - 1))}
        className="flex w-12 shrink-0 items-center justify-center text-[var(--catalog-ink,#15231f)] transition-transform duration-150 ease-out enabled:active:scale-[0.97] disabled:opacity-30 sm:w-11"
        aria-label="Fewer items"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        className="min-w-0 flex-1 border-x border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-transparent text-center text-[15px] tabular-nums text-[var(--catalog-ink,#15231f)] outline-none placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]"
        placeholder="0"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d.]/g, "");
          onChange(next);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(String(safe + 1))}
        className="flex w-12 shrink-0 items-center justify-center text-[var(--catalog-ink,#15231f)] transition-transform duration-150 ease-out enabled:active:scale-[0.97] disabled:opacity-30 sm:w-11"
        aria-label="More items"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function ProductCreateModal({
  open,
  onClose,
  banner,
  catalog,
  m,
  canLinkSupplier,
  canListSuppliers,
  currencyCode,
  branches,
  canGlobalCatalog = false,
  canCreateCategory = false,
  onOpenExistingProduct,
}: Props) {
  const modeId = useId();
  const { business } = useDashboard();
  const showButcherTemplates = isButcheryBusiness(business);
  const fileRef = useRef<HTMLInputElement>(null);
  const categorySelectRef = useRef<SearchableSelectHandle>(null);
  const departmentSelectRef = useRef<SearchableSelectHandle>(null);
  const aisleSelectRef = useRef<SearchableSelectHandle>(null);
  const isGroup = m.parentDraft.productStructure === "group";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 640px)").matches
      : true,
  );
  const [photoOver, setPhotoOver] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [stamp, setStamp] = useState(0);
  const prevArmed = useRef(false);
  const [descGenError, setDescGenError] = useState("");
  const [linkedGlobalLabel, setLinkedGlobalLabel] = useState<string | null>(
    null,
  );
  /** Shared-catalog photo shown in the form the moment a match is applied. */
  const [globalPhotoUrl, setGlobalPhotoUrl] = useState<string | null>(null);
  /** Root + pack sizes around the linked product ("also add its pack sizes"). */
  const [globalFamily, setGlobalFamily] = useState<GlobalProductFamilyRecord | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOptionRow[]>(() => [
    newGroupOptionRow(),
    newGroupOptionRow(),
  ]);
  /** Option row whose barcode the camera is reading right now. */
  const [optionScanKey, setOptionScanKey] = useState<string | null>(null);
  /** Set once a shared-catalog family has filled the options; "Clear" undoes it. */
  const [familyShared, setFamilyShared] = useState<FamilyFill | null>(null);
  const [familyFillBusy, setFamilyFillBusy] = useState(false);
  const groupOptionsRef = useRef(groupOptions);
  useEffect(() => {
    groupOptionsRef.current = groupOptions;
  }, [groupOptions]);
  const categoryCreate = useInlineCategoryCreate(catalog.upsertCategory);
  const departmentCreate = useInlineItemTypeCreate(catalog.upsertItemType);
  const aisleCreate = useInlineAisleCreate(catalog.upsertAisle);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setKeepOpen(false);
    setScannerOpen(false);
    setMoreOpen(false);
    setPhotoOver(false);
    setJustAdded(false);
    setStamp(0);
    prevArmed.current = false;
    setDescGenError("");
    setLinkedGlobalLabel(null);
    setGlobalPhotoUrl(null);
    setOptionScanKey(null);
    setFamilyShared(null);
    setFamilyFillBusy(false);
    setGroupOptions((prev) => {
      for (const row of prev) {
        if (row.imagePreview) URL.revokeObjectURL(row.imagePreview);
      }
      return [newGroupOptionRow(), newGroupOptionRow()];
    });
    categoryCreate.clearError();
    departmentCreate.clearError();
    aisleCreate.clearError();
  }, [
    open,
    aisleCreate.clearError,
    categoryCreate.clearError,
    departmentCreate.clearError,
  ]);

  const setFamilyMode = useCallback(
    (next: boolean) => {
      if (next) {
        m.setParentDraft((p) => ({
          ...p,
          productStructure: "group",
          isSellable: false,
          globalProductSourceId: null,
          globalExtraVariantIds: [],
        }));
        setLinkedGlobalLabel(null);
        setGlobalPhotoUrl(null);
        setGlobalFamily(null);
        return;
      }
      m.setParentDraft((p) => ({
        ...p,
        productStructure: "standalone",
        isSellable: true,
      }));
    },
    [m],
  );

  const applyDerivedOpeningUnitCost = useCallback((prev: ParentDraft) => {
    const buy = toNumber(prev.buyingPrice);
    if (buy == null) return prev;
    const packQty = Math.max(1, toNumber(prev.bundleQty) ?? 1);
    const perUnit = buy / packQty;
    const perUnitStr = Number.isFinite(perUnit) ? String(perUnit) : "";
    return { ...prev, openingUnitCost: perUnitStr };
  }, []);

  const syncCostsFromBuyingPrice = useCallback(
    (buyingPrice: string, prev: ParentDraft) => {
      return applyDerivedOpeningUnitCost({ ...prev, buyingPrice });
    },
    [applyDerivedOpeningUnitCost],
  );

  const applyGlobalMatch = useCallback(
    (match: GlobalProductRecord) => {
      const matchedTypeId = matchItemTypeFromHint(
        catalog.itemTypes,
        match.itemTypeKeyHint,
      );
      const matchedCategoryId = matchCategoryIdByName(
        catalog.sortedCategories,
        match.categoryName,
      );
      m.setParentDraft((prev) => {
        const next: ParentDraft = {
          ...prev,
          productStructure: "standalone",
          isSellable: match.sellable,
          isStocked: match.stocked,
          isWeighed: match.weighed,
          name: match.name,
          barcode: match.barcode?.trim() || prev.barcode,
          sku: match.skuTemplate?.trim() || prev.sku,
          brand: match.brand?.trim() || prev.brand,
          size: match.size?.trim() || prev.size,
          description: match.description?.trim() || prev.description,
          unitType: match.unitType?.trim() || prev.unitType,
          itemTypeId: matchedTypeId || prev.itemTypeId,
          categoryId: matchedCategoryId || prev.categoryId,
          buyingPrice:
            match.recommendedBuyingPrice != null
              ? String(match.recommendedBuyingPrice)
              : prev.buyingPrice,
          bundlePrice:
            match.recommendedSellingPrice != null
              ? String(match.recommendedSellingPrice)
              : prev.bundlePrice,
          reorderLevel:
            match.defaultReorderLevel != null
              ? String(match.defaultReorderLevel)
              : prev.reorderLevel,
          reorderQty:
            match.defaultReorderQty != null
              ? String(match.defaultReorderQty)
              : prev.reorderQty,
          minStockLevel:
            match.defaultMinStockLevel != null
              ? String(match.defaultMinStockLevel)
              : prev.minStockLevel,
          globalProductSourceId: match.id,
        };
        return syncCostsFromBuyingPrice(next.buyingPrice, next);
      });
      setLinkedGlobalLabel(match.name);
      setGlobalPhotoUrl(match.imageUrl?.trim() || null);
      // Everything is filled — put the cursor on the one thing the shopkeeper
      // actually decides: the selling price.
      requestAnimationFrame(() => {
        const sellInput = document.getElementById(
          "create-selling-price",
        ) as HTMLInputElement | null;
        sellInput?.focus();
        sellInput?.select();
      });
    },
    [catalog.itemTypes, catalog.sortedCategories, m, syncCostsFromBuyingPrice],
  );

  // The moment a product is linked, learn its family: a base product offers its pack
  // sizes (pre-ticked), a pack size explains that its base comes along automatically.
  useEffect(() => {
    const gid = m.parentDraft.globalProductSourceId;
    if (!gid || !canGlobalCatalog) {
      setGlobalFamily(null);
      return;
    }
    let cancelled = false;
    void fetchGlobalCatalogProductFamily(gid)
      .then((family) => {
        if (cancelled) return;
        setGlobalFamily(family);
        const isVariantMatch = family.root != null && family.root.id !== gid;
        const defaults = isVariantMatch
          ? []
          : family.variants
              .filter((v) => v.id !== gid && !v.alreadyImported)
              .map((v) => v.id);
        m.setParentDraft((p) =>
          p.globalProductSourceId === gid
            ? { ...p, globalExtraVariantIds: defaults }
            : p,
        );
      })
      .catch(() => {
        if (!cancelled) setGlobalFamily(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.parentDraft.globalProductSourceId, canGlobalCatalog]);

  /** Saves a downloaded catalog photo on an option, only while that row still exists and has no photo. */
  const attachOptionPhoto = useCallback((rowKey: string, file: File) => {
    const target = groupOptionsRef.current.find((r) => r.key === rowKey);
    if (!target || target.imageFile) return;
    const preview = URL.createObjectURL(file);
    setGroupOptions((prev) =>
      prev.map((r) =>
        r.key === rowKey && !r.imageFile
          ? { ...r, imageFile: file, imagePreview: preview }
          : r,
      ),
    );
  }, []);

  /** One option row filled from a shared-catalog product (scanned or typed barcode). */
  const applySharedToOption = useCallback(
    (rowKey: string, product: GlobalProductRecord) => {
      const seed = sharedProductToOptionSeed(product, m.parentDraft.name);
      setGroupOptions((prev) =>
        prev.map((r) =>
          r.key === rowKey ? fillEmptyOptionFields(r, seed) : r,
        ),
      );
      const photo = product.imageUrl?.trim();
      if (photo) {
        void fetchImageAsFile(photo, product.name).then((file) => {
          if (file) attachOptionPhoto(rowKey, file);
        });
      }
    },
    [attachOptionPhoto, m.parentDraft.name],
  );

  /**
   * Fills Family + options from a shared-catalog match: the family name, the
   * department / category hints, its photo and one option per pack size or member.
   * The options are saved as ordinary options — nothing is linked to the catalog.
   */
  const applyGlobalFamily = useCallback(
    async (match: GlobalProductRecord) => {
      setFamilyFillBusy(true);
      try {
        let family: GlobalProductFamilyRecord | null = null;
        try {
          family = await fetchGlobalCatalogProductFamily(match.id);
        } catch {
          family = null;
        }
        const isStarted = (r: GroupOptionRow) =>
          Boolean(r.label.trim() || r.unitPrice.trim() || r.imageFile);
        const startedRows = groupOptionsRef.current.filter(isStarted);
        const plan = planFamilyFill({
          match,
          family,
          typedName: m.parentDraft.name,
          room: MAX_GROUP_OPTIONS - startedRows.length,
        });
        const { root, isFamily, familyTitle } = plan;
        const added = plan.picks.map(({ g, seed }) => ({
          g,
          row: newGroupOptionRow(seed),
        }));

        if (added.length > 0) {
          setGroupOptions((prev) => {
            const keep = prev.filter(isStarted);
            for (const r of prev) {
              if (!keep.includes(r) && r.imagePreview) {
                URL.revokeObjectURL(r.imagePreview);
              }
            }
            return [...keep, ...added.map((a) => a.row)].slice(
              0,
              MAX_GROUP_OPTIONS,
            );
          });

          const matchedTypeId = matchItemTypeFromHint(
            catalog.itemTypes,
            root.itemTypeKeyHint,
          );
          const matchedCategoryId = matchCategoryIdByName(
            catalog.sortedCategories,
            root.categoryName,
          );
          const brand = isFamily ? root.brand?.trim() : "";
          const description = isFamily ? root.description?.trim() : "";
          m.setParentDraft((prev) =>
            prev.productStructure !== "group"
              ? prev
              : {
                  ...prev,
                  name: familyTitle,
                  ...(brand ? { brand } : {}),
                  ...(description ? { description } : {}),
                  itemTypeId: matchedTypeId || prev.itemTypeId,
                  categoryId: matchedCategoryId || prev.categoryId,
                },
          );

          const familyPhoto = isFamily ? root.imageUrl?.trim() : "";
          if (familyPhoto && !m.pendingCreateImage) {
            void fetchImageAsFile(familyPhoto, familyTitle).then((file) => {
              if (file) m.setPendingCreateImage((cur) => cur ?? file);
            });
          }
          // One at a time: a family can bring a couple of dozen photos.
          void (async () => {
            for (const { g, row } of added) {
              const url = g.imageUrl?.trim();
              if (!url) continue;
              const file = await fetchImageAsFile(url, g.name);
              if (file) attachOptionPhoto(row.key, file);
            }
          })();

          const firstNumber = startedRows.length + 1;
          requestAnimationFrame(() => {
            const sell = document.querySelector<HTMLInputElement>(
              `input[aria-label="Option ${firstNumber} sell price"]`,
            );
            sell?.focus();
            sell?.select();
          });
        }

        setFamilyShared({
          name: familyTitle,
          photoUrl:
            root.imageUrl?.trim() || added[0]?.g.imageUrl?.trim() || null,
          rows: added.map((a) => ({ key: a.row.key, barcode: a.row.barcode })),
          count: added.length,
          onShelf: plan.onShelf,
          trimmed: plan.trimmed,
        });
      } finally {
        setFamilyFillBusy(false);
      }
    },
    [
      attachOptionPhoto,
      catalog.itemTypes,
      catalog.sortedCategories,
      m,
    ],
  );

  const clearFamilyShared = useCallback(() => {
    const keys = new Set((familyShared?.rows ?? []).map((r) => r.key));
    if (keys.size > 0) {
      setGroupOptions((prev) => {
        for (const r of prev) {
          if (keys.has(r.key) && r.imagePreview) {
            URL.revokeObjectURL(r.imagePreview);
          }
        }
        const next = prev.filter((r) => !keys.has(r.key));
        return next.length > 0
          ? next
          : [newGroupOptionRow(), newGroupOptionRow()];
      });
    }
    setFamilyShared(null);
  }, [familyShared]);

  /** Rows filled in bulk whose barcode is still the catalog's own. */
  const bulkFilledBarcodes = useMemo(
    () => new Map((familyShared?.rows ?? []).map((r) => [r.key, r.barcode])),
    [familyShared],
  );

  const marginInfo = useMemo(() => {
    const buy = Number(m.parentDraft.buyingPrice);
    const sell = Number(m.parentDraft.bundlePrice);
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0)
      return null;
    const profit = sell - buy;
    const margin = (profit / sell) * 100;
    return { profit, margin };
  }, [m.parentDraft.buyingPrice, m.parentDraft.bundlePrice]);

  useEffect(() => {
    if (!m.pendingCreateImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(m.pendingCreateImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [m.pendingCreateImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        m.setPendingCreateImage(file);
      }
      setPhotoOver(false);
    },
    [m],
  );

  const createCategoryName = useMemo(() => {
    const id = m.parentDraft.categoryId.trim();
    if (!id) return undefined;
    return catalog.sortedCategories.find((c) => c.id === id)?.name;
  }, [catalog.sortedCategories, m.parentDraft.categoryId]);

  const createDepartmentName = useMemo(() => {
    const id = m.parentDraft.itemTypeId.trim();
    if (!id) return undefined;
    return catalog.itemTypes.find((t) => t.id === id)?.label;
  }, [catalog.itemTypes, m.parentDraft.itemTypeId]);

  const categoryOptions = useMemo(
    () => categorySelectOptions(catalog.sortedCategories),
    [catalog.sortedCategories],
  );

  const departmentOptions = useMemo(
    () =>
      catalog.itemTypes.map((t) => ({
        value: t.id,
        label: t.label,
      })),
    [catalog.itemTypes],
  );

  const aisleOptions = useMemo(
    () =>
      catalog.aisles
        .filter((a) => a.active)
        .map((a) => ({
          value: a.id,
          label: `${a.name} (${a.code})`,
        })),
    [catalog.aisles],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      const created = await categoryCreate.create(name);
      m.setParentDraft((p) => ({ ...p, categoryId: created.id }));
    },
    [categoryCreate.create, m],
  );

  const handleCreateDepartment = useCallback(
    async (name: string) => {
      const created = await departmentCreate.create(name);
      m.setParentDraft((p) => ({ ...p, itemTypeId: created.id }));
    },
    [departmentCreate.create, m],
  );

  const handleCreateAisle = useCallback(
    async (name: string) => {
      const created = await aisleCreate.create(name);
      m.setParentDraft((p) => ({ ...p, aisleId: created.id }));
    },
    [aisleCreate.create, m],
  );

  const handleGenerated = useCallback(
    async (result: GenerateProductDescriptionResponse) => {
      setMoreOpen(true);
      const ids = await resolveGeneratedCatalogIds(result, {
        canCreateCategory,
        canCreateDepartment: canCreateCategory,
        createCategory: categoryCreate.create,
        createDepartment: departmentCreate.create,
      });
      if (!ids.categoryId && !ids.itemTypeId) return;
      m.setParentDraft((p) => ({
        ...p,
        ...(ids.categoryId ? { categoryId: ids.categoryId } : {}),
        ...(ids.itemTypeId ? { itemTypeId: ids.itemTypeId } : {}),
      }));
    },
    [canCreateCategory, categoryCreate.create, departmentCreate.create, m],
  );

  const currency = currencyCode.trim() || "KES";
  const familyName = m.parentDraft.name.trim();
  const readyOptions = useMemo(
    () => readyGroupOptions(groupOptions, familyName),
    [groupOptions, familyName],
  );
  const startedOptions = groupOptions.filter(
    (r) => r.label.trim() || r.unitPrice.trim(),
  ).length;

  const canArm =
    catalog.itemTypes.length > 0 &&
    m.parentDraft.name.trim().length > 0 &&
    (isGroup
      ? m.parentDraft.categoryId.trim().length > 0 &&
        readyOptions.length >= 1 &&
        readyOptions.length === startedOptions
      : Number.isFinite(Number(m.parentDraft.bundlePrice)) &&
        Number(m.parentDraft.bundlePrice) > 0);

  useEffect(() => {
    if (canArm && !prevArmed.current) setStamp((s) => s + 1);
    prevArmed.current = canArm;
  }, [canArm]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const creatingGroup = m.parentDraft.productStructure === "group";
      const savedType = m.parentDraft.itemTypeId;
      const savedBranch = m.parentDraft.openingBranchId;
      const savedStructure = m.parentDraft.productStructure;
      const savedStocked = m.parentDraft.isStocked;
      const savedSellable = m.parentDraft.isSellable;

      await m.onCreateParent(e, {
        keepOpen: creatingGroup ? false : keepOpen,
        groupOptions: creatingGroup
          ? readyOptions.map((o) => ({
              label: o.label,
              barcode: o.barcode || undefined,
              unitPrice: o.unitPrice,
              buyingPrice: o.buyingPrice,
              stock: o.stock,
              imageFile: o.imageFile,
            }))
          : undefined,
      });

      if (creatingGroup || !keepOpen) return;

      m.setParentDraft({
        ...m.parentDraft,
        name: "",
        sku: "",
        barcode: "",
        pluCode: "",
        brand: "",
        size: "",
        description: "",
        unitType: "",
        buyingPrice: "",
        bundleQty: "",
        bundlePrice: "",
        bundleName: "",
        minStockLevel: "",
        reorderLevel: "",
        reorderQty: "",
        supplierId: "",
        supplierSku: "",
        defaultCostPrice: "",
        openingQty: "",
        openingUnitCost: "",
        globalProductSourceId: null,
        productStructure: savedStructure,
        itemTypeId: savedType,
        openingBranchId: savedBranch,
        isStocked: savedStocked,
        isSellable: savedSellable,
        isWeighed: false,
        setPrimarySupplier: true,
      });
      m.setPendingCreateImage(null);
      setLinkedGlobalLabel(null);
      setJustAdded(true);
      window.setTimeout(() => {
        document.getElementById("create-product-name")?.focus();
      }, 0);
      window.setTimeout(() => setJustAdded(false), 560);
    },
    [keepOpen, m, readyOptions],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={desktop}
        data-onboarding-target={ONBOARDING_TARGETS.productsDrawer}
        style={PRODUCTS_CATALOG_VARS}
        overlayClassName="bg-black/40 supports-[backdrop-filter]:backdrop-blur-[2px]"
        className={cn(
          styles.root,
          "gap-0 overflow-hidden p-0",
          desktop
            ? "w-[min(100%,60rem)] max-w-[60rem] sm:rounded-none"
            : "max-h-[min(92dvh,44rem)] rounded-t-[2px] bg-[var(--op-surface)]",
        )}
      >
        {!desktop ? (
          <div className="flex shrink-0 justify-center pt-2" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" />
          </div>
        ) : null}
        <form
          id="create-parent-form"
          className="flex h-full min-h-0 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <header className={styles.header}>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2 text-[1.5rem] text-[var(--catalog-ink,#121A16)]">
                <span className={styles.iconMark}>
                  <PackagePlus className="size-3.5" aria-hidden />
                </span>
                Add product
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)]">
                {isGroup
                  ? "Name the family, then each size or flavour you sell."
                  : justAdded
                    ? "Added. Name the next one."
                    : "Name and selling price are enough to sell. Photo and barcode can wait."}
              </DialogDescription>
            </DialogHeader>

            <div
              className={styles.modeTrack}
              data-mode={isGroup ? "group" : "single"}
              role="tablist"
              aria-label="Product shape"
            >
              <div className={styles.modeThumb} aria-hidden />
              <button
                type="button"
                role="tab"
                id={`${modeId}-single`}
                aria-selected={!isGroup}
                disabled={m.parentCreateBusy}
                className={styles.modeBtn}
                onClick={() => setFamilyMode(false)}
              >
                <PackagePlus className="size-3.5" aria-hidden />
                Single item
              </button>
              <button
                type="button"
                role="tab"
                id={`${modeId}-group`}
                aria-selected={isGroup}
                disabled={m.parentCreateBusy}
                className={styles.modeBtn}
                onClick={() => setFamilyMode(true)}
              >
                <Layers className="size-3.5" aria-hidden />
                Family + options
              </button>
            </div>
          </header>

          <div className={styles.body}>
            {banner ? <div className="mb-1">{banner}</div> : null}

            {catalog.itemTypes.length === 0 ? (
              <div className="rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                {canCreateCategory
                  ? "Add a department below, or generate with AI under More details."
                  : "Add a department first (Your shop → Departments), then come back here."}
              </div>
            ) : null}

            {m.parentDraft.globalProductSourceId ? (
              <div className="flex items-center gap-2.5 rounded-none border border-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_7%,white)] px-3 py-2.5">
                <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-white">
                  {globalPhotoUrl ? (
                    <Image
                      src={globalPhotoUrl}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="size-full object-cover"
                    />
                  ) : (
                    <Globe2
                      className="size-4 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_45%,transparent)]"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[var(--catalog-ink,#15231f)]">
                    {linkedGlobalLabel ?? "Filled from the shared catalog"}
                  </span>
                  <span className="block text-[11px] leading-snug text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_60%,transparent)]">
                    Photo, barcode &amp; details come with it — just confirm the
                    prices and how many you have.
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)] underline-offset-2 hover:text-[var(--catalog-ink,#15231f)] hover:underline"
                  onClick={() => {
                    m.setParentDraft((p) => ({
                      ...p,
                      globalProductSourceId: null,
                      globalExtraVariantIds: [],
                    }));
                    setLinkedGlobalLabel(null);
                    setGlobalPhotoUrl(null);
                    setGlobalFamily(null);
                  }}
                >
                  Unlink
                </button>
              </div>
            ) : null}

            {m.parentDraft.globalProductSourceId && globalFamily
              ? (() => {
                  const gid = m.parentDraft.globalProductSourceId;
                  const isVariantMatch =
                    globalFamily.root != null && globalFamily.root.id !== gid;
                  const offerable = globalFamily.variants.filter(
                    (v) => v.id !== gid,
                  );
                  if (!isVariantMatch && offerable.length === 0) return null;
                  const selected = new Set(m.parentDraft.globalExtraVariantIds);
                  const selectable = offerable.filter((v) => !v.alreadyImported);
                  const toggle = (id: string) =>
                    m.setParentDraft((p) => ({
                      ...p,
                      globalExtraVariantIds: p.globalExtraVariantIds.includes(id)
                        ? p.globalExtraVariantIds.filter((x) => x !== id)
                        : [...p.globalExtraVariantIds, id],
                    }));
                  const packLabel = (v: GlobalProductRecord) => {
                    const unit = v.packagingUnitName ?? v.variantName;
                    if (unit) {
                      return `${unit}${v.packagingUnitQty ? ` ×${v.packagingUnitQty}` : ""}`;
                    }
                    return v.name;
                  };
                  return (
                    <div className="space-y-1.5 rounded-none border border-border bg-muted/15 p-2">
                      {isVariantMatch && globalFamily.root ? (
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          This is a pack size of{" "}
                          <span className="font-medium text-foreground">
                            {globalFamily.root.name}
                          </span>
                          {globalFamily.root.alreadyImported
                            ? " — already on your shelf; they will be linked."
                            : " — the base product is added and linked automatically."}
                        </p>
                      ) : null}
                      {offerable.length > 0 ? (
                        <>
                          <p className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                            {isVariantMatch
                              ? "Other pack sizes of the same product"
                              : `Also comes in ${offerable.length} pack size${offerable.length === 1 ? "" : "s"} — added together`}
                          </p>
                          <ul className="divide-y divide-border overflow-hidden rounded-none border border-border bg-background">
                            {offerable.map((v) => {
                              const onShelf = v.alreadyImported;
                              const sell = formatFamilyPrice(
                                v.recommendedSellingPrice,
                              );
                              return (
                                <li key={v.id}>
                                  <label
                                    className={cn(
                                      "flex w-full cursor-pointer items-center gap-2 px-2 py-1.5",
                                      onShelf && "cursor-default opacity-60",
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      className="size-4 shrink-0 rounded-none border"
                                      checked={onShelf || selected.has(v.id)}
                                      disabled={onShelf}
                                      onChange={() => toggle(v.id)}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-xs font-medium text-foreground">
                                        {packLabel(v)}
                                      </span>
                                      <span className="block truncate text-[10px] text-muted-foreground">
                                        {v.name}
                                        {sell ? ` · sell ${sell}` : ""}
                                        {onShelf ? " · already on your shelf" : ""}
                                      </span>
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                          {selectable.length > 0 ? (
                            <p className="text-[10px] text-muted-foreground">
                              Ticked sizes are created with catalog prices, linked
                              to this product, and share its stock — adjust them
                              any time from the product page.
                            </p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })()
              : null}

            <div className={cn("space-y-4", justAdded && styles.fresh)}>
              <div className={styles.identity}>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="create-product-name">
                    {isGroup ? "Family name" : "Name"}
                  </FieldLabel>
                  <input
                    id="create-product-name"
                    className={fieldClass}
                    placeholder={
                      isGroup
                        ? "e.g. Fresh milk, Phone cases"
                        : "e.g. Brookside 500ml"
                    }
                    value={m.parentDraft.name}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <span className={labelClass}>Photo</span>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setPhotoOver(true);
                    }}
                    onDragLeave={() => setPhotoOver(false)}
                    className={styles.photo}
                    data-filled={
                      previewUrl ||
                      (globalPhotoUrl && m.parentDraft.globalProductSourceId)
                        ? ""
                        : undefined
                    }
                    data-over={photoOver ? "" : undefined}
                  >
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt=""
                        width={76}
                        height={76}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : globalPhotoUrl && m.parentDraft.globalProductSourceId ? (
                      // The catalog photo arrives with the link on save; show it now
                      // so the form looks as finished as it actually is.
                      <Image
                        src={globalPhotoUrl}
                        alt=""
                        width={76}
                        height={76}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className={styles.photoBtn}
                        aria-label="Add a photo"
                      >
                        <ImagePlus className="size-5" aria-hidden />
                        <span>Add</span>
                      </button>
                    )}
                    {previewUrl ? (
                      <div className={styles.photoBar}>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => m.setPendingCreateImage(null)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : globalPhotoUrl && m.parentDraft.globalProductSourceId ? (
                      <div className={styles.photoBar}>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                        >
                          Use my own
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) m.setPendingCreateImage(file);
                }}
              />

              {/* Matches surface the moment the name (or a scanned barcode) is typed:
                  one tap fills the whole form from the shared catalog, or opens the
                  product if it is already on the shelf. */}
              {!isGroup && !m.parentDraft.globalProductSourceId ? (
                <ProductNameSuggestions
                  name={m.parentDraft.name}
                  barcode={m.parentDraft.barcode}
                  canGlobalCatalog={canGlobalCatalog}
                  onOpenExisting={(itemId) => {
                    onOpenExistingProduct?.(itemId);
                    onClose();
                  }}
                  onUseGlobal={applyGlobalMatch}
                  onAutoGlobal={applyGlobalMatch}
                />
              ) : null}

              {/* Family + options gets the same help: naming the family surfaces what
                  is already on the shelf and what the shared catalog has, and one tap
                  fills the options from its pack sizes. */}
              {isGroup && !familyShared ? (
                familyFillBusy ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                    Filling options from the shared catalog…
                  </p>
                ) : (
                  <ProductNameSuggestions
                    name={m.parentDraft.name}
                    canGlobalCatalog={canGlobalCatalog}
                    onOpenExisting={(itemId) => {
                      onOpenExistingProduct?.(itemId);
                      onClose();
                    }}
                    onUseGlobal={(product) => {
                      void applyGlobalFamily(product);
                    }}
                    useLabel="Fill options"
                    dismissedLabel="Creating a new family"
                  />
                )
              ) : null}

              {isGroup && familyShared ? (
                <div className="flex items-center gap-2.5 rounded-none border border-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_7%,white)] px-3 py-2.5">
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-white">
                    {familyShared.photoUrl ? (
                      <Image
                        src={familyShared.photoUrl}
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      <Globe2
                        className="size-4 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_45%,transparent)]"
                        aria-hidden
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-[var(--catalog-ink,#15231f)]">
                      {familyShared.name}
                    </span>
                    <span className="block text-[11px] leading-snug text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_60%,transparent)]">
                      {describeFamilyFill(familyShared)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)] underline-offset-2 hover:text-[var(--catalog-ink,#15231f)] hover:underline"
                    onClick={clearFamilyShared}
                  >
                    Clear
                  </button>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={labelClass}>Department</span>
                  {canCreateCategory ? (
                    <button
                      type="button"
                      disabled={m.parentCreateBusy || departmentCreate.busy}
                      onClick={() =>
                        departmentSelectRef.current?.openForCreate()
                      }
                      aria-label="New department"
                      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                    >
                      <Plus className="size-3" aria-hidden />
                      New
                    </button>
                  ) : null}
                </div>
                <SearchableSelect
                  ref={departmentSelectRef}
                  className={cn(
                    productFormInputClass,
                    "h-12 rounded-2xl text-base sm:h-10 sm:rounded-none sm:text-[14px]",
                  )}
                  value={m.parentDraft.itemTypeId}
                  onChange={(itemTypeId) =>
                    m.setParentDraft((p) => ({ ...p, itemTypeId }))
                  }
                  options={departmentOptions}
                  placeholder={
                    canCreateCategory ? "Find or create…" : "Pick one"
                  }
                  required
                  disabled={m.parentCreateBusy}
                  aria-label="Department"
                  onCreate={
                    canCreateCategory ? handleCreateDepartment : undefined
                  }
                  createBusy={departmentCreate.busy}
                  createError={departmentCreate.error}
                  createNoun="department"
                />
                {isGroup ? (
                  <span className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                    Options inherit this department.
                  </span>
                ) : null}
              </div>

              {isGroup ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={labelClass}>Category</span>
                    {canCreateCategory ? (
                      <button
                        type="button"
                        disabled={m.parentCreateBusy || categoryCreate.busy}
                        onClick={() =>
                          categorySelectRef.current?.openForCreate()
                        }
                        aria-label="New category"
                        className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                      >
                        <Plus className="size-3" aria-hidden />
                        New
                      </button>
                    ) : null}
                  </div>
                  <SearchableSelect
                    ref={categorySelectRef}
                    className={cn(
                      productFormInputClass,
                      "h-12 rounded-2xl text-base sm:h-10 sm:rounded-none sm:text-[14px]",
                    )}
                    value={m.parentDraft.categoryId}
                    onChange={(categoryId) =>
                      m.setParentDraft((p) => ({ ...p, categoryId }))
                    }
                    options={categoryOptions}
                    noneLabel="Pick one"
                    placeholder={
                      canCreateCategory ? "Find or create…" : "Type to find…"
                    }
                    required
                    disabled={m.parentCreateBusy}
                    aria-label="Category"
                    onCreate={
                      canCreateCategory ? handleCreateCategory : undefined
                    }
                    createBusy={categoryCreate.busy}
                    createError={categoryCreate.error}
                  />
                </div>
              ) : null}

              {!isGroup ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-selling-price">
                        Selling price
                      </FieldLabel>
                      <div className={styles.priceWrap}>
                        <input
                          id="create-selling-price"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          className={cn(
                            fieldClass,
                            styles.priceInput,
                            styles.priceSell,
                            "tabular-nums",
                          )}
                          placeholder="0"
                          value={m.parentDraft.bundlePrice}
                          onChange={(e) =>
                            m.setParentDraft((p) => ({
                              ...p,
                              bundlePrice: e.target.value,
                            }))
                          }
                          required
                        />
                        <span className={styles.priceCur}>{currency}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-buying-price">
                        Buying price
                      </FieldLabel>
                      <div className={styles.priceWrap}>
                        <input
                          id="create-buying-price"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          className={cn(
                            fieldClass,
                            styles.priceInput,
                            "tabular-nums",
                          )}
                          placeholder="0"
                          value={m.parentDraft.buyingPrice}
                          onChange={(e) =>
                            m.setParentDraft((p) =>
                              syncCostsFromBuyingPrice(e.target.value, p),
                            )
                          }
                        />
                        <span className={styles.priceCur}>{currency}</span>
                      </div>
                    </div>
                  </div>
                  <p
                    className={styles.margin}
                    data-show={marginInfo ? "" : undefined}
                    aria-live="polite"
                  >
                    {marginInfo
                      ? `${marginInfo.margin.toFixed(0)}% margin${
                          marginInfo.profit >= 0
                            ? ` · ${formatAmount(marginInfo.profit)} ${currency} profit`
                            : " · selling below cost"
                        }`
                      : "\u00a0"}
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel
                        htmlFor="create-opening-qty"
                        hint="On the shelf"
                      >
                        Number of items
                      </FieldLabel>
                      <QtyStepper
                        id="create-opening-qty"
                        value={m.parentDraft.openingQty}
                        onChange={(openingQty) =>
                          m.setParentDraft((p) => ({ ...p, openingQty }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-barcode" hint="Optional">
                        Barcode
                      </FieldLabel>
                      <div className="flex overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white sm:rounded-none">
                        <input
                          id="create-barcode"
                          className="h-12 min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-base text-[var(--catalog-ink,#15231f)] outline-none placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)] sm:h-10 sm:text-[13px]"
                          placeholder="Type or scan"
                          value={m.parentDraft.barcode}
                          onChange={(e) =>
                            m.setParentDraft((p) => ({
                              ...p,
                              barcode: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setScannerOpen(true)}
                          className="flex w-12 shrink-0 items-center justify-center border-l border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)] hover:text-[var(--catalog-ink,#15231f)] sm:w-11"
                          aria-label="Scan barcode with camera"
                        >
                          <ScanBarcode className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <CreateGroupOptionsPad
                  rows={groupOptions}
                  onChange={setGroupOptions}
                  currency={currency}
                  familyName={familyName}
                  disabled={m.parentCreateBusy}
                  onScanBarcode={setOptionScanKey}
                  renderRowHint={(row, ctx) => (
                    <OptionBarcodeLookup
                      barcode={row.barcode}
                      canGlobalCatalog={canGlobalCatalog}
                      appliedSharedId={row.sharedProductId ?? null}
                      rowTouched={ctx.touched}
                      sameBarcodeAs={ctx.sameBarcodeAs}
                      disabled={m.parentCreateBusy}
                      quiet={bulkFilledBarcodes.get(row.key) === row.barcode.trim()}
                      onUseShared={(product) =>
                        applySharedToOption(row.key, product)
                      }
                      onOpenExisting={(itemId) => {
                        onOpenExistingProduct?.(itemId);
                        onClose();
                      }}
                    />
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={styles.moreToggle}
                aria-expanded={moreOpen}
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    moreOpen ? "rotate-0" : "-rotate-90",
                  )}
                  aria-hidden
                />
                More details
              </button>

              {moreOpen ? (
                <div
                  className={cn(
                    styles.morePanel,
                    "space-y-3 rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#ffffff)_45%,white)] p-3",
                  )}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {!isGroup ? (
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={labelClass}>Category</span>
                          {canCreateCategory ? (
                            <button
                              type="button"
                              disabled={
                                m.parentCreateBusy || categoryCreate.busy
                              }
                              onClick={() => {
                                setMoreOpen(true);
                                categorySelectRef.current?.openForCreate();
                              }}
                              aria-label="New category"
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                            >
                              <Plus className="size-3" aria-hidden />
                              New
                            </button>
                          ) : null}
                        </div>
                        <SearchableSelect
                          ref={categorySelectRef}
                          className={cn(
                            productFormInputClass,
                            "h-10 rounded-none",
                          )}
                          value={m.parentDraft.categoryId}
                          onChange={(categoryId) =>
                            m.setParentDraft((p) => ({ ...p, categoryId }))
                          }
                          options={categoryOptions}
                          noneLabel="None"
                          placeholder={
                            canCreateCategory
                              ? "Find or create…"
                              : "Type to find…"
                          }
                          disabled={m.parentCreateBusy}
                          aria-label="Category"
                          onCreate={
                            canCreateCategory ? handleCreateCategory : undefined
                          }
                          createBusy={categoryCreate.busy}
                          createError={categoryCreate.error}
                        />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "space-y-1.5",
                        !isGroup && "sm:col-span-1",
                        isGroup && "sm:col-span-2",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={labelClass}>Shelf zone</span>
                        {canCreateCategory ? (
                          <button
                            type="button"
                            disabled={m.parentCreateBusy || aisleCreate.busy}
                            onClick={() => {
                              setMoreOpen(true);
                              aisleSelectRef.current?.openForCreate();
                            }}
                            aria-label="New shelf zone"
                            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                          >
                            <Plus className="size-3" aria-hidden />
                            New
                          </button>
                        ) : null}
                      </div>
                      <SearchableSelect
                        ref={aisleSelectRef}
                        className={cn(
                          productFormInputClass,
                          "h-10 rounded-none",
                        )}
                        value={m.parentDraft.aisleId}
                        onChange={(aisleId) =>
                          m.setParentDraft((p) => ({ ...p, aisleId }))
                        }
                        options={aisleOptions}
                        noneLabel="None"
                        placeholder={
                          canCreateCategory
                            ? "Find or create…"
                            : "Type to find…"
                        }
                        disabled={m.parentCreateBusy}
                        aria-label="Shelf zone"
                        onCreate={
                          canCreateCategory ? handleCreateAisle : undefined
                        }
                        createBusy={aisleCreate.busy}
                        createError={aisleCreate.error}
                        createNoun="shelf zone"
                      />
                    </div>
                  </div>

                  {!isGroup && showButcherTemplates ? (
                    <div className="flex flex-wrap gap-1.5">
                      {BUTCHER_PRODUCT_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className="rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--catalog-ink,#15231f)] hover:border-[var(--catalog-ink,#15231f)]"
                          onClick={() => {
                            const itemTypeId =
                              matchItemTypeIdForTemplate(
                                catalog.itemTypes,
                                template.itemTypeKeyword,
                              ) ?? m.parentDraft.itemTypeId;
                            m.setParentDraft((p) => ({
                              ...p,
                              name: p.name.trim() || template.label,
                              itemTypeId,
                              isWeighed: template.isWeighed,
                              unitType: template.unitType,
                            }));
                          }}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!isGroup ? (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={labelClass}>SKU</span>
                          <span className={productFormHintClass}>
                            Auto if empty
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            className={cn(
                              productFormInputClass,
                              "h-10 min-w-0 flex-1 rounded-none font-mono text-xs",
                            )}
                            placeholder="Auto"
                            value={m.parentDraft.sku}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                sku: e.target.value,
                              }))
                            }
                          />
                          {m.nextAutoSkuHint && !m.parentDraft.sku ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0 rounded-none px-2 font-mono text-[10px]"
                              onClick={() =>
                                m.setParentDraft((p) => ({
                                  ...p,
                                  sku: m.nextAutoSkuHint!,
                                }))
                              }
                            >
                              {m.nextAutoSkuHint}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {branches.length > 1 ? (
                        <div className="space-y-1.5">
                          <span className={labelClass}>Stock at branch</span>
                          <select
                            className={cn(
                              productFormInputClass,
                              "h-10 rounded-none",
                            )}
                            value={m.parentDraft.openingBranchId}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                openingBranchId: e.target.value,
                              }))
                            }
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <PackageVariantsSection
                        compact
                        showEnableToggle
                        enabled={m.parentDraft.sellAsPackages}
                        onEnabledChange={(sellAsPackages) =>
                          m.setParentDraft((p) => ({ ...p, sellAsPackages }))
                        }
                        rows={m.parentDraft.packageRows}
                        onRowsChange={(packageRows) =>
                          m.setParentDraft((p) => ({ ...p, packageRows }))
                        }
                        baseUnitHint={m.parentDraft.name.trim() || "piece"}
                        currencyCode={currencyCode}
                        className="border-0 bg-transparent p-0 shadow-none ring-0"
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className={productFormLabelClass}>Brand</span>
                          <input
                            className={cn(
                              productFormInputClass,
                              "h-10 rounded-none",
                            )}
                            value={m.parentDraft.brand}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                brand: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="space-y-1">
                          <span className={productFormLabelClass}>Size</span>
                          <input
                            className={cn(
                              productFormInputClass,
                              "h-10 rounded-none",
                            )}
                            value={m.parentDraft.size}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                size: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      {canLinkSupplier ? (
                        <div className="space-y-2">
                          {canListSuppliers &&
                          m.suppliersForLink.length === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-none text-xs"
                              disabled={m.suppliersLoading}
                              onClick={() => void m.loadSuppliersForLink()}
                            >
                              {m.suppliersLoading
                                ? "Loading…"
                                : "Load suppliers"}
                            </Button>
                          ) : null}
                          <label className="space-y-1">
                            <span className={productFormLabelClass}>
                              Supplier
                            </span>
                            <select
                              className={cn(
                                productFormInputClass,
                                "h-10 rounded-none",
                              )}
                              value={
                                m.suppliersForLink.some(
                                  (s) => s.id === m.parentDraft.supplierId,
                                )
                                  ? m.parentDraft.supplierId
                                  : ""
                              }
                              onChange={(e) =>
                                m.setParentDraft((p) => ({
                                  ...p,
                                  supplierId: e.target.value,
                                }))
                              }
                            >
                              <option value="">None</option>
                              {m.suppliersForLink.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <ProductDescriptionField
                    value={m.parentDraft.description}
                    onChange={(description) =>
                      m.setParentDraft((p) => ({ ...p, description }))
                    }
                    onError={setDescGenError}
                    onGenerated={handleGenerated}
                    rows={2}
                    textareaClassName="min-h-[2.5rem] rounded-none"
                    context={{
                      name: m.parentDraft.name,
                      categoryName: createCategoryName,
                      itemTypeName: createDepartmentName,
                      brand: m.parentDraft.brand,
                      size: m.parentDraft.size,
                      unitType: m.parentDraft.unitType,
                      sku: m.parentDraft.sku,
                      barcode: m.parentDraft.barcode,
                    }}
                  />
                  {descGenError ? (
                    <p className="text-xs text-destructive">{descGenError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2.5 border-t border-[var(--op-rule)] bg-[var(--op-surface)] px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:pb-3">
            <button
              type="button"
              role="switch"
              aria-checked={keepOpen}
              aria-label="Keep adding after save"
              disabled={isGroup || m.parentCreateBusy}
              onClick={() => setKeepOpen((v) => !v)}
              className={cn(styles.keep, "self-start sm:self-auto")}
            >
              <span className={styles.keepDot} aria-hidden />
              Keep adding
            </button>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                className="h-12 min-w-[4.5rem] px-3 text-[14px] sm:h-9 sm:text-[13px]"
                onClick={onClose}
                disabled={m.parentCreateBusy}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={
                  catalog.itemTypes.length === 0 ||
                  m.parentCreateBusy ||
                  !canArm
                }
                data-armed={canArm ? "true" : "false"}
                data-busy={m.parentCreateBusy ? "true" : undefined}
                data-stamp={canArm && stamp > 0 ? stamp : undefined}
                className={cn(styles.create, "flex-1 sm:w-auto sm:flex-none")}
              >
                {m.parentCreateBusy
                  ? "Saving…"
                  : isGroup
                    ? readyOptions.length === 0
                      ? "Create family"
                      : readyOptions.length === 1
                        ? "Create 1 option"
                        : `Create ${readyOptions.length} options`
                    : keepOpen
                      ? "Add & next"
                      : "Add product"}
              </button>
            </div>
          </DialogFooter>
        </form>

        {scannerOpen ? (
          <BarcodeScanner
            onScan={(barcode) => {
              m.setParentDraft((p) => ({ ...p, barcode }));
              setScannerOpen(false);
            }}
            onClose={() => setScannerOpen(false)}
          />
        ) : null}

        {optionScanKey ? (
          <BarcodeScanner
            onScan={(barcode) => {
              const key = optionScanKey;
              setGroupOptions((prev) =>
                prev.map((r) =>
                  r.key === key ? { ...r, barcode: barcode.trim() } : r,
                ),
              );
              setOptionScanKey(null);
            }}
            onClose={() => setOptionScanKey(null)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
