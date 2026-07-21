import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clampZoom,
  computeFitZoom,
  screenToCanvasPoint,
  toNormalized,
  toPixels,
  type Point,
  type Size,
} from "@/lib/tools-logic/image-watermark/geometry";
import {
  computeSingleCenter,
  isRepeatingPreset,
  POSITION_PRESETS,
  type PositionPreset,
  type WatermarkLayoutSettings,
} from "@/lib/tools-logic/image-watermark/placements";
import {
  measureWatermarkContent,
  renderWatermarkLayer,
  type ImageWatermarkContent,
  type TextWatermarkContent,
  type WatermarkContent,
  type WatermarkStyle,
} from "@/lib/tools-logic/image-watermark/watermarkDraw";
import type {
  NormPoint,
  RepairOperation,
} from "@/lib/tools-logic/image-watermark/maskOps";
import { applyRepairOperations } from "@/lib/tools-logic/image-watermark/applyOperations";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo as historyRedo,
  undo as historyUndo,
  type HistoryState,
} from "@/lib/tools-logic/image-watermark/history";
import {
  computeWorkingSize,
  formatBytes,
  mimeToExtension,
  outputFilename,
  validateImageFile,
} from "@/lib/tools-logic/image-watermark/file";
import { downloadBlob } from "@/lib/tools-logic/download";
import {
  decodeImageFile,
  drawBitmapToImageData,
  generateOperationId,
  toImageData,
} from "@/islands/image-watermark-studio/decode";
import { WatermarkOverlay } from "@/islands/image-watermark-studio/WatermarkOverlay";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  selectField,
  textField,
} from "@/components/react/styles";

type Mode = "watermark" | "repair";
type WatermarkType = "text" | "image";
type RepairTool = "brush" | "box" | "lasso" | "clone";
type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

interface TextSettings {
  text: string;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
}

const DEFAULT_TEXT_SETTINGS: TextSettings = {
  text: "© Your Name",
  fontFamily: "Arial, sans-serif",
  color: "#ffffff",
  bold: true,
  italic: false,
  shadow: true,
  shadowColor: "#000000",
  shadowBlur: 4,
};

const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "Impact, sans-serif", label: "Impact" },
];

const DEFAULT_LAYOUT: WatermarkLayoutSettings = {
  preset: "center",
  customCenter: { x: 0.5, y: 0.5 },
  paddingFraction: 0.03,
  tileSpacingFraction: 0.12,
  rotationDeg: 0,
};

const DEFAULT_STYLE: WatermarkStyle = { scalePercent: 22, opacityPercent: 60 };

const DEFAULT_BRUSH_RADIUS_PERCENT = 4;
const DEFAULT_FEATHER_PERCENT = 1.5;

const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "image/png", label: "PNG (lossless, keeps transparency)" },
  { value: "image/jpeg", label: "JPEG (no transparency)" },
  { value: "image/webp", label: "WebP" },
];

interface Stroke {
  kind: RepairTool;
  points: NormPoint[];
  startPoint: NormPoint;
}

interface ExportResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

function getMeasureCtx(): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

