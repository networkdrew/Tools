import { useEffect, useRef } from "react";
import {
  clamp,
  screenToCanvasPoint,
  toNormalized,
  type Point,
  type Size,
} from "@/lib/tools-logic/image-watermark/geometry";

interface WatermarkOverlayProps {
  centerPx: Point;
  sizePx: Size;
  rotationDeg: number;
  workingSize: Size;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: Point;
  scalePercent: number;
  onMove: (normalizedCenter: Point) => void;
  onResizeScalePercent: (scalePercent: number) => void;
}

type DragState =
  | { mode: "move" }
  | { mode: "resize"; startScalePercent: number; startDist: number };

const MIN_SCALE_PERCENT = 2;
const MAX_SCALE_PERCENT = 95;

/**
 * A draggable/resizable box overlaid on the preview canvas for the currently
 * selected (non-repeating) watermark placement. Lives in the same
 * transformed coordinate space as the canvas (see ImageWatermarkStudioTool),
 * so it tracks zoom/pan automatically via CSS and only needs to convert
 * pointer events back to canvas pixels.
 */
export function WatermarkOverlay({
  centerPx,
  sizePx,
  rotationDeg,
  workingSize,
  containerRef,
  zoom,
  pan,
  scalePercent,
  onMove,
  onResizeScalePercent,
}: WatermarkOverlayProps) {
  const dragRef = useRef<DragState | null>(null);
  const latestRef = useRef({ centerPx, workingSize, zoom, pan });
  latestRef.current = { centerPx, workingSize, zoom, pan };

  useEffect(() => {
    function containerOrigin(): Point {
      const rect = containerRef.current?.getBoundingClientRect();
      return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
    }

    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const {
        centerPx: cp,
        workingSize: ws,
        zoom: z,
        pan: p,
      } = latestRef.current;
      const canvasPoint = screenToCanvasPoint(
        { x: e.clientX, y: e.clientY },
        containerOrigin(),
        z,
        p,
      );
      if (drag.mode === "move") {
        onMove(toNormalized(canvasPoint, ws));
      } else {
        const dist = Math.hypot(canvasPoint.x - cp.x, canvasPoint.y - cp.y);
        const next =
          drag.startScalePercent * (dist / Math.max(1, drag.startDist));
        onResizeScalePercent(clamp(next, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT));
      }
    }

    function handleUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [containerRef, onMove, onResizeScalePercent]);

  function nudge(dx: number, dy: number) {
    const normCenter = toNormalized(centerPx, workingSize);
    onMove({
      x: clamp(normCenter.x + dx, 0, 1),
      y: clamp(normCenter.y + dy, 0, 1),
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Watermark position. Drag to move, or use arrow keys."
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        dragRef.current = { mode: "move" };
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.02 : 0.005;
        if (e.key === "ArrowLeft") nudge(-step, 0);
        else if (e.key === "ArrowRight") nudge(step, 0);
        else if (e.key === "ArrowUp") nudge(0, -step);
        else if (e.key === "ArrowDown") nudge(0, step);
        else return;
        e.preventDefault();
      }}
      style={{
        position: "absolute",
        left: centerPx.x - sizePx.width / 2,
        top: centerPx.y - sizePx.height / 2,
        width: Math.max(sizePx.width, 4),
        height: Math.max(sizePx.height, 4),
        transform: `rotate(${rotationDeg}deg)`,
        touchAction: "none",
      }}
      className="border-accent bg-accent/10 focus-visible:outline-accent cursor-move touch-none rounded-sm border-2 border-dashed select-none focus-visible:outline-2"
    >
      <div
        role="slider"
        aria-label="Resize watermark"
        aria-valuemin={MIN_SCALE_PERCENT}
        aria-valuemax={MAX_SCALE_PERCENT}
        aria-valuenow={Math.round(scalePercent)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          const startDist = Math.hypot(sizePx.width / 2, sizePx.height / 2);
          dragRef.current = {
            mode: "resize",
            startScalePercent: scalePercent,
            startDist,
          };
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            onResizeScalePercent(
              clamp(scalePercent + 1, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT),
            );
            e.preventDefault();
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            onResizeScalePercent(
              clamp(scalePercent - 1, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT),
            );
            e.preventDefault();
          }
        }}
        style={{
          position: "absolute",
          right: -8,
          bottom: -8,
          width: 16,
          height: 16,
          touchAction: "none",
        }}
        className="bg-accent focus-visible:outline-accent cursor-nwse-resize rounded-full border-2 border-white focus-visible:outline-2"
      />
    </div>
  );
}
