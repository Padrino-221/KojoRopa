import { type HTMLAttributes } from "react";

function Divider({ className = "", ...props }: HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={["border-border", className].join(" ")}
      {...props}
    />
  );
}

export { Divider };
