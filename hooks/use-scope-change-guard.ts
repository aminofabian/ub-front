"use client";

import { useEffect, useRef } from "react";

import { registerScopeGuard } from "@/lib/scope-change-guard";

/**
 * Register a guard that prompts before the header branch or department changes
 * while `active` is true (D6).
 */
export function useScopeChangeGuard(
  id: string,
  active: boolean,
  message: string,
): void {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    return registerScopeGuard({
      id,
      message,
      isActive: () => activeRef.current,
    });
  }, [id, message]);
}
