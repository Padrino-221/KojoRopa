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
          "border border-sand",
          "transition-colors",
          error
            ? "border-sale focus:border-sale focus:ring-2 focus:ring-sale/15"
            : "focus:border-clay focus:ring-2 focus:ring-clay/15",
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
