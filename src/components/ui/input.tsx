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
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-espresso",
          "border-sand placeholder:text-taupe",
          "transition-colors",
          error
            ? "border-clay focus:border-clay"
            : "focus:border-clay",
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
