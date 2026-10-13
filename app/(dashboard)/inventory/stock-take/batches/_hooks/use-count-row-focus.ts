"use client";

import { useCallback, useRef } from "react";

export type CountRowFocus = {
  register: (lineId: string) => (input: HTMLInputElement | null) => void;
  focusAfter: (lineId: string, orderedLineIds: string[]) => void;
};

/** Lets Enter on one count jump straight to the next product's box. */
export function useCountRowFocus(): CountRowFocus {
  const inputs = useRef(new Map<string, HTMLInputElement>());

  const register = useCallback(
    (lineId: string) => (input: HTMLInputElement | null) => {
      if (input) inputs.current.set(lineId, input);
      else inputs.current.delete(lineId);
    },
    [],
  );

  const focusAfter = useCallback((lineId: string, orderedLineIds: string[]) => {
    const nextId = orderedLineIds[orderedLineIds.indexOf(lineId) + 1];
    const next = nextId ? inputs.current.get(nextId) : undefined;
    if (!next) {
      inputs.current.get(lineId)?.blur();
      return;
    }
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  return { register, focusAfter };
}
