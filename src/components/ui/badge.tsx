import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm",
        secondary:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        destructive:
          "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm",
        outline:
          "border-2 border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
        success:
          "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm",
        warning:
          "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm",
        info:
          "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

