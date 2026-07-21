import { useCallback, useMemo, useRef, useState } from "react";

export interface DragReorderState {
  draggingId: string | null;
  overId: string | null;
  overPosition: "before" | "after" | null;
}

const IDLE_STATE: DragReorderState = {
  draggingId: null,
  overId: null,
  overPosition: null,
};

/**
 * Pointer-based (mouse + touch + pen, unified) reordering for a flat list of
 * ids. Deliberately not native HTML5 drag-and-drop: that API has no real
 * touch support, which this tool needs for the mobile page/file lists.
 *
 * `ids` must be the current rendered order. `onReorder` receives the id being
 * moved and the id/position it was dropped relative to.
 */
export function useDragReorder(
  ids: string[],
  onReorder: (
    draggedId: string,
    targetId: string,
    position: "before" | "after",
  ) => void,
) {
  const [state, setState] = useState<DragReorderState>(IDLE_STATE);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const draggingIdRef = useRef<string | null>(null);

  const registerRow = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(id, el);
    else elementsRef.current.delete(id);
  }, []);

  const findTarget = useCallback(
    (clientY: number): { id: string; position: "before" | "after" } | null => {
      let best: { id: string; position: "before" | "after" } | null = null;
      let bestDistance = Infinity;
      for (const id of ids) {
        if (id === draggingIdRef.current) continue;
        const el = elementsRef.current.get(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const distance = Math.abs(clientY - mid);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { id, position: clientY < mid ? "before" : "after" };
        }
      }
      return best;
    },
    [ids],
  );

  const handlePointerDown = useCallback(
    (id: string) => (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse")
        return;
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingIdRef.current = id;
      setState({ draggingId: id, overId: null, overPosition: null });
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!draggingIdRef.current) return;
      e.preventDefault();
      const target = findTarget(e.clientY);
      setState({
        draggingId: draggingIdRef.current,
        overId: target?.id ?? null,
        overPosition: target?.position ?? null,
      });
    },
    [findTarget],
  );

  const finishDrag = useCallback(() => {
    const draggedId = draggingIdRef.current;
    const target = state.overId;
    const position = state.overPosition;
    draggingIdRef.current = null;
    setState(IDLE_STATE);
    if (draggedId && target && position && target !== draggedId) {
      onReorder(draggedId, target, position);
    }
  }, [state.overId, state.overPosition, onReorder]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      finishDrag();
    },
    [finishDrag],
  );

  const handlePointerCancel = useCallback(() => {
    draggingIdRef.current = null;
    setState(IDLE_STATE);
  }, []);

  return useMemo(
    () => ({
      dragState: state,
      registerRow,
      handleProps: (id: string) => ({
        onPointerDown: handlePointerDown(id),
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerCancel,
        style: { touchAction: "none" as const },
      }),
    }),
    [
      state,
      registerRow,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
    ],
  );
}
