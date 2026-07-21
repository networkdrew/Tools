import { useId, useRef, useState } from "react";
import { detectAnimation } from "@/lib/tools-logic/image-convert/animation";
import {
  formatBytes,
  formatLabel,
  outputFilename,
  validateImageFile,
  type OutputFormat,
} from "@/lib/tools-logic/image-convert/file";
import { computeConversionWarnings } from "@/lib/tools-logic/image-convert/warnings";
import { downloadBlob } from "@/lib/tools-logic/download";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  selectField,
} from "@/components/react/styles";

interface Dimensions {
  width: number;
  height: number;
}

interface ConvertedResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "image/png", label: "PNG (lossless, supports transparency)" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
];

async function decodeImage(
  file: File,
): Promise<{ ok: true; value: ImageBitmap } | { ok: false; message: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { ok: true, value: bitmap };
  } catch {
    return {
      ok: false,
      message:
        "Couldn't read that image in this browser. Try a different file or a different browser.",
    };
  }
}

/** Scans the alpha channel for any non-opaque pixel. Defaults to false if canvas isn't available. */
function detectTransparency(bitmap: ImageBitmap): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

export default function ImageFormatConverterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState<Dimensions | null>(
    null,
  );
  const [isAnimated, setIsAnimated] = useState(false);
  const [hasTransparency, setHasTransparency] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(85);

  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertedResult | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileInputId = useId();
  const outputFormatId = useId();
  const qualityId = useId();

  function clearResult() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setConvertError(null);
    setFallbackNotice(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    clearResult();

    const validation = validateImageFile(selected);
    if (!validation.ok) {
      setSelectError(validation.message);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSourceDimensions(null);
      return;
    }

    const decoded = await decodeImage(selected);
    if (!decoded.ok) {
      setSelectError(decoded.message);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSourceDimensions(null);
      return;
    }

    const dims = { width: decoded.value.width, height: decoded.value.height };
    const transparency = detectTransparency(decoded.value);
    decoded.value.close();

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const animated = detectAnimation(bytes, selected.type);

    setSelectError(null);
    setFile(selected);
    setSourceDimensions(dims);
    setHasTransparency(transparency);
    setIsAnimated(animated);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleConvert() {
    if (!file || !sourceDimensions) return;

    setIsConverting(true);
    setConvertError(null);
    setFallbackNotice(null);

    const decoded = await decodeImage(file);
    if (!decoded.ok) {
      setConvertError(decoded.message);
      setIsConverting(false);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = decoded.value.width;
    canvas.height = decoded.value.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      decoded.value.close();
      setConvertError(
        "Canvas isn't supported in this browser, so images can't be converted here.",
      );
      setIsConverting(false);
      return;
    }

    if (outputFormat === "image/jpeg") {
      // JPEG has no alpha channel; without this, transparent pixels would
      // otherwise be composited onto black instead of a clean white fill.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.value, 0, 0);
    decoded.value.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        outputFormat,
        outputFormat === "image/png" ? undefined : quality / 100,
      ),
    );

    if (!blob) {
      setConvertError("Couldn't encode the converted image in this browser.");
      setIsConverting(false);
      return;
    }

    if (blob.type && blob.type !== outputFormat) {
      setFallbackNotice(
        `This browser doesn't support encoding to ${formatLabel(outputFormat)}, so ${formatLabel(blob.type)} was produced instead.`,
      );
    }

    if (result) URL.revokeObjectURL(result.url);
    setResult({
      url: URL.createObjectURL(blob),
      blob,
      width: canvas.width,
      height: canvas.height,
    });
    setIsConverting(false);
  }

  function handleDownload() {
    if (!result || !file) return;
    downloadBlob(
      outputFilename(file.name, result.blob.type || outputFormat),
      result.blob,
    );
  }

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setPreviewUrl(null);
    setSourceDimensions(null);
    setIsAnimated(false);
    setHasTransparency(false);
    setSelectError(null);
    setOutputFormat("image/png");
    setQuality(85);
    setIsConverting(false);
    setConvertError(null);
    setResult(null);
    setFallbackNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const warnings = file
    ? computeConversionWarnings({
        isAnimated,
        hasTransparency,
        sourceLabel: formatLabel(file.type),
        outputFormat,
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={fileInputId} className={labelText}>
          Image file
        </label>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
          onChange={handleFileChange}
          className="text-text-muted file:bg-bg-elevated file:text-text file:border-border-strong hover:file:bg-bg-sunken text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      {selectError && <StatusMessage tone="error">{selectError}</StatusMessage>}

      {file && sourceDimensions && !selectError && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="border-border-strong bg-bg-sunken h-32 w-32 shrink-0 rounded-md border object-contain"
              />
            )}
            <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">Original format</dt>
              <dd>{formatLabel(file.type)}</dd>
              <dt className="font-medium">Original size</dt>
              <dd>{formatBytes(file.size)}</dd>
              <dt className="font-medium">Dimensions</dt>
              <dd>
                {sourceDimensions.width}×{sourceDimensions.height}px
              </dd>
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={outputFormatId} className="flex flex-col gap-1">
              <span className={labelText}>Convert to</span>
              <select
                id={outputFormatId}
                value={outputFormat}
                onChange={(e) =>
                  setOutputFormat(e.target.value as OutputFormat)
                }
                className={selectField}
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor={qualityId} className="flex flex-col gap-1">
              <span className={labelText}>
                Quality
                {outputFormat === "image/png"
                  ? " (not used for PNG)"
                  : `: ${quality}%`}
              </span>
              <input
                id={qualityId}
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={outputFormat === "image/png"}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="accent-accent disabled:opacity-50"
              />
            </label>
          </div>

          {warnings.map((warning) => (
            <StatusMessage key={warning} tone="neutral">
              <strong className="font-medium">Warning: </strong>
              {warning}
            </StatusMessage>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConvert}
              disabled={isConverting}
              className={buttonPrimary}
            >
              {isConverting ? "Converting…" : "Convert image"}
            </button>
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>
        </>
      )}

      {convertError && (
        <StatusMessage tone="error">{convertError}</StatusMessage>
      )}

      {result && !convertError && (
        <div className="flex flex-col gap-3">
          <img
            src={result.url}
            alt="Converted preview"
            className="border-border-strong bg-bg-sunken h-48 w-48 rounded-md border object-contain"
          />
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Output format</dt>
            <dd>{formatLabel(result.blob.type || outputFormat)}</dd>
            <dt className="font-medium">Output size</dt>
            <dd role="status">{formatBytes(result.blob.size)}</dd>
            <dt className="font-medium">Dimensions</dt>
            <dd>
              {result.width}×{result.height}px
            </dd>
          </dl>
          {fallbackNotice && (
            <StatusMessage tone="neutral">{fallbackNotice}</StatusMessage>
          )}
          <div>
            <button
              type="button"
              onClick={handleDownload}
              className={buttonSecondary}
            >
              Download converted image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
