"use client";

import { useCallback, useState } from "react";

import { createCategory, type CategoryRecord } from "@/lib/api";
import { formatMutationError } from "../_utils";

export function useInlineCategoryCreate(
  upsertCategory: (category: CategoryRecord) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        const message = "Name the category first.";
        setError(message);
        throw new Error(message);
      }
      setBusy(true);
      setError("");
      try {
        const created = await createCategory({ name: trimmed });
        upsertCategory(created);
        return created;
      } catch (err) {
        setError(formatMutationError(err, "Could not create that category."));
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [upsertCategory],
  );

  const clearError = useCallback(() => setError(""), []);

  return { create, busy, error, clearError };
}
