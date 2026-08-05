import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={[
          "w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-espresso",
          "ring-1 ring-border",
          "transition-colors",
          error
            ? "ring-sale focus:ring-sale/30"
            : "focus:border-clay focus:ring-2 focus:ring-clay/20",
          "focus:outline-none",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export { Select, type SelectProps };
