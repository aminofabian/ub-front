"use client";

import { useEffect, useState } from "react";

/** True when viewport is Tailwind `xl` (1280px) or wider. */
export function useMediaXl(): boolean {
  const [isXl, setIsXl] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsXl(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isXl;
}
