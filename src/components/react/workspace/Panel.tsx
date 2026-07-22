import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Titled card used to group controls inside a workspace side panel. */
export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div
      className={`border-border bg-bg-elevated flex flex-col gap-3 rounded-md border p-4 ${className}`}
    >
      {title && (
        <h2 className="text-text-muted text-xs font-semibold tracking-wide uppercase">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
