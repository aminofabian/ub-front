import type { ReactNode } from "react";

import {
  OXANIUM_SURFACE_CLASS,
  OXANIUM_SURFACE_STYLE,
} from "@/lib/oxanium-surface";

/**
 * Business hub + business admin pages share Oxanium for body and headings.
 */
export default function BusinessSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={OXANIUM_SURFACE_CLASS} style={OXANIUM_SURFACE_STYLE}>
      {children}
    </div>
  );
}
