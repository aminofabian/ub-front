"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BusinessHubWorkspace } from "@/components/business-hub/business-hub-workspace";
import { BusinessHubSkeleton } from "@/components/business-hub/business-hub-skeleton";
import { APP_ROUTES } from "@/lib/config";

export default function BusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding");

  useEffect(() => {
    if (onboarding === "storefront") {
      router.replace(`${APP_ROUTES.businessSettings}?onboarding=storefront`);
    }
  }, [onboarding, router]);

  if (onboarding === "storefront") {
    return <BusinessHubSkeleton />;
  }

  return <BusinessHubWorkspace />;
}
