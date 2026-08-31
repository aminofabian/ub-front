"use client";

import { useCallback, useState } from "react";

import { createItemType, type ItemTypeRecord } from "@/lib/api";
import { labelToItemTypeKey } from "@/lib/item-type-suggestions";
import { formatMutationError } from "../_utils";

export function useInlineItemTypeCreate(
  upsertItemType: (itemType: ItemTypeRecord) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        const message = "Name the department first.";
        setError(message);
        throw new Error(message);
      }
      const key = labelToItemTypeKey(trimmed) || "dept";
      setBusy(true);
      setError("");
      try {
        const created = await createItemType({ key, label: trimmed });
        upsertItemType(created);
        return created;
      } catch (err) {
        setError(formatMutationError(err, "Could not create that department."));
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [upsertItemType],
  );

  const clearError = useCallback(() => setError(""), []);

  return { create, busy, error, clearError };
}
