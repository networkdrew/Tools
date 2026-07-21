import type { PdfPageEntry } from "@/lib/tools-logic/pdf-merge/pages";
import { buttonGhost } from "@/components/react/styles";

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  style: React.CSSProperties;
}

interface PageRowProps {
  page: PdfPageEntry;
  displayIndex: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  dropIndicator: "before" | "after" | null;
  registerRow: (el: HTMLElement | null) => void;
  dragHandleProps: DragHandleProps;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onRemove: () => void;
}

export function PageRow({
  page,
  displayIndex,
  isFirst,
  isLast,
  isDragging,
  dropIndicator,
  registerRow,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
  onRotateLeft,
  onRotateRight,
  onRemove,
}: PageRowProps) {
  function handleHandleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isFirst) onMoveUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isLast) onMoveDown();
    }
  }

  return (
    <li
      ref={registerRow}
      className={`border-border bg-bg flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        isDragging ? "opacity-40" : ""
      } ${dropIndicator === "before" ? "border-t-accent border-t-2" : ""} ${
        dropIndicator === "after" ? "border-b-accent border-b-2" : ""
      }`}
    >
      <span
        {...dragHandleProps}
        role="button"
        tabIndex={0}
        aria-label={`Drag to reorder page ${displayIndex}. Arrow keys also move it.`}
        onKeyDown={handleHandleKeyDown}
        className="text-text-muted cursor-grab px-1 select-none"
      >
        ⠿
      </span>
      <span className="flex-1">
        Page {displayIndex}
        {page.rotation !== 0 && (
          <span className="text-text-muted"> · rotated {page.rotation}°</span>
        )}
      </span>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={isFirst}
        className={buttonGhost}
      >
        Move up
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={isLast}
        className={buttonGhost}
      >
        Move down
      </button>
      <button type="button" onClick={onRotateLeft} className={buttonGhost}>
        Rotate left
      </button>
      <button type="button" onClick={onRotateRight} className={buttonGhost}>
        Rotate right
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove page ${displayIndex}`}
        className={buttonGhost}
      >
        Remove
      </button>
    </li>
  );
}
