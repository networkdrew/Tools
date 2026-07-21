import { describe, expect, it } from "vitest";
import {
  EMPTY_MERGE_STATE,
  addSourceGroup,
  flattenPages,
  moveGroup,
  movePageWithinGroup,
  normalizeRotation,
  removeGroup,
  removePage,
  reorderIndex,
  rotatePage,
  totalPageCount,
} from "./pages";

const makePageId = (sourceId: string, i: number) => `${sourceId}:${i}`;

describe("normalizeRotation", () => {
  it("wraps positive and negative degrees into [0, 360)", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(-360)).toBe(0);
  });
});

describe("addSourceGroup", () => {
  it("appends a group with sequential page entries", () => {
    const state = addSourceGroup(EMPTY_MERGE_STATE, "a", 3, makePageId);
    expect(state.groupOrder).toEqual(["a"]);
    expect(state.pagesByGroup["a"]).toEqual([
      { id: "a:0", sourcePageIndex: 0, rotation: 0 },
      { id: "a:1", sourcePageIndex: 1, rotation: 0 },
      { id: "a:2", sourcePageIndex: 2, rotation: 0 },
    ]);
  });

  it("appends subsequent groups after existing ones", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 1, makePageId);
    state = addSourceGroup(state, "b", 2, makePageId);
    expect(state.groupOrder).toEqual(["a", "b"]);
  });
});

describe("moveGroup", () => {
  it("reorders groups", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 1, makePageId);
    state = addSourceGroup(state, "b", 1, makePageId);
    state = addSourceGroup(state, "c", 1, makePageId);

    state = moveGroup(state, "c", 0);
    expect(state.groupOrder).toEqual(["c", "a", "b"]);
  });

  it("is a no-op for an unknown group id", () => {
    const state = addSourceGroup(EMPTY_MERGE_STATE, "a", 1, makePageId);
    expect(moveGroup(state, "missing", 0)).toBe(state);
  });

  it("clamps out-of-range target indices", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 1, makePageId);
    state = addSourceGroup(state, "b", 1, makePageId);
    state = moveGroup(state, "a", 999);
    expect(state.groupOrder).toEqual(["b", "a"]);
  });
});

describe("removeGroup", () => {
  it("removes the group and its pages", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 2, makePageId);
    state = addSourceGroup(state, "b", 1, makePageId);
    state = removeGroup(state, "a");
    expect(state.groupOrder).toEqual(["b"]);
    expect(state.pagesByGroup["a"]).toBeUndefined();
  });

  it("is a no-op for an unknown group id", () => {
    const state = addSourceGroup(EMPTY_MERGE_STATE, "a", 1, makePageId);
    expect(removeGroup(state, "missing")).toBe(state);
  });
});

describe("movePageWithinGroup", () => {
  it("reorders pages inside a group", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 3, makePageId);
    state = movePageWithinGroup(state, "a", "a:2", 0);
    expect(state.pagesByGroup["a"]?.map((p) => p.id)).toEqual([
      "a:2",
      "a:0",
      "a:1",
    ]);
  });

  it("doesn't affect other groups", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 2, makePageId);
    state = addSourceGroup(state, "b", 2, makePageId);
    const before = state.pagesByGroup["b"];
    state = movePageWithinGroup(state, "a", "a:1", 0);
    expect(state.pagesByGroup["b"]).toBe(before);
  });
});

describe("removePage", () => {
  it("removes a single page, preserving the rest in order", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 3, makePageId);
    state = removePage(state, "a", "a:1");
    expect(state.pagesByGroup["a"]?.map((p) => p.id)).toEqual(["a:0", "a:2"]);
  });
});

describe("rotatePage", () => {
  it("accumulates rotation deltas with wraparound", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 1, makePageId);
    state = rotatePage(state, "a", "a:0", 90);
    state = rotatePage(state, "a", "a:0", 90);
    state = rotatePage(state, "a", "a:0", 90);
    state = rotatePage(state, "a", "a:0", 90);
    expect(state.pagesByGroup["a"]?.[0]?.rotation).toBe(0);
  });
});

describe("totalPageCount and flattenPages", () => {
  it("sums pages across all groups", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 2, makePageId);
    state = addSourceGroup(state, "b", 3, makePageId);
    expect(totalPageCount(state)).toBe(5);
  });

  it("flattens in group order, then page order", () => {
    let state = addSourceGroup(EMPTY_MERGE_STATE, "a", 2, makePageId);
    state = addSourceGroup(state, "b", 1, makePageId);
    state = moveGroup(state, "b", 0);
    const flat = flattenPages(state);
    expect(flat.map((f) => f.page.id)).toEqual(["b:0", "a:0", "a:1"]);
    expect(flat.map((f) => f.groupId)).toEqual(["b", "a", "a"]);
  });
});

describe("reorderIndex", () => {
  it("resolves a 'before' drop to the target's index", () => {
    expect(reorderIndex(["a", "b", "c"], "c", "a", "before")).toBe(0);
  });

  it("resolves an 'after' drop to one past the target's index", () => {
    expect(reorderIndex(["a", "b", "c"], "c", "a", "after")).toBe(1);
  });

  it("accounts for the dragged id's own removal when it's earlier in the list", () => {
    expect(reorderIndex(["a", "b", "c"], "a", "c", "after")).toBe(2);
  });

  it("falls back to the end when the target id isn't found", () => {
    expect(reorderIndex(["a", "b"], "a", "missing", "after")).toBe(1);
  });
});
