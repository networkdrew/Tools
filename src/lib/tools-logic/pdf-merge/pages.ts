/**
 * Pure ordering model for the merge: an ordered list of source-file groups,
 * each holding an ordered list of page entries. Kept as plain data (no
 * pdf-lib objects) so it's cheap to snapshot for undo/redo and to test
 * without ever touching a real PDF.
 */
export interface PdfPageEntry {
  id: string;
  /** 0-based page index in the original source document. */
  sourcePageIndex: number;
  /** Additional rotation on top of the page's original rotation, in degrees. */
  rotation: number;
}

export interface MergeState {
  /** Source file ids, in the order their pages will appear in the output. */
  groupOrder: string[];
  pagesByGroup: Record<string, PdfPageEntry[]>;
}

export const EMPTY_MERGE_STATE: MergeState = {
  groupOrder: [],
  pagesByGroup: {},
};

export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function addSourceGroup(
  state: MergeState,
  sourceId: string,
  pageCount: number,
  makePageId: (sourceId: string, pageIndex: number) => string,
): MergeState {
  const pages: PdfPageEntry[] = Array.from({ length: pageCount }, (_, i) => ({
    id: makePageId(sourceId, i),
    sourcePageIndex: i,
    rotation: 0,
  }));
  return {
    groupOrder: [...state.groupOrder, sourceId],
    pagesByGroup: { ...state.pagesByGroup, [sourceId]: pages },
  };
}

export function moveGroup(
  state: MergeState,
  sourceId: string,
  targetIndex: number,
): MergeState {
  const order = [...state.groupOrder];
  const from = order.indexOf(sourceId);
  if (from === -1) return state;
  order.splice(from, 1);
  const clamped = Math.max(0, Math.min(targetIndex, order.length));
  order.splice(clamped, 0, sourceId);
  return { ...state, groupOrder: order };
}

export function removeGroup(state: MergeState, sourceId: string): MergeState {
  if (!state.groupOrder.includes(sourceId)) return state;
  const pagesByGroup = { ...state.pagesByGroup };
  delete pagesByGroup[sourceId];
  return {
    groupOrder: state.groupOrder.filter((id) => id !== sourceId),
    pagesByGroup,
  };
}

export function movePageWithinGroup(
  state: MergeState,
  groupId: string,
  pageId: string,
  targetIndex: number,
): MergeState {
  const pages = state.pagesByGroup[groupId];
  if (!pages) return state;
  const list = [...pages];
  const from = list.findIndex((p) => p.id === pageId);
  if (from === -1) return state;
  const [item] = list.splice(from, 1) as [PdfPageEntry];
  const clamped = Math.max(0, Math.min(targetIndex, list.length));
  list.splice(clamped, 0, item);
  return { ...state, pagesByGroup: { ...state.pagesByGroup, [groupId]: list } };
}

export function removePage(
  state: MergeState,
  groupId: string,
  pageId: string,
): MergeState {
  const pages = state.pagesByGroup[groupId];
  if (!pages) return state;
  return {
    ...state,
    pagesByGroup: {
      ...state.pagesByGroup,
      [groupId]: pages.filter((p) => p.id !== pageId),
    },
  };
}

export function rotatePage(
  state: MergeState,
  groupId: string,
  pageId: string,
  deltaDegrees: number,
): MergeState {
  const pages = state.pagesByGroup[groupId];
  if (!pages) return state;
  return {
    ...state,
    pagesByGroup: {
      ...state.pagesByGroup,
      [groupId]: pages.map((p) =>
        p.id === pageId
          ? { ...p, rotation: normalizeRotation(p.rotation + deltaDegrees) }
          : p,
      ),
    },
  };
}

export function totalPageCount(state: MergeState): number {
  return state.groupOrder.reduce(
    (sum, id) => sum + (state.pagesByGroup[id]?.length ?? 0),
    0,
  );
}

export interface FlattenedPage {
  groupId: string;
  page: PdfPageEntry;
}

/** The final page order that will be produced by the merge. */
export function flattenPages(state: MergeState): FlattenedPage[] {
  return state.groupOrder.flatMap((groupId) =>
    (state.pagesByGroup[groupId] ?? []).map((page) => ({ groupId, page })),
  );
}

/**
 * Converts a "drop this id before/after that id" gesture (from drag-and-drop
 * or a keyboard move) into the target index `moveGroup`/`movePageWithinGroup`
 * expect, relative to the list with the dragged id already removed.
 */
export function reorderIndex(
  ids: string[],
  draggedId: string,
  targetId: string,
  position: "before" | "after",
): number {
  const withoutDragged = ids.filter((id) => id !== draggedId);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex === -1) return withoutDragged.length;
  return position === "before" ? targetIndex : targetIndex + 1;
}
