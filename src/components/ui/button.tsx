"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-clay text-white hover:bg-clay-deep",
  secondary:
    "bg-surface text-mocha ring-1 ring-border hover:bg-cream/60 hover:text-espresso hover:ring-clay/40",
  ghost:
    "text-mocha hover:bg-cream hover:text-espresso",
  danger:
    "bg-sale/10 text-sale hover:bg-sale/15",
  success:
    "bg-espresso text-white hover:bg-espresso/85",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-sm",
  icon: "h-10 w-10",
  "icon-sm": "h-9 w-9",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200",
          "active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay",
          "disabled:cursor-not-allowed disabled:opacity-40",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps, type Variant, type Size };
