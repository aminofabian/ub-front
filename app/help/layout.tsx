import type { Metadata } from "next";
import type { ReactNode } from "react";

import { HelpShell } from "@/components/help/help-shell";
import { helpHubMetadata } from "@/lib/help/seo";

export const metadata: Metadata = helpHubMetadata();

export default function HelpLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <HelpShell>{children}</HelpShell>;
}
