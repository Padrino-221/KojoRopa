import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          "w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-espresso",
          "ring-1 ring-border placeholder:text-taupe",
          "transition-colors",
          error
            ? "ring-sale focus:ring-sale/30"
            : "focus:border-clay focus:ring-2 focus:ring-clay/20",
          "focus:outline-none",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input, type InputProps };
