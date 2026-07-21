import { useEffect, useRef } from "react";
import {
  applyHandleDrag,
  moveRect,
  type HandleId,
  type Rect,
  type Size,
} from "@/lib/tools-logic/image-crop/geometry";

interface CropOverlayProps {
  rect: Rect;
  /** The intrinsic (canvas pixel) size the rect's coordinates are measured against. */
  bounds: Size;
  /** Locked width/height ratio, or null to resize freely. */
  aspect: number | null;
  /** Wraps the preview canvas at the same on-screen box as `bounds`, used to convert pointer client coordinates to canvas-intrinsic pixels. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  onChange: (rect: Rect) => void;
  /**
   * Fired once when a drag or key-driven edit finishes, for committing to
   * undo history. Takes the final rect explicitly rather than relying on the
   * caller to read it back from state — the state update scheduled by the
   * `onChange` call just before this is not guaranteed to have flushed yet.
   */
  onCommit: (rect: Rect) => void;
}

type DragTarget = HandleId | "move";

const MIN_SIZE = 16;

const HANDLES: {
  id: HandleId;
  label: string;
  cursor: string;
  style: React.CSSProperties;
}[] = [
  {
    id: "nw",
    label: "top left",
    cursor: "cursor-nwse-resize",
    style: { left: -6, top: -6 },
  },
  {
    id: "n",
    label: "top",
    cursor: "cursor-ns-resize",
    style: { left: "50%", top: -6, transform: "translateX(-50%)" },
  },
  {
    id: "ne",
    label: "top right",
    cursor: "cursor-nesw-resize",
    style: { right: -6, top: -6 },
  },
  {
    id: "e",
    label: "right",
    cursor: "cursor-ew-resize",
    style: { right: -6, top: "50%", transform: "translateY(-50%)" },
  },
  {
    id: "se",
    label: "bottom right",
    cursor: "cursor-nwse-resize",
    style: { right: -6, bottom: -6 },
  },
  {
    id: "s",
    label: "bottom",
    cursor: "cursor-ns-resize",
    style: { left: "50%", bottom: -6, transform: "translateX(-50%)" },
  },
  {
    id: "sw",
    label: "bottom left",
    cursor: "cursor-nesw-resize",
    style: { left: -6, bottom: -6 },
  },
  {
    id: "w",
    label: "left",
    cursor: "cursor-ew-resize",
    style: { left: -6, top: "50%", transform: "translateY(-50%)" },
  },
];

/** A draggable, resizable crop rectangle overlaid on the preview canvas, with pointer, touch, and keyboard support. */
export function CropOverlay({
  rect,
  bounds,
  aspect,
  containerRef,
  onChange,
  onCommit,
}: CropOverlayProps) {
  const dragRef = useRef<{
    target: DragTarget;
    startClientX: number;
    startClientY: number;
    startRect: Rect;
  } | null>(null);
  const latest = useRef({ rect, bounds, aspect });
  latest.current = { rect, bounds, aspect };
  // Mirrors `rect` on every render, then gets overwritten with the live
  // dragged value during an actual drag — so a plain click that starts and
  // ends a "drag" with no pointermove in between (no movement at all)
  // commits the current rect unchanged instead of some earlier stale value.
  const lastComputedRect = useRef(rect);
  lastComputedRect.current = rect;
  const moved = useRef(false);

  useEffect(() => {
    function clientDeltaToCanvasDelta(clientDx: number, clientDy: number) {
      const el = containerRef.current;
      const domRect = el?.getBoundingClientRect();
      const { bounds: b } = latest.current;
      const scaleX = domRect && domRect.width > 0 ? b.width / domRect.width : 1;
      const scaleY =
        domRect && domRect.height > 0 ? b.height / domRect.height : 1;
      return { dx: clientDx * scaleX, dy: clientDy * scaleY };
    }

    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const { bounds: b, aspect: a } = latest.current;
      const { dx, dy } = clientDeltaToCanvasDelta(
        e.clientX - drag.startClientX,
        e.clientY - drag.startClientY,
      );
      const next =
        drag.target === "move"
          ? moveRect(drag.startRect, dx, dy, b)
          : applyHandleDrag(drag.startRect, drag.target, dx, dy, b, {
              minSize: MIN_SIZE,
              aspect: a,
            });
      lastComputedRect.current = next;
      moved.current = true;
      onChange(next);
    }

    function handleUp() {
      // A plain click (no pointermove in between) shouldn't commit a no-op
      // history entry — only an actual drag does.
      if (dragRef.current && moved.current) onCommit(lastComputedRect.current);
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [containerRef, onChange, onCommit]);

  function startDrag(e: React.PointerEvent, target: DragTarget) {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    // preventDefault above blocks the browser's default focus-on-pointerdown
    // behavior for this non-form, tabindex-only element, so it's requested
    // explicitly — otherwise a mouse drag leaves the box unfocused and
    // immediate follow-up arrow-key nudging silently does nothing.
    el.focus();
    moved.current = false;
    dragRef.current = {
      target,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: latest.current.rect,
    };
  }

  function stepFromEvent(
    e: React.KeyboardEvent,
  ): { dx: number; dy: number } | null {
    const step = e.shiftKey ? 20 : 4;
    if (e.key === "ArrowLeft") return { dx: -step, dy: 0 };
    if (e.key === "ArrowRight") return { dx: step, dy: 0 };
    if (e.key === "ArrowUp") return { dx: 0, dy: -step };
    if (e.key === "ArrowDown") return { dx: 0, dy: step };
    return null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Crop area. Drag to move, or use arrow keys to nudge it."
      onPointerDown={(e) => startDrag(e, "move")}
      onKeyDown={(e) => {
        const step = stepFromEvent(e);
        if (!step) return;
        const next = moveRect(rect, step.dx, step.dy, bounds);
        onChange(next);
        onCommit(next);
        e.preventDefault();
      }}
      style={{
        // Percentages (rather than intrinsic canvas pixels) so the box stays
        // aligned with the canvas regardless of its responsive on-screen
        // size — pointer math still resolves through getBoundingClientRect.
        position: "absolute",
        left: `${(rect.x / bounds.width) * 100}%`,
        top: `${(rect.y / bounds.height) * 100}%`,
        width: `${(Math.max(rect.width, 1) / bounds.width) * 100}%`,
        height: `${(Math.max(rect.height, 1) / bounds.height) * 100}%`,
        touchAction: "none",
      }}
      className="border-accent bg-accent/10 focus-visible:outline-accent cursor-move touch-none border-2 border-dashed select-none focus-visible:outline-2"
    >
      {HANDLES.map((handle) => (
        <div
          key={handle.id}
          role="slider"
          aria-label={`Resize crop area from the ${handle.label}`}
          aria-valuemin={MIN_SIZE}
          aria-valuenow={Math.round(rect.width)}
          tabIndex={0}
          onPointerDown={(e) => startDrag(e, handle.id)}
          onKeyDown={(e) => {
            const step = stepFromEvent(e);
            if (!step) return;
            const next = applyHandleDrag(
              rect,
              handle.id,
              step.dx,
              step.dy,
              bounds,
              { minSize: MIN_SIZE, aspect },
            );
            onChange(next);
            onCommit(next);
            e.preventDefault();
          }}
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            touchAction: "none",
            ...handle.style,
          }}
          className={`bg-accent focus-visible:outline-accent rounded-full border-2 border-white ${handle.cursor}`}
        />
      ))}
    </div>
  );
}
