"use client";

import { Boxes } from "lucide-react";
import { useEffect, useState } from "react";

import { BusinessFormatsEditor } from "@/components/business/business-formats-editor";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { fetchBusinessTypes } from "@/lib/business-types-api";
import { APP_ROUTES } from "@/lib/config";

/**
 * Add, remove or change the shop formats this business runs — a restaurant that also opens a bar,
 * lets rooms, or starts a shop. The tools each format unlocks follow from the set, so turning one on
 * makes its screens appear. Managing settings only.
 */
export default function BusinessFormatsPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [typeImages, setTypeImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void fetchBusinessTypes()
      .then((catalog) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const t of catalog) if (t.imageUrl) map[t.code] = t.imageUrl;
        setTypeImages(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Business formats"
        description="You need permission to manage the shop's settings to change its formats."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero
        icon={Boxes}
        title="Business formats"
        description="What this business runs. Add a bar, rooms, a shop and more — the tools for each one appear on their own. A format in use can't be turned off until its work is cleared."
      />
      <div className="mt-4">
        <BusinessFormatsEditor typeImages={typeImages} />
      </div>
    </div>
  );
}
