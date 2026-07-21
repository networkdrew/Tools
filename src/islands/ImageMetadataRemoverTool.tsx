import { useId, useRef, useState } from "react";
import { detectAnimation } from "@/lib/tools-logic/image-metadata/animation";
import {
  compareSizes,
  determineOutputFormat,
  formatBytes,
  formatLabel,
  outputFilename,
  validateImageFile,
  type OutputFormat,
} from "@/lib/tools-logic/image-metadata/file";
import { detectMetadata } from "@/lib/tools-logic/image-metadata/metadata";
import { computeMetadataWarnings } from "@/lib/tools-logic/image-metadata/warnings";
import { downloadBlob } from "@/lib/tools-logic/download";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
} from "@/components/react/styles";

/** Re-encode quality for JPEG/WebP: high enough that visible quality loss is negligible. */
const REENCODE_QUALITY = 0.92;

interface Dimensions {
  width: number;
  height: number;
}

interface CleanedResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

async function decodeImage(
  file: File,
): Promise<{ ok: true; value: ImageBitmap } | { ok: false; message: string }> {
  try {
    // "from-image" bakes in any EXIF rotation before the EXIF data itself is
    // discarded, so the cleaned image keeps its correct visible orientation.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return { ok: true, value: bitmap };
  } catch {
    return {
      ok: false,
      message:
        "Couldn't read that image in this browser. Try a different file or a different browser.",
    };
  }
}

export default function ImageMetadataRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState<Dimensions | null>(
    null,
  );
  const [isAnimated, setIsAnimated] = useState(false);
  const [hasIcc, setHasIcc] = useState(false);
  const [hasOtherMetadata, setHasOtherMetadata] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanedResult | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  function clearResult() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setCleanError(null);
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
    decoded.value.close();

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const animated = detectAnimation(bytes, selected.type);
    const metaFlags = detectMetadata(bytes, selected.type);

    setSelectError(null);
    setFile(selected);
    setSourceDimensions(dims);
    setIsAnimated(animated);
    setHasIcc(metaFlags.hasIcc);
    setHasOtherMetadata(metaFlags.hasOther);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleClean() {
    if (!file || !sourceDimensions) return;

    setIsCleaning(true);
    setCleanError(null);
    setFallbackNotice(null);

    const decoded = await decodeImage(file);
    if (!decoded.ok) {
      setCleanError(decoded.message);
      setIsCleaning(false);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = decoded.value.width;
    canvas.height = decoded.value.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      decoded.value.close();
      setCleanError(
        "Canvas isn't supported in this browser, so metadata can't be removed here.",
      );
      setIsCleaning(false);
      return;
    }

    const targetFormat: OutputFormat = determineOutputFormat(file.type);

    if (targetFormat === "image/jpeg") {
      // JPEG has no alpha channel; without this, any non-opaque pixel would
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
        targetFormat,
        targetFormat === "image/png" ? undefined : REENCODE_QUALITY,
      ),
    );

    if (!blob) {
      setCleanError("Couldn't re-encode the image in this browser.");
      setIsCleaning(false);
      return;
    }

    if (blob.type && blob.type !== targetFormat) {
      setFallbackNotice(
        `This browser doesn't support encoding to ${formatLabel(targetFormat)}, so ${formatLabel(blob.type)} was produced instead.`,
      );
    }

    if (result) URL.revokeObjectURL(result.url);
    setResult({
      url: URL.createObjectURL(blob),
      blob,
      width: canvas.width,
      height: canvas.height,
    });
    setIsCleaning(false);
  }

  function handleDownload() {
    if (!result || !file) return;
    downloadBlob(
      outputFilename(
        file.name,
        result.blob.type || determineOutputFormat(file.type),
      ),
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
    setHasIcc(false);
    setHasOtherMetadata(false);
    setSelectError(null);
    setIsCleaning(false);
    setCleanError(null);
    setResult(null);
    setFallbackNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const targetFormat = file ? determineOutputFormat(file.type) : null;
  const formatConverted = file ? targetFormat !== file.type : false;

  const warnings = file
    ? computeMetadataWarnings({
        isAnimated,
        hasIccProfile: hasIcc,
        formatConverted,
        sourceLabel: formatLabel(file.type),
      })
    : [];

  const sizeComparison =
    result && file ? compareSizes(file.size, result.blob.size) : null;

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
              <dt className="font-medium">Format</dt>
              <dd>{formatLabel(file.type)}</dd>
              <dt className="font-medium">Original size</dt>
              <dd>{formatBytes(file.size)}</dd>
              <dt className="font-medium">Dimensions</dt>
              <dd>
                {sourceDimensions.width}×{sourceDimensions.height}px
              </dd>
              <dt className="font-medium">Color profile</dt>
              <dd>{hasIcc ? "Detected" : "None detected"}</dd>
              <dt className="font-medium">Other metadata</dt>
              <dd>{hasOtherMetadata ? "Detected" : "None detected"}</dd>
              {isAnimated && (
                <>
                  <dt className="font-medium">Animation</dt>
                  <dd>Detected</dd>
                </>
              )}
            </dl>
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
              onClick={handleClean}
              disabled={isCleaning}
              className={buttonPrimary}
            >
              {isCleaning ? "Removing metadata…" : "Remove metadata"}
            </button>
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>
        </>
      )}

      {cleanError && <StatusMessage tone="error">{cleanError}</StatusMessage>}

      {result && !cleanError && (
        <div className="flex flex-col gap-3">
          <img
            src={result.url}
            alt="Cleaned preview"
            className="border-border-strong bg-bg-sunken h-48 w-48 rounded-md border object-contain"
          />
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Output format</dt>
            <dd>{formatLabel(result.blob.type || targetFormat || "")}</dd>
            <dt className="font-medium">Cleaned size</dt>
            <dd role="status">
              {formatBytes(result.blob.size)}
              {sizeComparison && sizeComparison.direction !== "same" && (
                <>
                  {" "}
                  ({sizeComparison.direction === "smaller" ? "−" : "+"}
                  {sizeComparison.deltaPercent}% vs. original)
                </>
              )}
            </dd>
            <dt className="font-medium">Dimensions</dt>
            <dd>
              {result.width}×{result.height}px
            </dd>
          </dl>
          {fallbackNotice && (
            <StatusMessage tone="neutral">{fallbackNotice}</StatusMessage>
          )}
          <StatusMessage tone="success">
            Metadata removed — this file was fully re-decoded and re-encoded,
            not just copied or renamed.
          </StatusMessage>
          <div>
            <button
              type="button"
              onClick={handleDownload}
              className={buttonSecondary}
            >
              Download cleaned image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
