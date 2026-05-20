import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm outline-none transition-[border-color,box-shadow]",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
