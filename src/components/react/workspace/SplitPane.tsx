import type { ReactNode } from "react";

interface SplitPaneProps {
  /** Main working area — editor, canvas, or file list. Grows to fill space. */
  main: ReactNode;
  /** Settings, actions, or result panel. Fixed width on desktop, stacks below on mobile. */
  side: ReactNode;
  /** Puts `side` before `main` in source/visual order (e.g. settings-first forms). */
  sideFirst?: boolean;
  /** Tailwind width class for the side panel on md+ screens. */
  sideWidthClassName?: string;
}

/**
 * Two-region workspace: a flexible main area plus a fixed-width side panel
 * on desktop that stacks underneath on narrow viewports. Used for
 * editor+preview, canvas+settings, and file-list+actions layouts.
 */
export function SplitPane({
  main,
  side,
  sideFirst = false,
  sideWidthClassName = "md:w-80",
}: SplitPaneProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
      {sideFirst && (
        <div
          className={`flex min-w-0 flex-col gap-4 ${sideWidthClassName} md:shrink-0`}
        >
          {side}
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">{main}</div>
      {!sideFirst && (
        <div
          className={`flex min-w-0 flex-col gap-4 ${sideWidthClassName} md:shrink-0 md:overflow-y-auto`}
        >
          {side}
        </div>
      )}
    </div>
  );
}
