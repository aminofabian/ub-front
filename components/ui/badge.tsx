import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/12 text-primary dark:bg-primary/20 dark:text-primary-foreground/95",
        secondary:
          "border-transparent bg-muted text-muted-foreground",
        outline: "border-border/80 text-foreground",
        success:
          "border-transparent bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-500/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
