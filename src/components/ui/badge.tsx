import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-authority-900 text-white hover:bg-authority-800",
        secondary: "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive: "border-red-300 bg-red-50 text-red-700",
        scam: "border-red-500 bg-red-600 text-white shadow-sm",
        caution: "border-amber-400 bg-amber-500 text-white shadow-sm",
        verified: "border-emerald-500 bg-emerald-600 text-white shadow-sm",
        outline: "text-slate-800 border-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
