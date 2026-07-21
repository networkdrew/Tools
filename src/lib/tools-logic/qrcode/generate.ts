import qrcodegen from "qrcode-generator";

// The library defaults to masking each UTF-16 code unit to 8 bits, which
// corrupts anything outside Latin-1. Switch it to real UTF-8 bytes once, at
// module load, so emoji and non-Latin scripts encode correctly.
qrcodegen.stringToBytes = (s: string) =>
  Array.from(new TextEncoder().encode(s));

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

/** Quiet-zone margin, in modules, added around the code on every side. */
export const MARGIN_MODULES = 4;

export interface QrCodeResult {
  /** Number of modules (the QR's black/white cells) per side, excluding margin. */
  moduleCount: number;
  /** matrix[row][col] is true where a module is dark. */
  matrix: boolean[][];
  /** Self-contained SVG markup (includes the quiet-zone margin). */
  svg: string;
}

export type QrCodeGenerateResult =
  { ok: true; value: QrCodeResult } | { ok: false; message: string };

/** Generates a QR code for arbitrary UTF-8 text (URLs, Wi-Fi strings, vCards, plain text). */
export function generateQrCode(
  text: string,
  errorCorrectionLevel: QrErrorCorrectionLevel = "M",
): QrCodeGenerateResult {
  if (text.trim().length === 0) {
    return { ok: false, message: "Enter some text or a URL to encode." };
  }

  let qr: ReturnType<typeof qrcodegen>;
  try {
    qr = qrcodegen(0, errorCorrectionLevel);
    qr.addData(text);
    qr.make();
  } catch (error) {
    const message = typeof error === "string" ? error : String(error);
    const overflow = /overflow/i.test(message);
    return {
      ok: false,
      message: overflow
        ? "This text is too long to fit in a QR code at this error correction level. Try a lower error correction level or shorter text."
        : "Couldn't generate a QR code for that input.",
    };
  }

  const moduleCount = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < moduleCount; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < moduleCount; col++) {
      line.push(qr.isDark(row, col));
    }
    matrix.push(line);
  }

  return {
    ok: true,
    value: { moduleCount, matrix, svg: buildSvg(matrix, moduleCount) },
  };
}

function buildSvg(matrix: boolean[][], moduleCount: number): string {
  const size = moduleCount + MARGIN_MODULES * 2;
  let path = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row]?.[col]) {
        path += `M${col + MARGIN_MODULES},${row + MARGIN_MODULES}h1v1h-1z`;
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  );
}
