import { toPixels, type Size } from "./geometry";
import { resolvePlacements, type WatermarkLayoutSettings } from "./placements";

export interface TextWatermarkContent {
  kind: "text";
  text: string;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
}

export interface ImageWatermarkContent {
  kind: "image";
  image: CanvasImageSource;
  naturalWidth: number;
  naturalHeight: number;
}

export type WatermarkContent = TextWatermarkContent | ImageWatermarkContent;

export interface WatermarkStyle {
  /** Size of the watermark, as a percentage of the canvas width. */
  scalePercent: number;
  opacityPercent: number;
}

function buildFont(content: TextWatermarkContent, fontSizePx: number): string {
  const style = content.italic ? "italic" : "normal";
  const weight = content.bold ? "bold" : "normal";
  return `${style} ${weight} ${fontSizePx}px ${content.fontFamily}`;
}

/** Resolves how large one watermark instance will render, in canvas pixels. */
export function measureWatermarkContent(
  ctx: Pick<CanvasRenderingContext2D, "font" | "measureText">,
  content: WatermarkContent,
  canvasWidth: number,
  style: WatermarkStyle,
): Size {
  const scale = Math.max(0, style.scalePercent) / 100;

  if (content.kind === "image") {
    const width = scale * canvasWidth;
    const aspect =
      content.naturalWidth > 0
        ? content.naturalHeight / content.naturalWidth
        : 1;
    return { width: Math.max(width, 1), height: Math.max(width * aspect, 1) };
  }

  const fontSizePx = Math.max(1, scale * canvasWidth);
  ctx.font = buildFont(content, fontSizePx);
  const text = content.text.length > 0 ? content.text : " ";
  const metrics = ctx.measureText(text);
  const width = Math.max(metrics.width, 1);
  const ascent = metrics.actualBoundingBoxAscent ?? fontSizePx * 0.8;
  const descent = metrics.actualBoundingBoxDescent ?? fontSizePx * 0.2;
  const height = Math.max(ascent + descent, 1);
  return { width, height };
}

function paintInstance(
  ctx: CanvasRenderingContext2D,
  content: WatermarkContent,
  contentSize: Size,
  fontSizePx: number,
  centerPx: { x: number; y: number },
  rotationDeg: number,
  opacity: number,
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.translate(centerPx.x, centerPx.y);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  if (content.kind === "text") {
    ctx.font = buildFont(content, Math.max(1, fontSizePx));
    ctx.fillStyle = content.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (content.shadow) {
      ctx.shadowColor = content.shadowColor;
      ctx.shadowBlur = content.shadowBlur;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
    ctx.fillText(content.text, 0, 0);
  } else {
    ctx.drawImage(
      content.image,
      -contentSize.width / 2,
      -contentSize.height / 2,
      contentSize.width,
      contentSize.height,
    );
  }

  ctx.restore();
}

/**
 * Paints every repeat of a watermark (single, tiled, or diagonal) onto
 * `ctx`. Pure with respect to layout: called identically for a
 * working-resolution preview canvas and a full-resolution export canvas,
 * with `canvasSize` being the only thing that differs between the two.
 */
export function renderWatermarkLayer(
  ctx: CanvasRenderingContext2D,
  canvasSize: Size,
  content: WatermarkContent,
  style: WatermarkStyle,
  layout: WatermarkLayoutSettings,
): void {
  const contentSize = measureWatermarkContent(
    ctx,
    content,
    canvasSize.width,
    style,
  );
  const fontSizePx = Math.max(
    1,
    (Math.max(0, style.scalePercent) / 100) * canvasSize.width,
  );
  const placements = resolvePlacements(layout, canvasSize, contentSize);
  const opacity = Math.max(0, style.opacityPercent) / 100;

  for (const placement of placements) {
    const centerPx = toPixels(placement.center, canvasSize);
    paintInstance(
      ctx,
      content,
      contentSize,
      fontSizePx,
      centerPx,
      placement.rotationDeg,
      opacity,
    );
  }
}
