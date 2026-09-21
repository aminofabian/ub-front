"use client";

import { useEffect, useState } from "react";

import {
  FORM_DRAWER_OPEN_EVENT,
  isFormDrawerOpen,
} from "@/lib/chrome-fabs";

/** True while any FormDrawer is open — hide floating chrome so Save/Cancel stay clickable. */
export function useChromeFabSuppressed(): boolean {
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    setSuppressed(isFormDrawerOpen());
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setSuppressed(Boolean(detail));
    };
    window.addEventListener(FORM_DRAWER_OPEN_EVENT, onChange);
    return () => window.removeEventListener(FORM_DRAWER_OPEN_EVENT, onChange);
  }, []);

  return suppressed;
}
