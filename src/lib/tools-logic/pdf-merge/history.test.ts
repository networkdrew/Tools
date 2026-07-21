import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  undo,
} from "./history";

describe("history stack", () => {
  it("starts with no undo/redo available", () => {
    const h = createHistory(0);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(0);
  });

  it("undo restores the previous present and enables redo", () => {
    let h = createHistory(0);
    h = pushHistory(h, 1);
    h = pushHistory(h, 2);
    expect(h.present).toBe(2);

    h = undo(h);
    expect(h.present).toBe(1);
    expect(canRedo(h)).toBe(true);

    h = undo(h);
    expect(h.present).toBe(0);
    expect(canUndo(h)).toBe(false);
  });

  it("redo replays an undone value", () => {
    let h = createHistory("a");
    h = pushHistory(h, "b");
    h = undo(h);
    expect(h.present).toBe("a");
    h = redo(h);
    expect(h.present).toBe("b");
    expect(canRedo(h)).toBe(false);
  });

  it("pushing a new value after undo discards the redo branch", () => {
    let h = createHistory(0);
    h = pushHistory(h, 1);
    h = undo(h);
    h = pushHistory(h, 2);
    expect(h.present).toBe(2);
    expect(canRedo(h)).toBe(false);
  });

  it("undo/redo are no-ops at the boundaries", () => {
    let h = createHistory(0);
    expect(undo(h)).toBe(h);
    h = pushHistory(h, 1);
    expect(redo(h)).toBe(h);
  });

  it("bounds memory by dropping the oldest past entries past the limit", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 5; i++) h = pushHistory(h, i, 3);
    expect(h.past.length).toBe(3);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h.present).toBe(5);
  });
});
