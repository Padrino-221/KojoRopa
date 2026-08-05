import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          "w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-espresso",
          "ring-1 ring-border placeholder:text-taupe",
          "transition-colors resize-none",
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

Textarea.displayName = "Textarea";

export { Textarea, type TextareaProps };
