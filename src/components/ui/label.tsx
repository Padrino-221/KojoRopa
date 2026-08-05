import { type LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

function Label({ required, className = "", children, ...props }: LabelProps) {
  return (
    <label
      className={[
        "mb-1.5 block text-[11px] font-semibold tracking-wide uppercase text-mocha",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-clay">*</span>}
    </label>
  );
}

export { Label, type LabelProps };
