import { type HTMLAttributes } from "react";

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

function Spinner({ size = "md", className = "", ...props }: SpinnerProps) {
  return (
    <div
      className={["animate-spin rounded-full border-2 border-border border-t-clay", sizeClasses[size], className].join(" ")}
      {...props}
    />
  );
}

export { Spinner, type SpinnerProps };
