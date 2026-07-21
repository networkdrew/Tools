import { useEffect, useId, useRef, useState } from "react";
import {
  computePreviewSize,
  initialCropRect,
  orientedSize,
  rectAspect,
  rotateClockwise,
  rotateCounterClockwise,
  scaleRect,
  type Rect,
  type Rotation,
  type Size,
} from "@/lib/tools-logic/image-crop/geometry";
import {
  computeCompositePlan,
  dimensionsFromPercent,
  linkedDimension,
  type FitMode,
} from "@/lib/tools-logic/image-crop/resize";
import {
  CROP_PRESETS,
  DEFAULT_CROP_PRESET_ID,
  getCropPreset,
} from "@/lib/tools-logic/image-crop/presets";
import {
  formatBytes,
  formatLabel,
  outputFilename,
  validateImageFile,
  type OutputFormat,
} from "@/lib/tools-logic/image-crop/file";
import { computeCropWarnings } from "@/lib/tools-logic/image-crop/warnings";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  undo,
  type HistoryState,
} from "@/lib/tools-logic/image-crop/history";
import { detectAnimation } from "@/lib/tools-logic/image-convert/animation";
import {
  decodeImageFile,
  detectTransparency,
  drawOrientedToCanvas,
  renderExport,
} from "@/islands/image-crop-resize/decode";
import { CropOverlay } from "@/islands/image-crop-resize/CropOverlay";
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

interface EditState {
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  presetId: string;
  /** In preview (canvas-intrinsic) pixel coordinates for the current rotation. */
  cropRect: Rect;
}

type ResizeUnit = "pixels" | "percent";

interface ExportedResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

const DEFAULT_EDIT_STATE: EditState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  presetId: DEFAULT_CROP_PRESET_ID,
  cropRect: { x: 0, y: 0, width: 1, height: 1 },
};

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG (lossless, supports transparency)" },
  { value: "image/webp", label: "WebP" },
];

const FIT_MODE_OPTIONS: { value: FitMode; label: string }[] = [
  { value: "fit", label: "Fit (contain — may be smaller than target)" },
  { value: "fill", label: "Fill (cover — crops to exactly fill target)" },
  { value: "exact", label: "Exact dimensions (may distort)" },
];

function defaultOutputFormat(fileType: string): OutputFormat {
  return fileType === "image/jpeg" ||
    fileType === "image/png" ||
    fileType === "image/webp"
    ? fileType
    : "image/png";
}

