import { useId, useRef, useState } from "react";
import {
  computeTargetDimensions,
  type Dimensions,
  type ResizeOptions,
} from "@/lib/tools-logic/image-compress/dimensions";
import {
  computeSavingsPercent,
  formatBytes,
  validateImageFile,
} from "@/lib/tools-logic/image-compress/file";
import { downloadBlob } from "@/lib/tools-logic/download";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  selectField,
  textField,
} from "@/components/react/styles";

type OutputFormat = "image/jpeg" | "image/webp" | "image/png";
type ResizeMode = "none" | "scale" | "fit";

interface CompressedResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

const FORMAT_OPTIONS: {
  value: OutputFormat;
  label: string;
  extension: string;
}[] = [
  { value: "image/jpeg", label: "JPEG", extension: "jpg" },
  { value: "image/webp", label: "WebP", extension: "webp" },
  { value: "image/png", label: "PNG (lossless)", extension: "png" },
];

const RESIZE_OPTIONS: { value: ResizeMode; label: string }[] = [
  { value: "none", label: "Keep original dimensions" },
  { value: "scale", label: "Scale by percentage" },
  { value: "fit", label: "Fit within max width/height" },
];

function outputFilename(originalName: string, extension: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "image"}-compressed.${extension}`;
}

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

export default function ImageCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] =
    useState<Dimensions | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(80);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("none");
  const [scalePercent, setScalePercent] = useState(50);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1080);

  const [isProcessing, setIsProcessing] = useState(false);
  const [compressError, setCompressError] = useState<string | null>(null);
  const [result, setResult] = useState<CompressedResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileInputId = useId();
  const formatId = useId();
  const qualityId = useId();
  const resizeModeId = useId();
  const scalePercentId = useId();
  const maxWidthId = useId();
  const maxHeightId = useId();

  function clearResult() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setCompressError(null);
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
      setOriginalDimensions(null);
      return;
    }

    const decoded = await decodeImage(selected);
    if (!decoded.ok) {
      setSelectError(decoded.message);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setOriginalDimensions(null);
      return;
    }

    const dims = { width: decoded.value.width, height: decoded.value.height };
    decoded.value.close();

    setSelectError(null);
    setFile(selected);
    setOriginalDimensions(dims);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleCompress() {
    if (!file || !originalDimensions) return;

    setIsProcessing(true);
    setCompressError(null);

    const options: ResizeOptions =
      resizeMode === "scale"
        ? { mode: "scale", scalePercent }
        : resizeMode === "fit"
          ? { mode: "fit", maxWidth, maxHeight }
          : { mode: "none" };

    const targetDimensions = computeTargetDimensions(
      originalDimensions,
      options,
    );
    if (!targetDimensions.ok) {
      setCompressError(targetDimensions.message);
      setIsProcessing(false);
      return;
    }

    const decoded = await decodeImage(file);
    if (!decoded.ok) {
      setCompressError(decoded.message);
      setIsProcessing(false);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetDimensions.value.width;
    canvas.height = targetDimensions.value.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      decoded.value.close();
      setCompressError(
        "Canvas isn't supported in this browser, so images can't be re-encoded here.",
      );
      setIsProcessing(false);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      decoded.value,
      0,
      0,
      targetDimensions.value.width,
      targetDimensions.value.height,
    );
    decoded.value.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        format,
        format === "image/png" ? undefined : quality / 100,
      ),
    );

    if (!blob) {
      setCompressError("Couldn't encode the compressed image in this browser.");
      setIsProcessing(false);
      return;
    }

    if (result) URL.revokeObjectURL(result.url);
    setResult({
      url: URL.createObjectURL(blob),
      blob,
      width: targetDimensions.value.width,
      height: targetDimensions.value.height,
    });
    setIsProcessing(false);
  }

  function handleDownload() {
    if (!result || !file) return;
    const extension =
      FORMAT_OPTIONS.find((opt) => opt.value === format)?.extension ?? "jpg";
    downloadBlob(outputFilename(file.name, extension), result.blob);
  }

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setSelectError(null);
    setCompressError(null);
    setResult(null);
    setFormat("image/jpeg");
    setQuality(80);
    setResizeMode("none");
    setScalePercent(50);
    setMaxWidth(1920);
    setMaxHeight(1080);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const savingsPercent = result
    ? computeSavingsPercent(file?.size ?? 0, result.blob.size)
    : null;

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
          accept="image/*"
          onChange={handleFileChange}
          className="text-text-muted file:bg-bg-elevated file:text-text file:border-border-strong hover:file:bg-bg-sunken text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      {selectError && <StatusMessage tone="error">{selectError}</StatusMessage>}

      {file && originalDimensions && !selectError && (
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
              <dt className="font-medium">Original size</dt>
              <dd>{formatBytes(file.size)}</dd>
              <dt className="font-medium">Dimensions</dt>
              <dd>
                {originalDimensions.width}×{originalDimensions.height}px
              </dd>
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={formatId} className="flex flex-col gap-1">
              <span className={labelText}>Output format</span>
              <select
                id={formatId}
                value={format}
                onChange={(e) => setFormat(e.target.value as OutputFormat)}
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
                {format === "image/png"
                  ? " (not used for PNG)"
                  : `: ${quality}%`}
              </span>
              <input
                id={qualityId}
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={format === "image/png"}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="accent-accent disabled:opacity-50"
              />
            </label>

            <label htmlFor={resizeModeId} className="flex flex-col gap-1">
              <span className={labelText}>Resize</span>
              <select
                id={resizeModeId}
                value={resizeMode}
                onChange={(e) => setResizeMode(e.target.value as ResizeMode)}
                className={selectField}
              >
                {RESIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {resizeMode === "scale" && (
              <label htmlFor={scalePercentId} className="flex flex-col gap-1">
                <span className={labelText}>Scale percentage</span>
                <input
                  id={scalePercentId}
                  type="number"
                  min={1}
                  value={scalePercent}
                  onChange={(e) => setScalePercent(Number(e.target.value))}
                  className={textField}
                />
              </label>
            )}

            {resizeMode === "fit" && (
              <div className="flex gap-3">
                <label
                  htmlFor={maxWidthId}
                  className="flex flex-1 flex-col gap-1"
                >
                  <span className={labelText}>Max width (px)</span>
                  <input
                    id={maxWidthId}
                    type="number"
                    min={1}
                    value={maxWidth}
                    onChange={(e) => setMaxWidth(Number(e.target.value))}
                    className={textField}
                  />
                </label>
                <label
                  htmlFor={maxHeightId}
                  className="flex flex-1 flex-col gap-1"
                >
                  <span className={labelText}>Max height (px)</span>
                  <input
                    id={maxHeightId}
                    type="number"
                    min={1}
                    value={maxHeight}
                    onChange={(e) => setMaxHeight(Number(e.target.value))}
                    className={textField}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCompress}
              disabled={isProcessing}
              className={buttonPrimary}
            >
              {isProcessing ? "Compressing…" : "Compress image"}
            </button>
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>
        </>
      )}

      {compressError && (
        <StatusMessage tone="error">{compressError}</StatusMessage>
      )}

      {result && !compressError && (
        <div className="flex flex-col gap-3">
          <img
            src={result.url}
            alt="Compressed preview"
            className="border-border-strong bg-bg-sunken h-48 w-48 rounded-md border object-contain"
          />
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Compressed size</dt>
            <dd>{formatBytes(result.blob.size)}</dd>
            <dt className="font-medium">Dimensions</dt>
            <dd>
              {result.width}×{result.height}px
            </dd>
            {savingsPercent !== null && (
              <>
                <dt className="font-medium">Savings</dt>
                <dd role="status">{savingsPercent}% smaller</dd>
              </>
            )}
          </dl>
          <div>
            <button
              type="button"
              onClick={handleDownload}
              className={buttonSecondary}
            >
              Download compressed image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
