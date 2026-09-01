"use client";

import { useCallback, useState } from "react";

import { createAisle, type AisleRecord } from "@/lib/api";
import { labelToAisleCode } from "@/lib/aisle-suggestions";
import { formatMutationError } from "../_utils";

export function useInlineAisleCreate(upsertAisle: (aisle: AisleRecord) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        const message = "Name the shelf zone first.";
        setError(message);
        throw new Error(message);
      }
      const code = labelToAisleCode(trimmed);
      setBusy(true);
      setError("");
      try {
        const created = await createAisle({ name: trimmed, code });
        upsertAisle(created);
        return created;
      } catch (err) {
        setError(formatMutationError(err, "Could not create that shelf zone."));
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [upsertAisle],
  );

  const clearError = useCallback(() => setError(""), []);

  return { create, busy, error, clearError };
}
