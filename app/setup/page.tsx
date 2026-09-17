"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DesktopSetupWizard } from "@/components/desktop/desktop-setup-wizard";
import { IS_DESKTOP } from "@/lib/runtime";

/**
 * First-run setup for the desktop SKU — find an online shop or start fresh.
 * UI lives in {@link DesktopSetupWizard}.
 */
export default function DesktopSetupPage() {
  const router = useRouter();

  useEffect(() => {
    if (!IS_DESKTOP) {
      router.replace("/");
    }
  }, [router]);

  if (!IS_DESKTOP) {
    return null;
  }

  return <DesktopSetupWizard />;
}
