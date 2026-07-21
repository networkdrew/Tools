import type { PdfPageEntry } from "@/lib/tools-logic/pdf-merge/pages";
import { reorderIndex } from "@/lib/tools-logic/pdf-merge/pages";
import { formatBytes } from "@/lib/tools-logic/pdf-merge/file";
import { buttonGhost } from "@/components/react/styles";
import { useDragReorder } from "./useDragReorder";
import { PageRow } from "./PageRow";

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  style: React.CSSProperties;
}

export interface GroupRowSource {
  id: string;
  name: string;
  size: number;
  pageCount: number;
}

interface GroupRowProps {
  source: GroupRowSource;
  pages: PdfPageEntry[];
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  isDragging: boolean;
  dropIndicator: "before" | "after" | null;
  registerRow: (el: HTMLElement | null) => void;
  dragHandleProps: DragHandleProps;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onMovePage: (pageId: string, targetIndex: number) => void;
  onRemovePage: (pageId: string) => void;
  onRotatePage: (pageId: string, delta: number) => void;
}

export function GroupRow({
  source,
  pages,
  isFirst,
  isLast,
  expanded,
  isDragging,
  dropIndicator,
  registerRow,
  dragHandleProps,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onRemove,
  onMovePage,
  onRemovePage,
  onRotatePage,
}: GroupRowProps) {
  const pageIds = pages.map((p) => p.id);
  const pageDrag = useDragReorder(pageIds, (draggedId, targetId, position) => {
    onMovePage(draggedId, reorderIndex(pageIds, draggedId, targetId, position));
  });

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
      className={`border-border-strong bg-bg-elevated flex flex-col gap-2 rounded-md border p-3 ${
        isDragging ? "opacity-40" : ""
      } ${dropIndicator === "before" ? "border-t-accent border-t-2" : ""} ${
        dropIndicator === "after" ? "border-b-accent border-b-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          {...dragHandleProps}
          role="button"
          tabIndex={0}
          aria-label={`Drag to reorder file ${source.name}. Arrow keys also move it.`}
          onKeyDown={handleHandleKeyDown}
          className="text-text-muted cursor-grab px-1 select-none"
        >
          ⠿
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className={buttonGhost}
        >
          {expanded ? "Hide pages" : "Show pages"}
        </button>
        <span className="text-text flex-1 truncate font-medium">
          {source.name}
        </span>
        <span className="text-text-muted">
          {formatBytes(source.size)} · {pages.length} page
          {pages.length === 1 ? "" : "s"}
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
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove file ${source.name}`}
          className={buttonGhost}
        >
          Remove
        </button>
      </div>

      {expanded && (
        <ul className="flex flex-col gap-1.5 pl-6">
          {pages.map((page, index) => (
            <PageRow
              key={page.id}
              page={page}
              displayIndex={page.sourcePageIndex + 1}
              isFirst={index === 0}
              isLast={index === pages.length - 1}
              isDragging={pageDrag.dragState.draggingId === page.id}
              dropIndicator={
                pageDrag.dragState.overId === page.id
                  ? pageDrag.dragState.overPosition
                  : null
              }
              registerRow={(el) => pageDrag.registerRow(page.id, el)}
              dragHandleProps={pageDrag.handleProps(page.id)}
              onMoveUp={() => onMovePage(page.id, index - 1)}
              onMoveDown={() => onMovePage(page.id, index + 1)}
              onRotateLeft={() => onRotatePage(page.id, -90)}
              onRotateRight={() => onRotatePage(page.id, 90)}
              onRemove={() => onRemovePage(page.id)}
            />
          ))}
          {pages.length === 0 && (
            <li className="text-text-muted text-sm italic">
              No pages left in this file.
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