export default function ImageCropResizeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [sourceSize, setSourceSize] = useState<Size | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [hasTransparency, setHasTransparency] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryState<EditState>>(() =>
    createHistory(DEFAULT_EDIT_STATE),
  );
  const [liveRect, setLiveRect] = useState<Rect | null>(null);

  const [resizeUnit, setResizeUnit] = useState<ResizeUnit>("percent");
  const [percent, setPercent] = useState(100);
  const [widthPx, setWidthPx] = useState(0);
  const [heightPx, setHeightPx] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [fitMode, setFitMode] = useState<FitMode>("fit");
  const [allowUpscale, setAllowUpscale] = useState(false);

  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(85);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportedResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileInputId = useId();
  const presetId = useId();
  const resizeUnitId = useId();
  const widthId = useId();
  const heightId = useId();
  const percentId = useId();
  const lockAspectId = useId();
  const fitModeId = useId();
  const allowUpscaleId = useId();
  const formatId = useId();
  const qualityId = useId();

  // Closes the previously-decoded bitmap whenever it's replaced or the tool unmounts.
  useEffect(() => {
    return () => {
      bitmap?.close();
    };
  }, [bitmap]);

  const { rotation, flipH, flipV } = history.present;
  const previewOrientedSize = sourceSize
    ? computePreviewSize(orientedSize(sourceSize, rotation))
    : null;
  const sourceOrientedSizeVal = sourceSize
    ? orientedSize(sourceSize, rotation)
    : null;
  const scaleToSource =
    previewOrientedSize &&
    previewOrientedSize.width > 0 &&
    sourceOrientedSizeVal
      ? sourceOrientedSizeVal.width / previewOrientedSize.width
      : 1;

  const displayedRect = liveRect ?? history.present.cropRect;
  const sourceCropRectFloat = scaleRect(displayedRect, scaleToSource);
  const sourceCropSize = {
    width: Math.max(1, Math.round(sourceCropRectFloat.width)),
    height: Math.max(1, Math.round(sourceCropRectFloat.height)),
  };
  const cropAspect = rectAspect(sourceCropRectFloat) || 1;

  useEffect(() => {
    if (!bitmap || !previewCanvasRef.current || !previewOrientedSize) return;
    drawOrientedToCanvas(
      previewCanvasRef.current,
      bitmap,
      previewOrientedSize,
      rotation,
      flipH,
      flipV,
    );
  }, [
    bitmap,
    previewOrientedSize?.width,
    previewOrientedSize?.height,
    rotation,
    flipH,
    flipV,
  ]);

  function resetFileState() {
    setFile(null);
    setBitmap(null);
    setSourceSize(null);
    setIsAnimated(false);
    setHasTransparency(false);
  }

  function clearResult() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setExportError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    clearResult();

    const validation = validateImageFile(selected);
    if (!validation.ok) {
      setSelectError(validation.message);
      resetFileState();
      return;
    }

    const decoded = await decodeImageFile(selected);
    if (!decoded.ok) {
      setSelectError(decoded.message);
      resetFileState();
      return;
    }

    const bmp = decoded.value;
    const transparency = detectTransparency(bmp);
    const bytes = new Uint8Array(await selected.arrayBuffer());
    const animated = detectAnimation(bytes, selected.type);
    const srcSize = { width: bmp.width, height: bmp.height };
    const previewOriented = computePreviewSize(orientedSize(srcSize, 0));
    const rect = initialCropRect(previewOriented, null);

    setSelectError(null);
    setFile(selected);
    setBitmap(bmp);
    setSourceSize(srcSize);
    setHasTransparency(transparency);
    setIsAnimated(animated);
    setHistory(
      createHistory<EditState>({
        rotation: 0,
        flipH: false,
        flipV: false,
        presetId: DEFAULT_CROP_PRESET_ID,
        cropRect: rect,
      }),
    );
    setLiveRect(null);
    setResizeUnit("percent");
    setPercent(100);
    setWidthPx(srcSize.width);
    setHeightPx(srcSize.height);
    setLockAspect(true);
    setFitMode("fit");
    setAllowUpscale(false);
    setOutputFormat(defaultOutputFormat(selected.type));
    setQuality(85);
  }

  function applyRotation(newRotation: Rotation) {
    if (!sourceSize) return;
    const newPreviewOriented = computePreviewSize(
      orientedSize(sourceSize, newRotation),
    );
    const preset = getCropPreset(history.present.presetId);
    const rect = initialCropRect(newPreviewOriented, preset?.aspect ?? null);
    setHistory((h) =>
      pushHistory(h, { ...h.present, rotation: newRotation, cropRect: rect }),
    );
    setLiveRect(null);
  }

  function handleRotateCW() {
    applyRotation(rotateClockwise(history.present.rotation));
  }

  function handleRotateCCW() {
    applyRotation(rotateCounterClockwise(history.present.rotation));
  }

  function handleFlipH() {
    setHistory((h) =>
      pushHistory(h, { ...h.present, flipH: !h.present.flipH }),
    );
  }

  function handleFlipV() {
    setHistory((h) =>
      pushHistory(h, { ...h.present, flipV: !h.present.flipV }),
    );
  }

  function handlePresetChange(id: string) {
    if (!previewOrientedSize) return;
    const preset = getCropPreset(id);
    const rect = initialCropRect(previewOrientedSize, preset?.aspect ?? null);
    setHistory((h) =>
      pushHistory(h, { ...h.present, presetId: id, cropRect: rect }),
    );
    setLiveRect(null);

    if (preset?.output) {
      setResizeUnit("pixels");
      setWidthPx(preset.output.width);
      setHeightPx(preset.output.height);
      setFitMode("fill");
      setLockAspect(true);
    } else {
      const newSourceCropSize = scaleRect(rect, scaleToSource);
      setResizeUnit("percent");
      setPercent(100);
      setWidthPx(Math.max(1, Math.round(newSourceCropSize.width)));
      setHeightPx(Math.max(1, Math.round(newSourceCropSize.height)));
    }
  }

  function handleCropCommit(rect: Rect) {
    setHistory((h) => pushHistory(h, { ...h.present, cropRect: rect }));
    setLiveRect(null);
  }

  function handleUndo() {
    setHistory((h) => undo(h));
    setLiveRect(null);
  }

  function handleRedo() {
    setHistory((h) => redo(h));
    setLiveRect(null);
  }

  function handleWidthChange(value: number) {
    if (lockAspect) {
      const linked = linkedDimension("width", value, heightPx, cropAspect);
      setWidthPx(linked.width);
      setHeightPx(linked.height);
    } else {
      setWidthPx(value);
    }
  }

  function handleHeightChange(value: number) {
    if (lockAspect) {
      const linked = linkedDimension("height", widthPx, value, cropAspect);
      setWidthPx(linked.width);
      setHeightPx(linked.height);
    } else {
      setHeightPx(value);
    }
  }

  const targetDimsResult =
    resizeUnit === "percent"
      ? dimensionsFromPercent(sourceCropSize, percent)
      : widthPx > 0 && heightPx > 0
        ? ({ ok: true, value: { width: widthPx, height: heightPx } } as const)
        : ({
            ok: false,
            message: "Width and height must be greater than 0.",
          } as const);

  const planResult = targetDimsResult.ok
    ? computeCompositePlan(
        sourceCropSize,
        targetDimsResult.value,
        fitMode,
        allowUpscale,
      )
    : targetDimsResult;

  async function handleExport() {
    if (!bitmap || !targetDimsResult.ok) {
      if (!targetDimsResult.ok) setExportError(targetDimsResult.message);
      return;
    }

    setIsExporting(true);
    setExportError(null);

    const cropRectSource: Rect = {
      x: Math.round(sourceCropRectFloat.x),
      y: Math.round(sourceCropRectFloat.y),
      width: Math.max(1, Math.round(sourceCropRectFloat.width)),
      height: Math.max(1, Math.round(sourceCropRectFloat.height)),
    };

    const exported = await renderExport({
      bitmap,
      rotation: history.present.rotation,
      flipH: history.present.flipH,
      flipV: history.present.flipV,
      cropRect: cropRectSource,
      target: targetDimsResult.value,
      fitMode,
      allowUpscale,
      format: outputFormat,
      quality,
    });

    if (!exported.ok) {
      setExportError(exported.message);
      setIsExporting(false);
      return;
    }

    if (result) URL.revokeObjectURL(result.url);
    setResult({
      url: URL.createObjectURL(exported.value.blob),
      blob: exported.value.blob,
      width: exported.value.width,
      height: exported.value.height,
    });
    setIsExporting(false);
  }

  function handleDownload() {
    if (!result || !file) return;
    downloadBlob(
      outputFilename(file.name, result.blob.type || outputFormat),
      result.blob,
    );
  }

  function handleReset() {
    if (result) URL.revokeObjectURL(result.url);
    resetFileState();
    setSelectError(null);
    setHistory(createHistory<EditState>(DEFAULT_EDIT_STATE));
    setLiveRect(null);
    setResizeUnit("percent");
    setPercent(100);
    setWidthPx(0);
    setHeightPx(0);
    setLockAspect(true);
    setFitMode("fit");
    setAllowUpscale(false);
    setOutputFormat("image/jpeg");
    setQuality(85);
    setIsExporting(false);
    setExportError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const warnings = file
    ? computeCropWarnings({
        isAnimated,
        hasTransparency,
        sourceLabel: formatLabel(file.type),
        outputFormat,
      })
    : [];

  const activePreset = getCropPreset(history.present.presetId);

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

      {file && sourceSize && previewOrientedSize && !selectError && (
        <>
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Original format</dt>
            <dd>{formatLabel(file.type)}</dd>
            <dt className="font-medium">Original size</dt>
            <dd>{formatBytes(file.size)}</dd>
            <dt className="font-medium">Dimensions</dt>
            <dd>
              {sourceSize.width}×{sourceSize.height}px
            </dd>
          </dl>

          <label htmlFor={presetId} className="flex flex-col gap-1">
            <span className={labelText}>Crop preset</span>
            <select
              id={presetId}
              value={history.present.presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className={selectField}
            >
              {CROP_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div
            ref={containerRef}
            className="border-border-strong bg-bg-sunken relative mx-auto w-full max-w-xl overflow-hidden rounded-md border"
            style={{
              aspectRatio: `${previewOrientedSize.width} / ${previewOrientedSize.height}`,
            }}
          >
            <canvas
              ref={previewCanvasRef}
              className="block h-full w-full"
              aria-hidden="true"
            />
            <CropOverlay
              rect={displayedRect}
              bounds={previewOrientedSize}
              aspect={activePreset?.aspect ?? null}
              containerRef={containerRef}
              onChange={setLiveRect}
              onCommit={handleCropCommit}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRotateCCW}
              className={buttonSecondary}
            >
              Rotate left
            </button>
            <button
              type="button"
              onClick={handleRotateCW}
              className={buttonSecondary}
            >
              Rotate right
            </button>
            <button
              type="button"
              onClick={handleFlipH}
              className={buttonSecondary}
            >
              Flip horizontal
            </button>
            <button
              type="button"
              onClick={handleFlipV}
              className={buttonSecondary}
            >
              Flip vertical
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo(history)}
              className={buttonGhost}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo(history)}
              className={buttonGhost}
            >
              Redo
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={resizeUnitId} className="flex flex-col gap-1">
              <span className={labelText}>Resize by</span>
              <select
                id={resizeUnitId}
                value={resizeUnit}
                onChange={(e) => setResizeUnit(e.target.value as ResizeUnit)}
                className={selectField}
              >
                <option value="percent">Percentage of crop</option>
                <option value="pixels">Exact pixels</option>
              </select>
            </label>

            <label htmlFor={fitModeId} className="flex flex-col gap-1">
              <span className={labelText}>Fit mode</span>
              <select
                id={fitModeId}
                value={fitMode}
                onChange={(e) => setFitMode(e.target.value as FitMode)}
                className={selectField}
              >
                {FIT_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {resizeUnit === "percent" ? (
              <label htmlFor={percentId} className="flex flex-col gap-1">
                <span className={labelText}>Percentage</span>
                <input
                  id={percentId}
                  type="number"
                  min={1}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className={textField}
                />
              </label>
            ) : (
              <div className="flex gap-3">
                <label htmlFor={widthId} className="flex flex-1 flex-col gap-1">
                  <span className={labelText}>Width (px)</span>
                  <input
                    id={widthId}
                    type="number"
                    min={1}
                    value={widthPx}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className={textField}
                  />
                </label>
                <label
                  htmlFor={heightId}
                  className="flex flex-1 flex-col gap-1"
                >
                  <span className={labelText}>Height (px)</span>
                  <input
                    id={heightId}
                    type="number"
                    min={1}
                    value={heightPx}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className={textField}
                  />
                </label>
              </div>
            )}

            <label htmlFor={lockAspectId} className="flex items-center gap-2">
              <input
                id={lockAspectId}
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => setLockAspect(e.target.checked)}
                className="accent-accent"
              />
              <span className={labelText}>Lock aspect ratio</span>
            </label>

            <label htmlFor={allowUpscaleId} className="flex items-center gap-2">
              <input
                id={allowUpscaleId}
                type="checkbox"
                checked={allowUpscale}
                onChange={(e) => setAllowUpscale(e.target.checked)}
                className="accent-accent"
              />
              <span className={labelText}>
                Allow upscaling beyond original resolution
              </span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={formatId} className="flex flex-col gap-1">
              <span className={labelText}>Export format</span>
              <select
                id={formatId}
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

          <StatusMessage tone="neutral">
            {planResult.ok
              ? `Output: ${planResult.value.canvasWidth}×${planResult.value.canvasHeight}px · estimated ${formatLabel(outputFormat)}${
                  planResult.value.upscaled
                    ? " · enlarged beyond the crop's original resolution"
                    : ""
                }`
              : planResult.message}
          </StatusMessage>

          {warnings.map((warning) => (
            <StatusMessage key={warning} tone="neutral">
              <strong className="font-medium">Warning: </strong>
              {warning}
            </StatusMessage>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || !planResult.ok}
              className={buttonPrimary}
            >
              {isExporting ? "Exporting…" : "Crop & export image"}
            </button>
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>
        </>
      )}

      {exportError && <StatusMessage tone="error">{exportError}</StatusMessage>}

      {result && !exportError && (
        <div className="flex flex-col gap-3">
          <img
            src={result.url}
            alt="Cropped and resized preview"
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
          <div>
            <button
              type="button"
              onClick={handleDownload}
              className={buttonSecondary}
            >
              Download cropped image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
