/** An RGB color with alpha in the 0–1 range (not 0–255). */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ParseColorResult =
  { ok: true; value: RgbColor } | { ok: false; message: string };

/** CSS Color Module Level 1 keywords, plus a handful of other very common names. */
const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  white: "#ffffff",
  maroon: "#800000",
  red: "#ff0000",
  purple: "#800080",
  fuchsia: "#ff00ff",
  green: "#008000",
  lime: "#00ff00",
  olive: "#808000",
  yellow: "#ffff00",
  navy: "#000080",
  blue: "#0000ff",
  teal: "#008080",
  aqua: "#00ffff",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  orange: "#ffa500",
  pink: "#ffc0cb",
  brown: "#a52a2a",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHex(hex: string): RgbColor | null {
  const clean = hex.slice(1);
  if (![3, 4, 6, 8].includes(clean.length)) return null;
  if (!/^[0-9a-f]+$/i.test(clean)) return null;

  if (clean.length === 3 || clean.length === 4) {
    const r = parseInt(clean.charAt(0) + clean.charAt(0), 16);
    const g = parseInt(clean.charAt(1) + clean.charAt(1), 16);
    const b = parseInt(clean.charAt(2) + clean.charAt(2), 16);
    const a =
      clean.length === 4
        ? parseInt(clean.charAt(3) + clean.charAt(3), 16) / 255
        : 1;
    return { r, g, b, a };
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function parseChannel(token: string): number | null {
  if (token.endsWith("%")) {
    const pct = Number(token.slice(0, -1));
    if (!Number.isFinite(pct)) return null;
    return clamp(Math.round((pct / 100) * 255), 0, 255);
  }
  const n = Number(token);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n), 0, 255);
}

function parseAlphaToken(token: string): number | null {
  if (token.endsWith("%")) {
    const pct = Number(token.slice(0, -1));
    if (!Number.isFinite(pct)) return null;
    return clamp(pct / 100, 0, 1);
  }
  const n = Number(token);
  if (!Number.isFinite(n)) return null;
  return clamp(n, 0, 1);
}

/** Accepts both legacy comma syntax and modern space/slash syntax. */
function parseRgbFunction(input: string): RgbColor | null {
  const match = input.match(/^rgba?\(([^)]*)\)$/i);
  const body = match?.[1];
  if (body === undefined) return null;
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const [rToken, gToken, bToken, aToken] = parts;
  if (rToken === undefined || gToken === undefined || bToken === undefined) {
    return null;
  }

  const r = parseChannel(rToken);
  const g = parseChannel(gToken);
  const b = parseChannel(bToken);
  if (r === null || g === null || b === null) return null;

  let a = 1;
  if (aToken !== undefined) {
    const parsedAlpha = parseAlphaToken(aToken);
    if (parsedAlpha === null) return null;
    a = parsedAlpha;
  }

  return { r, g, b, a };
}

/**
 * Parses a color from hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba()
 * (comma or space syntax), or a basic CSS color name.
 */
export function parseColor(input: string): ParseColorResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Enter a color." };
  }

  const lower = trimmed.toLowerCase();
  if (lower === "transparent") {
    return { ok: true, value: { r: 0, g: 0, b: 0, a: 0 } };
  }

  const candidate = NAMED_COLORS[lower] ?? trimmed;

  if (candidate.startsWith("#")) {
    const parsed = parseHex(candidate);
    if (!parsed) {
      return {
        ok: false,
        message: `"${trimmed}" isn't a valid hex color. Use #rgb, #rrggbb, or #rrggbbaa.`,
      };
    }
    return { ok: true, value: parsed };
  }

  if (/^rgba?\(/i.test(candidate)) {
    const parsed = parseRgbFunction(candidate);
    if (!parsed) {
      return {
        ok: false,
        message: `"${trimmed}" isn't a valid rgb()/rgba() color.`,
      };
    }
    return { ok: true, value: parsed };
  }

  return {
    ok: false,
    message: `Couldn't understand "${trimmed}". Try a hex color (#rrggbb), rgb()/rgba(), or a basic color name.`,
  };
}

/** Alpha-composites `top` over an opaque `bottom` color. */
function compositeOver(
  top: RgbColor,
  bottom: { r: number; g: number; b: number },
): { r: number; g: number; b: number } {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
  };
}

function linearizeChannel(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of an opaque color. */
export function relativeLuminance(color: {
  r: number;
  g: number;
  b: number;
}): number {
  const r = linearizeChannel(color.r);
  const g = linearizeChannel(color.g);
  const b = linearizeChannel(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between a foreground and background color, from 1
 * (no contrast) to 21 (black on white).
 *
 * Semi-transparent colors are flattened first: the background is composited
 * over an assumed white page, then the foreground is composited over that —
 * an accurate result for the common case of text on a card or overlay, but
 * it will be wrong if the actual page background isn't white.
 */
export function contrastRatio(fg: RgbColor, bg: RgbColor): number {
  const effectiveBg = compositeOver(bg, { r: 255, g: 255, b: 255 });
  const effectiveFg = compositeOver(fg, effectiveBg);
  const l1 = relativeLuminance(effectiveFg);
  const l2 = relativeLuminance(effectiveBg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface WcagEvaluation {
  ratio: number;
  aaNormalText: boolean;
  aaLargeText: boolean;
  aaaNormalText: boolean;
  aaaLargeText: boolean;
  aaUiComponents: boolean;
}

/** Checks a contrast ratio against the WCAG 2.1 success-criterion thresholds. */
export function evaluateContrast(ratio: number): WcagEvaluation {
  return {
    ratio,
    aaNormalText: ratio >= 4.5,
    aaLargeText: ratio >= 3,
    aaaNormalText: ratio >= 7,
    aaaLargeText: ratio >= 4.5,
    aaUiComponents: ratio >= 3,
  };
}

/** Renders an opaque color as a 6-digit hex string, e.g. for a color-swatch input. */
export function rgbToHex(color: { r: number; g: number; b: number }): string {
  const toHex = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
