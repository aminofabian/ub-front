import type { ReactNode } from "react";

import {
  OPERATOR_SURFACE_CLASS,
  OPERATOR_SURFACE_STYLE,
} from "@/lib/operator-surface";

/**
 * Business hub + business admin pages share Oxanium for body and headings.
 */
export default function BusinessSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={OPERATOR_SURFACE_CLASS} style={OPERATOR_SURFACE_STYLE}>
      {children}
    </div>
  );
}
