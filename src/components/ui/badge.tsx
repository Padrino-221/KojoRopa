import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "muted";
type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface text-mocha ring-1 ring-border",
  primary: "bg-clay text-white",
  success: "bg-espresso text-white",
  warning: "bg-gold/10 text-gold ring-1 ring-gold/20",
  danger: "bg-sale/10 text-sale ring-1 ring-sale/20",
  muted: "bg-cream text-taupe",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

function Badge({ variant = "default", size = "sm", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full font-semibold tracking-wide uppercase",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
