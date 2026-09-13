"use client";

import { useEffect, useState } from "react";

/** True when viewport is Tailwind `xl` (1280px) or wider. */
export function useMediaXl(): boolean {
  // Lazy-init from the live query so the first paint already knows the
  // breakpoint — otherwise xl+ screens flash with the category track zeroed.
  const [isXl, setIsXl] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(min-width: 1280px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsXl(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isXl;
}
