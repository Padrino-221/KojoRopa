import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sand-deep bg-cream/50 px-6 py-16 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-3xl">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-espresso">{title}</p>
      {description && <p className="text-xs text-taupe">{description}</p>}
      {action}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
