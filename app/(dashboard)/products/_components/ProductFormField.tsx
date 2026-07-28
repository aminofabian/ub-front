"use client";

import { cn } from "@/lib/utils";
import {
  productFormFieldClass,
  productFormHintClass,
  productFormLabelClass,
  productFormRequiredClass,
} from "./product-form-styles";

type Props = {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function ProductFormField({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: Props) {
  return (
    <label htmlFor={htmlFor} className={cn(productFormFieldClass, className)}>
      <span className={productFormLabelClass}>
        {label}
        {required ? (
          <span className={productFormRequiredClass} aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      {hint ? <span className={productFormHintClass}>{hint}</span> : null}
      {children}
    </label>
  );
}
