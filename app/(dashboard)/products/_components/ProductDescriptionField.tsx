"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateProductDescription } from "@/lib/catalog-description-api";
import { cn } from "@/lib/utils";

import { productFormFieldClass, productFormTextareaClass } from "./product-form-styles";
import { formatMutationError } from "../_utils";

export type ProductDescriptionContext = {
  name: string;
  categoryName?: string;
  brand?: string;
  size?: string;
  unitType?: string;
  variantName?: string;
  sku?: string;
  barcode?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  context: ProductDescriptionContext;
  onError?: (message: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
};

export function ProductDescriptionField({
  value,
  onChange,
  context,
  onError,
  rows = 3,
  placeholder = "Optional",
  className,
  textareaClassName,
}: Props) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const name = context.name.trim();
    if (!name) {
      onError?.("Enter a product name before generating a description.");
      return;
    }
    setGenerating(true);
    try {
      const { description } = await generateProductDescription({
        name,
        categoryName: context.categoryName?.trim() || undefined,
        brand: context.brand?.trim() || undefined,
        size: context.size?.trim() || undefined,
        unitType: context.unitType?.trim() || undefined,
        variantName: context.variantName?.trim() || undefined,
        sku: context.sku?.trim() || undefined,
        barcode: context.barcode?.trim() || undefined,
      });
      onChange(description);
    } catch (e) {
      onError?.(
        formatMutationError(e, "Could not generate description. Try again."),
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={cn(productFormFieldClass, className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Description
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 gap-1.5 px-2 text-[11px] shadow-sm"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5 text-primary" aria-hidden />
          )}
          {generating ? "Generating…" : "Generate with AI"}
        </Button>
      </div>
      <textarea
        className={cn(productFormTextareaClass, textareaClassName)}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
