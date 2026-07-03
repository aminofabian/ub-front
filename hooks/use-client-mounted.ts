"use client";

import { useEffect, useState } from "react";

/** True after the first client paint — use to gate session/bootstrap-only UI during hydration. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
