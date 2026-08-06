import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-sand-deep bg-cream/40 px-6 py-16 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-3xl ring-1 ring-border">
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
