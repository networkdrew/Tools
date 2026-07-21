import { useId, useState } from "react";
import {
  generateQrCode,
  MARGIN_MODULES,
  type QrCodeResult,
  type QrErrorCorrectionLevel,
} from "@/lib/tools-logic/qrcode/generate";
import { downloadBlob, downloadTextFile } from "@/lib/tools-logic/download";
import { CopyButton } from "@/components/react/CopyButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  selectField,
  textareaField,
} from "@/components/react/styles";

const ERROR_CORRECTION_OPTIONS: {
  value: QrErrorCorrectionLevel;
  label: string;
}[] = [
  { value: "L", label: "Low (~7% recovery)" },
  { value: "M", label: "Medium (~15% recovery)" },
  { value: "Q", label: "Quartile (~25% recovery)" },
  { value: "H", label: "High (~30% recovery)" },
];

const PNG_SIZE_OPTIONS = [256, 512, 1024] as const;

function renderPng(
  result: QrCodeResult,
  targetSize: number,
): Promise<Blob | null> {
  const gridSize = result.moduleCount + MARGIN_MODULES * 2;
  const cellSize = Math.max(1, Math.round(targetSize / gridSize));
  const canvasSize = cellSize * gridSize;

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < result.moduleCount; row++) {
    for (let col = 0; col < result.moduleCount; col++) {
      if (result.matrix[row]?.[col]) {
        ctx.fillRect(
          (col + MARGIN_MODULES) * cellSize,
          (row + MARGIN_MODULES) * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export default function QrCodeGeneratorTool() {
  const [text, setText] = useState("");
  const [errorCorrectionLevel, setErrorCorrectionLevel] =
    useState<QrErrorCorrectionLevel>("M");
  const [pngSize, setPngSize] = useState<(typeof PNG_SIZE_OPTIONS)[number]>(
    PNG_SIZE_OPTIONS[1],
  );
  const [result, setResult] = useState<QrCodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const inputId = useId();
  const ecLevelId = useId();
  const pngSizeId = useId();

  function handleGenerate() {
    const outcome = generateQrCode(text, errorCorrectionLevel);
    if (outcome.ok) {
      setResult(outcome.value);
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
    setDownloadError(null);
  }

  function handleReset() {
    setText("");
    setErrorCorrectionLevel("M");
    setResult(null);
    setError(null);
    setDownloadError(null);
  }

  async function handleDownloadPng() {
    if (!result) return;
    const blob = await renderPng(result, pngSize);
    if (!blob) {
      setDownloadError("Couldn't render a PNG in this browser.");
      return;
    }
    downloadBlob("qr-code.png", blob);
  }

  function handleDownloadSvg() {
    if (!result) return;
    downloadTextFile("qr-code.svg", result.svg, "image/svg+xml");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className={labelText}>
          Text or URL
        </label>
        <textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck={false}
          className={textareaField}
          placeholder="https://example.com"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label
          htmlFor={ecLevelId}
          className="flex flex-col gap-1 text-sm font-medium"
        >
          <span className={labelText}>Error correction</span>
          <select
            id={ecLevelId}
            value={errorCorrectionLevel}
            onChange={(e) =>
              setErrorCorrectionLevel(e.target.value as QrErrorCorrectionLevel)
            }
            className={selectField}
          >
            {ERROR_CORRECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label
          htmlFor={pngSizeId}
          className="flex flex-col gap-1 text-sm font-medium"
        >
          <span className={labelText}>PNG size</span>
          <select
            id={pngSizeId}
            value={pngSize}
            onChange={(e) =>
              setPngSize(
                Number(e.target.value) as (typeof PNG_SIZE_OPTIONS)[number],
              )
            }
            className={selectField}
          >
            {PNG_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}×{size}px
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className={buttonPrimary}
        >
          Generate QR code
        </button>
        <button type="button" onClick={handleReset} className={buttonGhost}>
          Reset
        </button>
      </div>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      {result && !error && (
        <div className="flex flex-col gap-3">
          <div className="border-border-strong bg-bg-elevated inline-flex w-fit items-center justify-center rounded-md border p-4">
            <div
              className="h-64 w-64"
              // Safe: svg is built entirely from numeric coordinates in
              // generateQrCode, never from raw user text.
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
          </div>
          <p className="text-text-muted text-sm">
            {result.moduleCount}×{result.moduleCount} modules
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className={buttonSecondary}
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className={buttonSecondary}
            >
              Download SVG
            </button>
            <CopyButton text={result.svg} label="Copy SVG markup" />
          </div>
          {downloadError && (
            <StatusMessage tone="error">{downloadError}</StatusMessage>
          )}
        </div>
      )}
    </div>
  );
}
