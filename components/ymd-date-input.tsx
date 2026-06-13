"use client";

import {
  YmdDatePicker,
  type YmdDatePickerProps,
} from "@/components/ymd-date-picker";

export type YmdDateInputProps = YmdDatePickerProps;

export function YmdDateInput(props: YmdDateInputProps) {
  return <YmdDatePicker {...props} />;
}

export { YmdDatePicker };
