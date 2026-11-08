"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import {
  addableProducts,
  filterAttachProducts,
  plural,
  type AttachMode,
  type AttachPickerProduct,
} from "./supplier-attach";
import { supInput } from "./supplier-ui-tokens";

const PAGE_SIZE = 50;

type Props = {
  products: AttachPickerProduct[];
  mode: AttachMode;
  onModeChange: (mode: AttachMode) => void;
  selected: ReadonlySet<string>;
  onSelectedChange: (next: Set<string>) => void;
  disabled?: boolean;
};

function packLabel(p: AttachPickerProduct): string | null {
  const unit = p.packUnit?.trim();
  if (p.packSize != null && p.packSize > 0 && unit) {
    return `${Number(p.packSize)} ${unit}`;
  }
  return unit || null;
}

function ModeOption({
  name,
  checked,
  disabled,
  onSelect,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 border px-3 py-2.5 transition-colors",
        checked
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
          {hint}
        </span>
      </span>
    </label>
  );
}

function ProductBadge({ product }: { product: AttachPickerProduct }) {
  if (product.alreadyLinked) {
    return (
      <span className="border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        Already linked
      </span>
    );
  }
  if (product.inShop === true) {
    return (
      <span className="border border-primary/30 bg-primary/5 px-1.5 py-px text-[10px] font-medium text-primary">
        In your shop
      </span>
    );
  }
  if (product.inShop === false) {
    return (
      <span className="border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        New item
      </span>
    );
  }
  return null;
}

/**
 * "Add all" or "Choose products" for a supplier's shelf. Products the shop
 * already links to this supplier are shown but cannot be ticked, and are not
 * counted in "all".
 */
export function SupplierProductPicker({
  products,
  mode,
  onModeChange,
  selected,
  onSelectedChange,
  disabled = false,
}: Props) {
  const groupName = useId();
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const addable = addableProducts(products);
  const filtered = filterAttachProducts(products, query);
  const filteredAddable = addableProducts(filtered);
  const shown = filtered.slice(0, visible);
  const hidden = filtered.length - shown.length;

  const knowsShop = addable.some((p) => p.inShop !== undefined);
  const newItems = addable.filter((p) => p.inShop === false).length;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function selectAllMatching() {
    const next = new Set(selected);
    for (const p of filteredAddable) next.add(p.id);
    onSelectedChange(next);
  }

  if (products.length === 0) {
    return (
      <p className="px-3 py-3 text-sm text-muted-foreground">
        This supplier has not listed any products yet. You can add them now and
        link products later.
      </p>
    );
  }

  if (addable.length === 0) {
    return (
      <p className="px-3 py-3 text-sm text-muted-foreground">
        Every product from this supplier is already linked in your shop.
      </p>
    );
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <div
        role="radiogroup"
        aria-label="Products to add"
        className="grid gap-2 sm:grid-cols-2"
      >
        <ModeOption
          name={groupName}
          checked={mode === "all"}
          disabled={disabled}
          onSelect={() => onModeChange("all")}
          title={`All ${addable.length} ${plural(addable.length, "product")}`}
          hint="Everything this supplier lists. Items you do not stock yet are created for you."
        />
        <ModeOption
          name={groupName}
          checked={mode === "choose"}
          disabled={disabled}
          onSelect={() => onModeChange("choose")}
          title="Choose products"
          hint="Tick only the ones you want. Added products are linked to this supplier straight away."
        />
      </div>

      {mode === "all" ? (
        <p className="text-[12px] leading-snug text-muted-foreground">
          {addable.length} {plural(addable.length, "product")} will be linked
          {knowsShop && newItems > 0
            ? `, ${newItems} of them as new ${plural(newItems, "item")} in your catalogue`
            : ""}
          .
        </p>
      ) : (
        <div className="border border-border">
          <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-border bg-background px-2.5 py-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                disabled={disabled}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Search by name, barcode or category"
                aria-label="Search this supplier's products"
                className={cn(supInput, "pl-8")}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl px-2.5"
                disabled={disabled || filteredAddable.length === 0}
                onClick={selectAllMatching}
              >
                {query.trim()
                  ? `Select ${filteredAddable.length} shown`
                  : "Select all"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl px-2.5"
                disabled={disabled || selected.size === 0}
                onClick={() => onSelectedChange(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>

          <p
            className="border-b border-border px-2.5 py-1.5 text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            {selected.size} of {addable.length} selected
            {query.trim() ? ` · ${filtered.length} match` : ""}
          </p>

          {filtered.length === 0 ? (
            <p className="px-2.5 py-4 text-sm text-muted-foreground">
              No products match “{query.trim()}”.
            </p>
          ) : (
            <ul>
              {shown.map((p) => {
                const checked = selected.has(p.id);
                const locked = Boolean(p.alreadyLinked);
                const meta = [p.barcode, packLabel(p), p.categoryName]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        "flex min-h-12 items-start gap-3 border-b border-border px-2.5 py-2.5 last:border-b-0",
                        locked || disabled
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-muted/40",
                        checked && "bg-primary/5",
                        locked && "opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked || disabled}
                        onChange={() => toggle(p.id)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {p.name}
                        </span>
                        {meta ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {meta}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                        {p.unitPrice != null ? (
                          <span className="text-xs tabular-nums text-foreground">
                            {formatMoney(p.unitPrice, p.currency ?? "KES")}
                          </span>
                        ) : null}
                        <ProductBadge product={p} />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {hidden > 0 ? (
            <button
              type="button"
              className="w-full border-t border-border px-2.5 py-2.5 text-xs font-medium text-primary hover:bg-muted/40"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              Show more ({hidden} not shown)
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
