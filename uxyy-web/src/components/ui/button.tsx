import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950",
        secondary:
          "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
        danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        ghost:
          "border border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100",
        outline:
          "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 将样式合并到唯一子节点（常与 Radix `asChild` 搭配） */
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      type = "button",
      loading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const mergedClassName = cn(buttonVariants({ variant, size }), className);
    if (asChild) {
      return (
        <Slot className={mergedClassName} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={mergedClassName}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
