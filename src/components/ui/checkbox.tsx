"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm text-espresso">
        <input
          ref={ref}
          type="checkbox"
          className={[
            "h-4 w-4 rounded border-border accent-clay",
            "focus:ring-2 focus:ring-clay/20 focus:outline-none",
            className,
          ].join(" ")}
          {...props}
        />
        {label}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
