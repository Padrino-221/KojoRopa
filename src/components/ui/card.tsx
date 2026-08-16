import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

function Card({ padding = "md", className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl bg-surface",
        paddingClasses[padding],
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["mb-4 flex items-center justify-between", className].join(" ")}
      {...props}
    />
  );
}

function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={["font-display text-lg font-semibold text-espresso", className].join(" ")}
      {...props}
    />
  );
}

function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}

function CardFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["mt-4 flex items-center gap-2", className].join(" ")}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter, type CardProps };
