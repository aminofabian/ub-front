"use client";

import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import { useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";

/**
 * One editable line of Mizu Springs copy. Shoppers see plain text. Staff in
 * edit mode click it, type, and the change is staged as a theme option.
 * Clearing the text brings back the stock wording; a single dash hides it.
 */
export function MizuText({
  field,
  value,
  as = "span",
  className,
  multiline,
  label,
}: {
  field: string;
  value: string;
  as?: "span" | "p" | "h2" | "h3";
  className?: string;
  multiline?: boolean;
  /** Shown as the placeholder when the line is hidden. */
  label?: string;
}) {
  const staff = useStorefrontStaffEditOptional();
  const editing = Boolean(staff?.editMode);
  if (!editing && !value) return null;

  const text = (
    <StorefrontInlineText
      as={as}
      className={className}
      value={value}
      multiline={multiline}
      placeholder={label ? `Add ${label}` : "Click to edit"}
      onCommit={(next) => {
        void staff?.patchThemeOption(field, next, "mizu-springs");
      }}
    />
  );
  if (!editing || as !== "span") return text;
  // Inside links and buttons: let the click place the caret, not navigate.
  return (
    <span onClickCapture={(e) => e.preventDefault()} style={{ display: "contents" }}>
      {text}
    </span>
  );
}
