"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";

import { todayYmdLocal } from "@/lib/ymd-date";
import { cn } from "@/lib/utils";

/** @deprecated Native input styling — prefer {@link YmdDatePicker}. */
export const ymdDateInputClass = cn(
  "h-8 w-full min-w-0 rounded-none border border-border bg-background px-2 text-sm tabular-nums",
  "shadow-none transition-[border-color,box-shadow] duration-150",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-foreground/30",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "[color-scheme:light] dark:[color-scheme:dark]",
  "[&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:size-3",
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-55",
  "hover:[&::-webkit-calendar-picker-indicator]:opacity-80",
);

export function todayYmd(): string {
  return todayYmdLocal();
}

export function useYmdInput(initial = "") {
  const [value, setValue] = useState(initial);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const inputProps = useMemo(
    () =>
      ({
        type: "date",
        value,
        onChange,
      }) satisfies Pick<
        InputHTMLAttributes<HTMLInputElement>,
        "type" | "value" | "onChange"
      >,
    [value, onChange],
  );

  return { value, setValue, onChange, inputProps };
}

export function ymdInputProps({
  value,
  onValueChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}): InputHTMLAttributes<HTMLInputElement> {
  return {
    type: "date",
    value,
    disabled,
    "aria-label": ariaLabel,
    className: cn(ymdDateInputClass, className),
    onChange: (event) => onValueChange(event.target.value),
  };
}