export default function ImageWatermarkStudioTool() {
  // --- source image state ---
  const [file, setFile] = useState<File | null>(null);
  const [sourceBitmap, setSourceBitmap] = useState<ImageBitmap | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<Size | null>(
    null,
  );
  const [workingSize, setWorkingSize] = useState<Size | null>(null);
  const [baseWorkingImageData, setBaseWorkingImageData] =
    useState<ImageData | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  // --- mode / shared editor state ---
  const [mode, setMode] = useState<Mode>("watermark");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [panActive, setPanActive] = useState(false);

  // --- watermark mode state ---
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [textSettings, setTextSettings] = useState<TextSettings>(
    DEFAULT_TEXT_SETTINGS,
  );
  const [logoBitmap, setLogoBitmap] = useState<ImageBitmap | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [layout, setLayout] = useState<WatermarkLayoutSettings>(DEFAULT_LAYOUT);
  const [style, setStyle] = useState<WatermarkStyle>(DEFAULT_STYLE);

  // --- repair mode state ---
  const [repairTool, setRepairTool] = useState<RepairTool>("brush");
  const [brushRadiusPercent, setBrushRadiusPercent] = useState(
    DEFAULT_BRUSH_RADIUS_PERCENT,
  );
  const [featherPercent, setFeatherPercent] = useState(DEFAULT_FEATHER_PERCENT);
  const [opsHistory, setOpsHistory] = useState<HistoryState<RepairOperation[]>>(
    () => createHistory<RepairOperation[]>([]),
  );
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [settingCloneSource, setSettingCloneSource] = useState(false);
  const [cloneSourcePoint, setCloneSourcePoint] = useState<NormPoint | null>(
    null,
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const cloneOffsetRef = useRef<NormPoint | null>(null);

  // --- export state ---
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/png");
  const [qualityPercent, setQualityPercent] = useState(90);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const panDragRef = useRef<{ startClient: Point; startPan: Point } | null>(
    null,
  );

  const fileInputId = useId();
  const logoInputId = useId();
  const textId = useId();
  const fontId = useId();
  const colorId = useId();
  const shadowColorId = useId();
  const shadowBlurId = useId();
  const scaleId = useId();
  const opacityId = useId();
  const paddingId = useId();
  const spacingId = useId();
  const rotationId = useId();
  const brushId = useId();
  const featherId = useId();
  const formatId = useId();
  const qualityId = useId();

  function getMeasureContext(): CanvasRenderingContext2D | null {
    if (!measureCtxRef.current) measureCtxRef.current = getMeasureCtx();
    return measureCtxRef.current;
  }

  // Tracks the latest resources so the unmount cleanup below (which only runs
  // once) can release whatever is current at that point, not what was
  // current when the effect was first set up.
  const latestResourcesRef = useRef({
    sourceBitmap,
    logoBitmap,
    resultUrl: result?.url ?? null,
  });
  latestResourcesRef.current = {
    sourceBitmap,
    logoBitmap,
    resultUrl: result?.url ?? null,
  };

  useEffect(() => {
    return () => {
      latestResourcesRef.current.sourceBitmap?.close();
      latestResourcesRef.current.logoBitmap?.close();
      if (latestResourcesRef.current.resultUrl) {
        URL.revokeObjectURL(latestResourcesRef.current.resultUrl);
      }
    };
  }, []);

  const ops = opsHistory.present;

  const composedWorkingImageData = useMemo<ImageData | null>(() => {
    if (!baseWorkingImageData) return null;
    if (ops.length === 0) return baseWorkingImageData;
    return toImageData(applyRepairOperations(baseWorkingImageData, ops));
  }, [baseWorkingImageData, ops]);

  const activeContent: WatermarkContent | null = useMemo(() => {
    if (watermarkType === "text") {
      const content: TextWatermarkContent = {
        kind: "text",
        text: textSettings.text,
        fontFamily: textSettings.fontFamily,
        color: textSettings.color,
        bold: textSettings.bold,
        italic: textSettings.italic,
        shadow: textSettings.shadow,
        shadowColor: textSettings.shadowColor,
        shadowBlur: textSettings.shadowBlur,
      };
      return content;
    }
    if (!logoBitmap) return null;
    const content: ImageWatermarkContent = {
      kind: "image",
      image: logoBitmap,
      naturalWidth: logoBitmap.width,
      naturalHeight: logoBitmap.height,
    };
    return content;
  }, [watermarkType, textSettings, logoBitmap]);

  const hasRenderableWatermark =
    !!activeContent &&
    (activeContent.kind === "image" || activeContent.text.trim().length > 0);

  const contentSizeWorking = useMemo<Size | null>(() => {
    if (!workingSize || !hasRenderableWatermark || !activeContent) return null;
    const ctx = getMeasureContext();
    if (!ctx) return null;
    return measureWatermarkContent(
      ctx,
      activeContent,
      workingSize.width,
      style,
    );
  }, [workingSize, activeContent, style, hasRenderableWatermark]);

  const overlayCenterPx = useMemo<Point | null>(() => {
    const preset = layout.preset;
    if (!workingSize || !contentSizeWorking || isRepeatingPreset(preset))
      return null;
    const centerNorm = computeSingleCenter(
      preset,
      workingSize,
      contentSizeWorking,
      layout.paddingFraction,
      layout.customCenter,
    );
    return toPixels(centerNorm, workingSize);
  }, [workingSize, contentSizeWorking, layout]);

  // --- redraw the working canvas whenever anything visible changes ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !workingSize || !sourceBitmap) return;
    canvas.width = workingSize.width;
    canvas.height = workingSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (mode === "repair") {
      const imageData = showOriginal
        ? baseWorkingImageData
        : composedWorkingImageData;
      if (imageData) ctx.putImageData(imageData, 0, 0);
      if (activeStroke && !showOriginal) {
        paintStrokePreview(
          ctx,
          activeStroke,
          workingSize,
          brushRadiusPercent / 100,
        );
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sourceBitmap, 0, 0, workingSize.width, workingSize.height);
      if (hasRenderableWatermark && activeContent) {
        renderWatermarkLayer(ctx, workingSize, activeContent, style, layout);
      }
    }
  }, [
    mode,
    workingSize,
    sourceBitmap,
    composedWorkingImageData,
    baseWorkingImageData,
    showOriginal,
    activeStroke,
    brushRadiusPercent,
    hasRenderableWatermark,
    activeContent,
    style,
    layout,
  ]);

  function paintStrokePreview(
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    size: Size,
    radiusFraction: number,
  ) {
    if (stroke.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,0.8)";
    ctx.lineWidth = Math.max(1, radiusFraction * size.width * 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const first = toPixels(stroke.points[0] as NormPoint, size);
    ctx.moveTo(first.x, first.y);
    if (stroke.kind === "box") {
      const last = toPixels(
        stroke.points[stroke.points.length - 1] as NormPoint,
        size,
      );
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(59,130,246,0.9)";
      ctx.strokeRect(
        Math.min(first.x, last.x),
        Math.min(first.y, last.y),
        Math.abs(last.x - first.x),
        Math.abs(last.y - first.y),
      );
    } else {
      for (const p of stroke.points) {
        const px = toPixels(p, size);
        ctx.lineTo(px.x, px.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function containerOrigin(): Point {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
  }

  function getCanvasPoint(e: React.PointerEvent): Point {
    return screenToCanvasPoint(
      { x: e.clientX, y: e.clientY },
      containerOrigin(),
      zoom,
      pan,
    );
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
      return;
    }
    const decoded = await decodeImageFile(selected);
    if (!decoded.ok) {
      setSelectError(decoded.message);
      return;
    }

    const dims: Size = {
      width: decoded.value.width,
      height: decoded.value.height,
    };
    const working = computeWorkingSize(dims.width, dims.height);
    const imageData = drawBitmapToImageData(decoded.value, working);
    if (!imageData) {
      setSelectError(
        "Canvas isn't supported in this browser, so images can't be edited here.",
      );
      decoded.value.close();
      return;
    }

    sourceBitmap?.close();
    setSelectError(null);
    setFile(selected);
    setSourceBitmap(decoded.value);
    setOriginalDimensions(dims);
    setWorkingSize(working);
    setBaseWorkingImageData(imageData);
    setOpsHistory(createHistory<RepairOperation[]>([]));
    setLayout(DEFAULT_LAYOUT);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validation = validateImageFile(selected);
    if (!validation.ok) {
      setLogoError(validation.message);
      return;
    }
    const decoded = await decodeImageFile(selected);
    if (!decoded.ok) {
      setLogoError(decoded.message);
      return;
    }
    logoBitmap?.close();
    setLogoError(null);
    setLogoName(selected.name);
    setLogoBitmap(decoded.value);
  }

  // --- watermark drag/resize handlers ---
  const handleOverlayMove = useCallback((normalizedCenter: Point) => {
    setLayout((prev) => ({
      ...prev,
      preset: "custom",
      customCenter: normalizedCenter,
    }));
  }, []);
  const handleOverlayResize = useCallback((scalePercent: number) => {
    setStyle((prev) => ({ ...prev, scalePercent }));
  }, []);

  // --- repair canvas pointer handlers ---
  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!workingSize) return;
    (e.target as Element).setPointerCapture(e.pointerId);

    if (panActive) {
      panDragRef.current = {
        startClient: { x: e.clientX, y: e.clientY },
        startPan: pan,
      };
      return;
    }
    if (mode !== "repair") return;

    const point = toNormalized(getCanvasPoint(e), workingSize);

    if (repairTool === "clone" && settingCloneSource) {
      setCloneSourcePoint(point);
      setSettingCloneSource(false);
      cloneOffsetRef.current = null;
      return;
    }
    if (repairTool === "clone" && !cloneSourcePoint) return;

    setActiveStroke({ kind: repairTool, points: [point], startPoint: point });
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (panDragRef.current) {
      const dx = e.clientX - panDragRef.current.startClient.x;
      const dy = e.clientY - panDragRef.current.startClient.y;
      setPan({
        x: panDragRef.current.startPan.x + dx,
        y: panDragRef.current.startPan.y + dy,
      });
      return;
    }
    if (!activeStroke || !workingSize) return;
    const point = toNormalized(getCanvasPoint(e), workingSize);
    setActiveStroke((prev) => {
      if (!prev) return prev;
      if (prev.kind === "box")
        return { ...prev, points: [prev.startPoint, point] };
      return { ...prev, points: [...prev.points, point] };
    });
  }

  function handleCanvasPointerUp() {
    if (panDragRef.current) {
      panDragRef.current = null;
      return;
    }
    if (!activeStroke) return;
    finalizeStroke(activeStroke);
    setActiveStroke(null);
  }

  function finalizeStroke(stroke: Stroke) {
    const feather = featherPercent / 100;
    const radius = brushRadiusPercent / 100;
    let op: RepairOperation | null = null;

    if (stroke.kind === "brush") {
      op = {
        id: generateOperationId(),
        kind: "brush",
        points: stroke.points,
        radius,
        feather,
      };
    } else if (stroke.kind === "clone") {
      if (!cloneSourcePoint) return;
      if (!cloneOffsetRef.current) {
        cloneOffsetRef.current = {
          x: stroke.startPoint.x - cloneSourcePoint.x,
          y: stroke.startPoint.y - cloneSourcePoint.y,
        };
      }
      op = {
        id: generateOperationId(),
        kind: "clone",
        points: stroke.points,
        radius,
        feather,
        sourceOffset: cloneOffsetRef.current,
      };
    } else if (stroke.kind === "box") {
      const a = stroke.points[0] as NormPoint;
      const b = (stroke.points[stroke.points.length - 1] as NormPoint) ?? a;
      const rect = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
      };
      if (rect.width <= 0.002 || rect.height <= 0.002) return;
      op = { id: generateOperationId(), kind: "box", rect, feather };
    } else if (stroke.kind === "lasso") {
      if (stroke.points.length < 3) return;
      op = {
        id: generateOperationId(),
        kind: "lasso",
        points: stroke.points,
        feather,
      };
    }

    if (!op) return;
    setOpsHistory((h) => pushHistory(h, [...h.present, op as RepairOperation]));
  }

  function handleUndo() {
    setOpsHistory((h) => historyUndo(h));
  }
  function handleRedo() {
    setOpsHistory((h) => historyRedo(h));
  }

  // --- zoom controls ---
  function handleZoomIn() {
    setZoom((z) => clampZoom(z + 0.25));
  }
  function handleZoomOut() {
    setZoom((z) => clampZoom(z - 0.25));
  }
  function handleFit() {
    if (!workingSize || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setZoom(
      computeFitZoom(workingSize, { width: rect.width, height: rect.height }),
    );
    setPan({ x: 0, y: 0 });
  }

  // --- export ---
  async function handleRender() {
    if (!file || !sourceBitmap || !originalDimensions) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = originalDimensions.width;
      canvas.height = originalDimensions.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setExportError(
          "Canvas isn't supported in this browser, so nothing can be exported.",
        );
        return;
      }

      if (outputFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (mode === "repair") {
        const tmp = document.createElement("canvas");
        tmp.width = originalDimensions.width;
        tmp.height = originalDimensions.height;
        const tmpCtx = tmp.getContext("2d");
        if (!tmpCtx) {
          setExportError(
            "Canvas isn't supported in this browser, so nothing can be exported.",
          );
          return;
        }
        tmpCtx.drawImage(sourceBitmap, 0, 0);
        const fullImageData = tmpCtx.getImageData(0, 0, tmp.width, tmp.height);
        const repaired = applyRepairOperations(fullImageData, ops);
        tmpCtx.putImageData(toImageData(repaired), 0, 0);
        ctx.drawImage(tmp, 0, 0);
      } else {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(sourceBitmap, 0, 0, canvas.width, canvas.height);
        if (hasRenderableWatermark && activeContent) {
          renderWatermarkLayer(
            ctx,
            { width: canvas.width, height: canvas.height },
            activeContent,
            style,
            layout,
          );
        }
      }

      const quality =
        outputFormat === "image/png" ? undefined : qualityPercent / 100;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputFormat, quality),
      );
      if (!blob) {
        setExportError("Couldn't encode the image in this browser.");
        return;
      }
      if (result) URL.revokeObjectURL(result.url);
      setResult({
        url: URL.createObjectURL(blob),
        blob,
        width: canvas.width,
        height: canvas.height,
      });
    } finally {
      setIsExporting(false);
    }
  }

  function handleDownload() {
    if (!result || !file) return;
    const extension = mimeToExtension(outputFormat);
    const suffix = mode === "watermark" ? "watermarked" : "repaired";
    downloadBlob(outputFilename(file.name, extension, suffix), result.blob);
  }

  function handleReset() {
    sourceBitmap?.close();
    logoBitmap?.close();
    if (result) URL.revokeObjectURL(result.url);

    setFile(null);
    setSourceBitmap(null);
    setOriginalDimensions(null);
    setWorkingSize(null);
    setBaseWorkingImageData(null);
    setSelectError(null);

    setMode("watermark");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPanActive(false);

    setWatermarkType("text");
    setTextSettings(DEFAULT_TEXT_SETTINGS);
    setLogoBitmap(null);
    setLogoName(null);
    setLogoError(null);
    setLayout(DEFAULT_LAYOUT);
    setStyle(DEFAULT_STYLE);

    setRepairTool("brush");
    setBrushRadiusPercent(DEFAULT_BRUSH_RADIUS_PERCENT);
    setFeatherPercent(DEFAULT_FEATHER_PERCENT);
    setOpsHistory(createHistory<RepairOperation[]>([]));
    setActiveStroke(null);
    setSettingCloneSource(false);
    setCloneSourcePoint(null);
    cloneOffsetRef.current = null;
    setShowOriginal(false);

    setOutputFormat("image/png");
    setQualityPercent(90);
    setIsExporting(false);
    setExportError(null);
    setResult(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  const canvasCursor = panActive
    ? "cursor-grab"
    : mode === "repair" && repairTool === "clone" && settingCloneSource
      ? "cursor-crosshair"
      : mode === "repair"
        ? "cursor-crosshair"
        : "cursor-default";

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

      {file && workingSize && originalDimensions && !selectError && (
        <>
          <dl className="text-text-muted flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1">
              <dt className="font-medium">File</dt>
              <dd>{file.name}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-medium">Dimensions</dt>
              <dd>
                {originalDimensions.width}×{originalDimensions.height}px
              </dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-medium">Size</dt>
              <dd>{formatBytes(file.size)}</dd>
            </div>
          </dl>

          <div
            role="tablist"
            aria-label="Editing mode"
            className="border-border-strong inline-flex w-fit gap-1 rounded-md border p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "watermark"}
              onClick={() => setMode("watermark")}
              className={mode === "watermark" ? buttonPrimary : buttonGhost}
            >
              Add watermark
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "repair"}
              onClick={() => setMode("repair")}
              className={mode === "repair" ? buttonPrimary : buttonGhost}
            >
              Remove / repair
            </button>
          </div>

          {mode === "repair" && (
            <StatusMessage tone="neutral">
              <strong className="font-medium">
                Only use this on images you own or have permission to edit
              </strong>
              {
                " — for example, removing your own watermark, timestamps, dust, or blemishes. Don't use it to remove ownership marks, watermarks, or credits from images that aren't yours."
              }
            </StatusMessage>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className={buttonGhost}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="text-text-muted w-14 text-center text-sm">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className={buttonGhost}
              aria-label="Zoom in"
            >
              +
            </button>
            <button type="button" onClick={handleFit} className={buttonGhost}>
              Fit
            </button>
            <button
              type="button"
              aria-pressed={panActive}
              onClick={() => setPanActive((v) => !v)}
              className={panActive ? buttonSecondary : buttonGhost}
            >
              Pan tool
            </button>
            {mode === "repair" && (
              <button
                type="button"
                aria-pressed={showOriginal}
                onClick={() => setShowOriginal((v) => !v)}
                className={showOriginal ? buttonSecondary : buttonGhost}
              >
                {showOriginal ? "Showing original" : "Show original"}
              </button>
            )}
          </div>

          <div
            className="border-border-strong bg-bg-sunken relative overflow-hidden rounded-md border"
            style={{
              height: 480,
              backgroundImage:
                "linear-gradient(45deg, rgba(128,128,128,0.15) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,0.15) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.15) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.15) 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            }}
          >
            <div
              ref={containerRef}
              className="relative h-full w-full overflow-hidden"
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label={
                    mode === "watermark"
                      ? "Watermark preview. Use the position controls to place the watermark."
                      : "Repair preview. Use the brush, box, or lasso tool to select an area to repair."
                  }
                  className={canvasCursor}
                  style={{ display: "block", touchAction: "none" }}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                />
                {mode === "watermark" &&
                  !panActive &&
                  hasRenderableWatermark &&
                  overlayCenterPx &&
                  contentSizeWorking &&
                  workingSize && (
                    <WatermarkOverlay
                      centerPx={overlayCenterPx}
                      sizePx={contentSizeWorking}
                      rotationDeg={layout.rotationDeg}
                      workingSize={workingSize}
                      containerRef={containerRef}
                      zoom={zoom}
                      pan={pan}
                      scalePercent={style.scalePercent}
                      onMove={handleOverlayMove}
                      onResizeScalePercent={handleOverlayResize}
                    />
                  )}
              </div>
            </div>
          </div>

          {mode === "watermark" ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={watermarkType === "text"}
                  onClick={() => setWatermarkType("text")}
                  className={
                    watermarkType === "text" ? buttonSecondary : buttonGhost
                  }
                >
                  Text watermark
                </button>
                <button
                  type="button"
                  aria-pressed={watermarkType === "image"}
                  onClick={() => setWatermarkType("image")}
                  className={
                    watermarkType === "image" ? buttonSecondary : buttonGhost
                  }
                >
                  Logo image watermark
                </button>
              </div>

              {watermarkType === "text" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label
                    htmlFor={textId}
                    className="flex flex-col gap-1 sm:col-span-2"
                  >
                    <span className={labelText}>Watermark text</span>
                    <input
                      id={textId}
                      type="text"
                      value={textSettings.text}
                      onChange={(e) =>
                        setTextSettings((s) => ({ ...s, text: e.target.value }))
                      }
                      className={textField}
                    />
                  </label>

                  <label htmlFor={fontId} className="flex flex-col gap-1">
                    <span className={labelText}>Font</span>
                    <select
                      id={fontId}
                      value={textSettings.fontFamily}
                      onChange={(e) =>
                        setTextSettings((s) => ({
                          ...s,
                          fontFamily: e.target.value,
                        }))
                      }
                      className={selectField}
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor={colorId} className="flex flex-col gap-1">
                    <span className={labelText}>Color</span>
                    <input
                      id={colorId}
                      type="color"
                      value={textSettings.color}
                      onChange={(e) =>
                        setTextSettings((s) => ({
                          ...s,
                          color: e.target.value,
                        }))
                      }
                      className="border-border-strong h-10 w-full rounded-md border"
                    />
                  </label>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={textSettings.bold}
                        onChange={(e) =>
                          setTextSettings((s) => ({
                            ...s,
                            bold: e.target.checked,
                          }))
                        }
                      />
                      Bold
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={textSettings.italic}
                        onChange={(e) =>
                          setTextSettings((s) => ({
                            ...s,
                            italic: e.target.checked,
                          }))
                        }
                      />
                      Italic
                    </label>
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={textSettings.shadow}
                        onChange={(e) =>
                          setTextSettings((s) => ({
                            ...s,
                            shadow: e.target.checked,
                          }))
                        }
                      />
                      Drop shadow
                    </label>
                    {textSettings.shadow && (
                      <div className="flex flex-wrap items-end gap-4 pl-6">
                        <label
                          htmlFor={shadowColorId}
                          className="flex flex-col gap-1"
                        >
                          <span className={labelText}>Shadow color</span>
                          <input
                            id={shadowColorId}
                            type="color"
                            value={textSettings.shadowColor}
                            onChange={(e) =>
                              setTextSettings((s) => ({
                                ...s,
                                shadowColor: e.target.value,
                              }))
                            }
                            className="border-border-strong h-9 w-16 rounded-md border"
                          />
                        </label>
                        <label
                          htmlFor={shadowBlurId}
                          className="flex flex-col gap-1"
                        >
                          <span className={labelText}>
                            Blur: {textSettings.shadowBlur}px
                          </span>
                          <input
                            id={shadowBlurId}
                            type="range"
                            min={0}
                            max={20}
                            value={textSettings.shadowBlur}
                            onChange={(e) =>
                              setTextSettings((s) => ({
                                ...s,
                                shadowBlur: Number(e.target.value),
                              }))
                            }
                            className="accent-accent"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label htmlFor={logoInputId} className={labelText}>
                    Logo image (PNG with transparency recommended)
                  </label>
                  <input
                    ref={logoInputRef}
                    id={logoInputId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
                    onChange={handleLogoChange}
                    className="text-text-muted file:bg-bg-elevated file:text-text file:border-border-strong hover:file:bg-bg-sunken text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
                  />
                  {logoError && (
                    <StatusMessage tone="error">{logoError}</StatusMessage>
                  )}
                  {logoName && !logoError && (
                    <p className="text-text-muted text-sm">Using: {logoName}</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label htmlFor={scaleId} className="flex flex-col gap-1">
                  <span className={labelText}>
                    Size: {style.scalePercent}% of image width
                  </span>
                  <input
                    id={scaleId}
                    type="range"
                    min={2}
                    max={95}
                    value={style.scalePercent}
                    onChange={(e) =>
                      setStyle((s) => ({
                        ...s,
                        scalePercent: Number(e.target.value),
                      }))
                    }
                    className="accent-accent"
                  />
                </label>
                <label htmlFor={opacityId} className="flex flex-col gap-1">
                  <span className={labelText}>
                    Opacity: {style.opacityPercent}%
                  </span>
                  <input
                    id={opacityId}
                    type="range"
                    min={5}
                    max={100}
                    value={style.opacityPercent}
                    onChange={(e) =>
                      setStyle((s) => ({
                        ...s,
                        opacityPercent: Number(e.target.value),
                      }))
                    }
                    className="accent-accent"
                  />
                </label>
                <label htmlFor={rotationId} className="flex flex-col gap-1">
                  <span className={labelText}>
                    Rotation: {layout.rotationDeg}°
                  </span>
                  <input
                    id={rotationId}
                    type="range"
                    min={-180}
                    max={180}
                    value={layout.rotationDeg}
                    onChange={(e) =>
                      setLayout((l) => ({
                        ...l,
                        rotationDeg: Number(e.target.value),
                      }))
                    }
                    className="accent-accent"
                  />
                </label>
                {isRepeatingPreset(layout.preset) ? (
                  <label htmlFor={spacingId} className="flex flex-col gap-1">
                    <span className={labelText}>
                      Spacing: {Math.round(layout.tileSpacingFraction * 100)}%
                    </span>
                    <input
                      id={spacingId}
                      type="range"
                      min={1}
                      max={40}
                      value={Math.round(layout.tileSpacingFraction * 100)}
                      onChange={(e) =>
                        setLayout((l) => ({
                          ...l,
                          tileSpacingFraction: Number(e.target.value) / 100,
                        }))
                      }
                      className="accent-accent"
                    />
                  </label>
                ) : (
                  <label htmlFor={paddingId} className="flex flex-col gap-1">
                    <span className={labelText}>
                      Edge padding: {Math.round(layout.paddingFraction * 100)}%
                    </span>
                    <input
                      id={paddingId}
                      type="range"
                      min={0}
                      max={20}
                      value={Math.round(layout.paddingFraction * 100)}
                      onChange={(e) =>
                        setLayout((l) => ({
                          ...l,
                          paddingFraction: Number(e.target.value) / 100,
                        }))
                      }
                      className="accent-accent"
                    />
                  </label>
                )}
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className={labelText}>Position preset</legend>
                <div className="flex flex-wrap gap-2">
                  {POSITION_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      aria-pressed={layout.preset === p.value}
                      onClick={() =>
                        setLayout((l) => ({
                          ...l,
                          preset: p.value as PositionPreset,
                        }))
                      }
                      className={
                        layout.preset === p.value
                          ? buttonSecondary
                          : buttonGhost
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className={labelText}>Repair tool</legend>
                <div className="flex flex-wrap gap-2">
                  {(["brush", "box", "lasso", "clone"] as RepairTool[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={repairTool === t}
                        onClick={() => {
                          setRepairTool(t);
                          if (t !== "clone") setSettingCloneSource(false);
                        }}
                        className={
                          repairTool === t ? buttonSecondary : buttonGhost
                        }
                      >
                        {t === "brush" && "Brush (content-aware)"}
                        {t === "box" && "Box select"}
                        {t === "lasso" && "Lasso"}
                        {t === "clone" && "Clone stamp"}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>

              {repairTool === "clone" && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    aria-pressed={settingCloneSource}
                    onClick={() => setSettingCloneSource((v) => !v)}
                    className={
                      settingCloneSource ? buttonSecondary : buttonGhost
                    }
                  >
                    {settingCloneSource
                      ? "Click the source point…"
                      : "Set source point"}
                  </button>
                  <span className="text-text-muted text-sm">
                    {cloneSourcePoint
                      ? "Source set — paint over the area to repair."
                      : "Set a source point before painting."}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label htmlFor={brushId} className="flex flex-col gap-1">
                  <span className={labelText}>
                    Brush size: {brushRadiusPercent}%
                  </span>
                  <input
                    id={brushId}
                    type="range"
                    min={0.5}
                    max={20}
                    step={0.5}
                    value={brushRadiusPercent}
                    onChange={(e) =>
                      setBrushRadiusPercent(Number(e.target.value))
                    }
                    className="accent-accent"
                    disabled={repairTool === "box" || repairTool === "lasso"}
                  />
                </label>
                <label htmlFor={featherId} className="flex flex-col gap-1">
                  <span className={labelText}>Feather: {featherPercent}%</span>
                  <input
                    id={featherId}
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={featherPercent}
                    onChange={(e) => setFeatherPercent(Number(e.target.value))}
                    className="accent-accent"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!canUndo(opsHistory)}
                  className={buttonGhost}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!canRedo(opsHistory)}
                  className={buttonGhost}
                >
                  Redo
                </button>
                <span className="text-text-muted text-sm">
                  {ops.length} repair {ops.length === 1 ? "edit" : "edits"}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={formatId} className="flex flex-col gap-1">
              <span className={labelText}>Output format</span>
              <select
                id={formatId}
                value={outputFormat}
                onChange={(e) =>
                  setOutputFormat(e.target.value as OutputFormat)
                }
                className={selectField}
              >
                {OUTPUT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            {outputFormat !== "image/png" && (
              <label htmlFor={qualityId} className="flex flex-col gap-1">
                <span className={labelText}>Quality: {qualityPercent}%</span>
                <input
                  id={qualityId}
                  type="range"
                  min={1}
                  max={100}
                  value={qualityPercent}
                  onChange={(e) => setQualityPercent(Number(e.target.value))}
                  className="accent-accent"
                />
              </label>
            )}
          </div>

          {outputFormat === "image/jpeg" && (
            <StatusMessage tone="neutral">
              JPEG doesn&apos;t support transparency — any transparent areas
              will be filled white.
            </StatusMessage>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRender}
              disabled={isExporting}
              className={buttonPrimary}
            >
              {isExporting
                ? "Rendering…"
                : `Render full-resolution ${mode === "watermark" ? "watermarked" : "repaired"} image`}
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
            alt="Rendered result"
            className="border-border-strong bg-bg-sunken h-48 w-48 rounded-md border object-contain"
          />
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Output size</dt>
            <dd>{formatBytes(result.blob.size)}</dd>
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
              Download {mode === "watermark" ? "watermarked" : "repaired"} image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
