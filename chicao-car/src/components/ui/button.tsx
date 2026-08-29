"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        primary: "bg-amber-brand text-ink-950 hover:bg-amber-soft active:bg-amber-deep",
        secondary: "bg-ink-800 text-fog-100 hover:bg-ink-700 border border-ink-700",
        outline: "border border-ink-600 text-fog-200 hover:bg-ink-800 hover:text-fog-100",
        ghost: "text-fog-300 hover:bg-ink-800 hover:text-fog-100",
        danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
        success: "bg-ok/15 text-ok border border-ok/40 hover:bg-ok/25",
        link: "text-amber-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-10 px-4 [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, loading, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" />
          {!asChild && children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { buttonVariants };
