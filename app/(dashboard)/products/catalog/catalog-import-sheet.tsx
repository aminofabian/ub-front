"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import type { GlobalCatalogAdoptLine, GlobalProductRecord } from "@/lib/api";
import { cn, formatMoney } from "@/lib/utils";

import styles from "./catalog-import-sheet.module.css";

const COLUMNS = [
  { key: "pick", letter: "A", label: "" },
  { key: "product", letter: "B", label: "Product" },
  { key: "category", letter: "C", label: "Department" },
  { key: "barcode", letter: "D", label: "Barcode" },
  { key: "sku", letter: "E", label: "SKU" },
  { key: "buy", letter: "F", label: "Buy" },
  { key: "sell", letter: "G", label: "Sell" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

type CatalogImportSheetProps = {
  products: GlobalProductRecord[];
  selectedIds: Set<string>;
  overrides: Map<string, GlobalCatalogAdoptLine>;
  categoryName: (categoryId: string | null | undefined) => string;
  /** Shop departments. Choosing one only changes this import, not the global catalog. */
  departments: { id: string; name: string; depth: number }[];
  suggestedDepartmentId: (product: GlobalProductRecord) => string | undefined;
  currency: string;
  imageSrc: (url?: string | null) => string | null;
  onToggle: (product: GlobalProductRecord) => void;
  onEdit: (productId: string, patch: Partial<GlobalCatalogAdoptLine>) => void;
  onOpenOwned: (itemId: string) => void;
  loading?: boolean;
};

function moneyDraft(
  override: number | null | undefined,
  recommended: number | null | undefined,
): string {
  const value = override ?? recommended;
  if (value == null || Number.isNaN(value)) return "";
  return String(value);
}

export function CatalogImportSheet({
  products,
  selectedIds,
  overrides,
  categoryName,
  departments,
  suggestedDepartmentId,
  currency,
  imageSrc,
  onToggle,
  onEdit,
  onOpenOwned,
  loading,
}: CatalogImportSheetProps) {
  const [active, setActive] = useState<{
    row: number;
    column: ColumnKey;
  } | null>(null);

  const activeProduct = active ? products[active.row] : null;
  const activeColumn = COLUMNS.find((column) => column.key === active?.column);
  const activeOverride = activeProduct
    ? overrides.get(activeProduct.id)
    : undefined;
  const formula =
    activeProduct && activeColumn
      ? cellReadout(
          activeProduct,
          activeColumn.key,
          activeOverride,
          categoryName,
          departments,
          currency,
        )
      : "Click a department, SKU, or price to edit it. This stays in your shop.";

  return (
    <div className={styles.sheet}>
      <div className={styles.formula}>
        <div className={styles.nameBox}>
          {active && activeColumn ? `${activeColumn.letter}${active.row + 1}` : "—"}
        </div>
        <div className={styles.fx} aria-hidden>
          fx
        </div>
        <div className={styles.formulaValue}>{formula}</div>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.corner} scope="col" />
            {COLUMNS.map((column) => (
              <th key={column.key} className={styles.colHead} scope="col">
                {column.letter}
                {column.label ? (
                  <span className="mt-0.5 block font-normal normal-case tracking-normal opacity-80">
                    {column.label}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 12 }, (_, index) => (
                <tr key={`sk-${index}`}>
                  <th className={styles.gutter} scope="row">
                    {index + 1}
                  </th>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className={styles.cell}>
                      <div className={styles.cellInner}>
                        <span className={styles.muted}>…</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            : products.map((product, index) => {
                const override = overrides.get(product.id);
                const selected = selectedIds.has(product.id);
                const owned = product.alreadyImported;
                const src = imageSrc(product.imageUrl);
                const sku = override?.sku ?? product.skuTemplate ?? "";
                const buy = moneyDraft(
                  override?.buyingPrice,
                  product.recommendedBuyingPrice,
                );
                const sell = moneyDraft(
                  override?.sellingPrice,
                  product.recommendedSellingPrice,
                );
                const skuEdited = override?.sku != null;
                const buyEdited = override?.buyingPrice != null;
                const sellEdited = override?.sellingPrice != null;
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      styles.bodyRow,
                      selected && styles.rowSelected,
                      owned && styles.rowOwned,
                    )}
                  >
                    <th className={styles.gutter} scope="row">
                      {index + 1}
                    </th>
                    <td className={styles.cell}>
                      <div className={cn(styles.cellInner, "justify-center")}>
                        <input
                          type="checkbox"
                          className={styles.check}
                          checked={selected}
                          aria-label={`Select ${product.name}`}
                          onChange={() => onToggle(product)}
                        />
                      </div>
                    </td>
                    <td className={styles.cell}>
                      <div className={styles.cellInner}>
                        {src ? (
                          <img
                            src={src}
                            alt=""
                            className={styles.thumb}
                            loading="lazy"
                          />
                        ) : (
                          <span className={cn(styles.thumb, "inline-flex items-center justify-center")}>
                            <Package className="size-3.5" aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className={cn(styles.productName, "block truncate")}>
                            {product.name}
                          </span>
                          <span className={cn(styles.muted, "block truncate text-[11px]")}>
                            {[product.brand, product.size].filter(Boolean).join(" · ")}
                            {owned && product.adoptedItemId ? (
                              <>
                                {" · "}
                                <button
                                  type="button"
                                  className={styles.link}
                                  onClick={() => onOpenOwned(product.adoptedItemId!)}
                                >
                                  In your catalog
                                </button>
                              </>
                            ) : null}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        styles.cell,
                        styles.editable,
                        override?.categoryId != null && styles.edited,
                        active?.row === index && active.column === "category" && styles.cellActive,
                      )}
                    >
                      <div className={styles.cellInner}>
                        <select
                          className={styles.select}
                          aria-label={`Department for ${product.name}`}
                          disabled={owned}
                          value={
                            override?.categoryId ??
                            suggestedDepartmentId(product) ??
                            ""
                          }
                          onFocus={() => setActive({ row: index, column: "category" })}
                          onChange={(event) => {
                            const next = event.target.value;
                            onEdit(product.id, {
                              categoryId: next ? next : null,
                            });
                          }}
                        >
                          <option value="">
                            {categoryName(product.globalCategoryId)}
                          </option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {"\u00a0".repeat(department.depth * 2)}
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className={styles.cell}>
                      <div className={cn(styles.cellInner, styles.muted)}>
                        {product.barcode ?? "—"}
                      </div>
                    </td>
                    <EditableCell
                      edited={skuEdited}
                      active={active?.row === index && active.column === "sku"}
                      disabled={owned}
                      value={sku}
                      align="left"
                      label={`SKU for ${product.name}`}
                      onFocus={() => setActive({ row: index, column: "sku" })}
                      onCommit={(next) =>
                        onEdit(product.id, { sku: next.trim() || null })
                      }
                    />
                    <EditableCell
                      edited={buyEdited}
                      active={active?.row === index && active.column === "buy"}
                      disabled={owned}
                      value={buy}
                      label={`Buy price for ${product.name}`}
                      onFocus={() => setActive({ row: index, column: "buy" })}
                      onCommit={(next) => {
                        const parsed = parseMoney(next);
                        onEdit(product.id, {
                          buyingPrice: parsed,
                          openingUnitCost: parsed,
                        });
                      }}
                    />
                    <EditableCell
                      edited={sellEdited}
                      active={active?.row === index && active.column === "sell"}
                      disabled={owned}
                      value={sell}
                      label={`Sell price for ${product.name}`}
                      onFocus={() => setActive({ row: index, column: "sell" })}
                      onCommit={(next) =>
                        onEdit(product.id, { sellingPrice: parseMoney(next) })
                      }
                    />
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function cellReadout(
  product: GlobalProductRecord,
  column: ColumnKey,
  override: GlobalCatalogAdoptLine | undefined,
  categoryName: (categoryId: string | null | undefined) => string,
  departments: { id: string; name: string }[],
  currency: string,
): string {
  if (column === "product") return product.name;
  if (column === "category") {
    const picked = override?.categoryId
      ? departments.find((department) => department.id === override.categoryId)?.name
      : null;
    return picked ?? categoryName(product.globalCategoryId);
  }
  if (column === "barcode") return product.barcode ?? "";
  if (column === "sku") return override?.sku ?? product.skuTemplate ?? "";
  if (column === "buy") {
    const value = override?.buyingPrice ?? product.recommendedBuyingPrice;
    return value != null ? formatMoney(value, currency) : "";
  }
  if (column === "sell") {
    const value = override?.sellingPrice ?? product.recommendedSellingPrice;
    return value != null ? formatMoney(value, currency) : "";
  }
  return product.name;
}

function EditableCell({
  value,
  edited,
  active,
  disabled,
  align = "right",
  label,
  onFocus,
  onCommit,
}: {
  value: string;
  edited: boolean;
  active: boolean;
  disabled: boolean;
  align?: "left" | "right";
  label: string;
  onFocus: () => void;
  onCommit: (next: string) => void;
}) {
  return (
    <td
      className={cn(
        styles.cell,
        styles.editable,
        edited && styles.edited,
        active && styles.cellActive,
      )}
    >
      <div className={styles.cellInner}>
        <input
          className={cn(styles.input, align === "left" && styles.inputText)}
          aria-label={label}
          defaultValue={value}
          key={value}
          disabled={disabled}
          inputMode={align === "right" ? "decimal" : "text"}
          onFocus={onFocus}
          onBlur={(event) => {
            if (event.currentTarget.value !== value) {
              onCommit(event.currentTarget.value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </td>
  );
}
