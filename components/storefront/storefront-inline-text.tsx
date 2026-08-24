"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";
import { cn } from "@/lib/utils";

function stripToPlainText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Props = {
  value: string;
  onCommit: (next: string) => void;
  /** Single-line: Enter commits; multiline allows newlines. */
  multiline?: boolean;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  className?: string;
  placeholder?: string;
  /** When false, never becomes editable (parent may still be in edit mode). */
  enabled?: boolean;
  children?: ReactNode;
};

/**
 * Plain-text inline editor for storefront copy.
 * Shopper / edit-off: renders children (or value). Edit mode: contentEditable.
 */
export function StorefrontInlineText({
  value,
  onCommit,
  multiline = false,
  as: Tag = "span",
  className,
  placeholder = "Click to edit",
  enabled = true,
  children,
}: Props) {
  const staff = useStorefrontStaffEditOptional();
  const editMode = Boolean(staff?.editMode && enabled);
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const committedRef = useRef(value);

  useEffect(() => {
    committedRef.current = value;
    if (!editing && ref.current) {
      ref.current.textContent = value || "";
    }
  }, [value, editing]);

  const finish = useCallback(
    (cancel: boolean) => {
      const el = ref.current;
      if (!el) {
        setEditing(false);
        return;
      }
      if (cancel) {
        el.textContent = committedRef.current || "";
        setEditing(false);
        return;
      }
      const next = stripToPlainText(el.innerText ?? el.textContent ?? "");
      el.textContent = next || "";
      setEditing(false);
      if (next !== committedRef.current) {
        committedRef.current = next;
        onCommit(next);
      }
    },
    [onCommit],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
      return;
    }
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
      (e.target as HTMLElement).blur();
    }
  };

  if (!editMode) {
    if (children != null) return <>{children}</>;
    return <Tag className={className}>{value}</Tag>;
  }

  const empty = !(value || "").trim() && !editing;

  return (
    <Tag
      ref={ref as never}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      aria-label={placeholder}
      data-storefront-inline-text=""
      data-placeholder={placeholder}
      className={cn(
        "relative outline-none transition-[box-shadow,background-color]",
        "rounded-sm ring-offset-1",
        "hover:bg-amber-400/10 hover:ring-1 hover:ring-amber-500/35",
        "focus:bg-amber-400/15 focus:ring-2 focus:ring-amber-500/50",
        empty &&
          "min-w-[4rem] before:pointer-events-none before:absolute before:inset-0 before:flex before:items-center before:text-inherit before:opacity-45 before:content-[attr(data-placeholder)]",
        multiline && "whitespace-pre-line",
        className,
      )}
      onFocus={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onBlur={() => finish(false)}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {value}
    </Tag>
  );
}
