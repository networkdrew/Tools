import { describe, expect, it, vi } from "vitest";
import {
  measureWatermarkContent,
  renderWatermarkLayer,
  type ImageWatermarkContent,
  type TextWatermarkContent,
} from "./watermarkDraw";
import type { WatermarkLayoutSettings } from "./placements";

function makeMockCtx() {
  return {
    font: "",
    fillStyle: "",
    globalAlpha: 1,
    textAlign: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({
      width: 60,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    })),
  };
}

const textContent: TextWatermarkContent = {
  kind: "text",
  text: "© Example",
  fontFamily: "sans-serif",
  color: "#ffffff",
  bold: false,
  italic: false,
  shadow: false,
  shadowColor: "#000000",
  shadowBlur: 0,
};

const layout: WatermarkLayoutSettings = {
  preset: "center",
  customCenter: { x: 0.5, y: 0.5 },
  paddingFraction: 0.02,
  tileSpacingFraction: 0.08,
  rotationDeg: 0,
};

describe("measureWatermarkContent", () => {
  it("measures text using the canvas font metrics", () => {
    const ctx = makeMockCtx();
    const size = measureWatermarkContent(
      ctx as unknown as CanvasRenderingContext2D,
      textContent,
      1000,
      { scalePercent: 10, opacityPercent: 80 },
    );
    expect(size.width).toBe(60);
    expect(size.height).toBe(10); // ascent + descent
    expect(ctx.font).toContain("100px"); // 10% of 1000
  });

  it("derives image watermark size from aspect ratio", () => {
    const ctx = makeMockCtx();
    const content: ImageWatermarkContent = {
      kind: "image",
      image: {} as CanvasImageSource,
      naturalWidth: 200,
      naturalHeight: 100,
    };
    const size = measureWatermarkContent(
      ctx as unknown as CanvasRenderingContext2D,
      content,
      1000,
      { scalePercent: 20, opacityPercent: 100 },
    );
    expect(size.width).toBe(200);
    expect(size.height).toBe(100);
  });
});

describe("renderWatermarkLayer", () => {
  it("paints once for a single-position preset", () => {
    const ctx = makeMockCtx();
    renderWatermarkLayer(
      ctx as unknown as CanvasRenderingContext2D,
      { width: 1000, height: 600 },
      textContent,
      { scalePercent: 10, opacityPercent: 75 },
      layout,
    );
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
    expect(ctx.globalAlpha).toBeCloseTo(0.75);
  });

  it("paints many times for a tiled preset", () => {
    const ctx = makeMockCtx();
    renderWatermarkLayer(
      ctx as unknown as CanvasRenderingContext2D,
      { width: 1000, height: 600 },
      textContent,
      { scalePercent: 10, opacityPercent: 50 },
      { ...layout, preset: "tiled" },
    );
    expect(ctx.fillText.mock.calls.length).toBeGreaterThan(3);
  });

  it("draws an image watermark via drawImage instead of fillText", () => {
    const ctx = makeMockCtx();
    const content: ImageWatermarkContent = {
      kind: "image",
      image: {} as CanvasImageSource,
      naturalWidth: 200,
      naturalHeight: 200,
    };
    renderWatermarkLayer(
      ctx as unknown as CanvasRenderingContext2D,
      { width: 1000, height: 600 },
      content,
      { scalePercent: 15, opacityPercent: 100 },
      layout,
    );
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
