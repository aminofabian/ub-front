"use client";

import { useEffect, useState } from "react";

/** True when viewport is Tailwind `md` (768px) or wider. */
export function useMediaMd(): boolean {
  const [isMd, setIsMd] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsMd(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMd;
}
