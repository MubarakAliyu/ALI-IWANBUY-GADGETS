import type * as React from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/** What a list says when it has nothing to show — always with a way out of the dead end. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-grey-200 bg-grey-50 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="text-grey-500 [&_svg]:size-8">{icon}</div> : null}
      <p className="text-h3 text-brand-navy">{title}</p>
      {description ? <p className="max-w-prose text-body-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
