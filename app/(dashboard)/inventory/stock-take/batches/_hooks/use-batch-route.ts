"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const COUNT_PARAM = "count";
const REVIEW_PARAM = "review";

export type BatchRoute = {
  countingId: string | null;
  reviewingId: string | null;
  openCounting: (sessionId: string) => void;
  openReview: (sessionId: string) => void;
  backHome: () => void;
};

/** Which screen is up lives in the URL, so a refresh or back gesture lands in place. */
export function useBatchRoute(): BatchRoute {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = useCallback(
    (key: string | null, sessionId?: string) => {
      const query = key && sessionId ? `?${key}=${encodeURIComponent(sessionId)}` : "";
      router.push(`${pathname}${query}`, { scroll: true });
    },
    [pathname, router],
  );

  const openCounting = useCallback((id: string) => go(COUNT_PARAM, id), [go]);
  const openReview = useCallback((id: string) => go(REVIEW_PARAM, id), [go]);
  const backHome = useCallback(() => go(null), [go]);

  return {
    countingId: params.get(COUNT_PARAM),
    reviewingId: params.get(REVIEW_PARAM),
    openCounting,
    openReview,
    backHome,
  };
}
