import { useId, useRef, useState } from "react";
import type { PDFDocument } from "pdf-lib";
import {
  MAX_FILE_BYTES,
  MAX_PAGES,
  checkPageLimit,
  formatBytes,
  numberedOutputFilename,
  sanitizeBaseName,
  singleOutputFilename,
  validatePdfFile,
} from "@/lib/tools-logic/pdf-split/file";
import { loadPdfDocument } from "@/lib/tools-logic/pdf-split/document";
import {
  chunkPages,
  complementPages,
  everyPageSeparately,
  normalizeRotation,
  parsePageRanges,
  parseRangeGroups,
} from "@/lib/tools-logic/pdf-split/ranges";
import { buildManyPdfs, buildPdf } from "@/lib/tools-logic/pdf-split/extract";
import { createZip } from "@/lib/tools-logic/pdf-split/zip";
import { downloadBlob } from "@/lib/tools-logic/download";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  textField,
} from "@/components/react/styles";
import { useThumbnails } from "@/islands/pdf-split/useThumbnails";
import { PageCard } from "@/islands/pdf-split/PageCard";

type Mode =
  "extract" | "remove" | "split-each" | "split-count" | "split-ranges";

const MODES: { id: Mode; label: string; helpText: string }[] = [
  {
    id: "extract",
    label: "Extract selected pages",
    helpText: "Copies the pages you select below into one new PDF.",
  },
  {
    id: "remove",
    label: "Remove selected pages",
    helpText:
      "Copies every page except the ones you select below into one new PDF.",
  },
  {
    id: "split-each",
    label: "Split every page into separate files",
    helpText: "Turns each page into its own single-page PDF.",
  },
  {
    id: "split-count",
    label: "Split by fixed page count",
    helpText: "Groups consecutive pages into files of a fixed size.",
  },
  {
    id: "split-ranges",
    label: "Split by custom ranges",
    helpText: "Each range on its own line becomes a separate PDF.",
  },
];

interface FileMeta {
  name: string;
  size: number;
}

type ResultFile =
  | {
      kind: "single";
      filename: string;
      blob: Blob;
      url: string;
      pageCount: number;
    }
  | {
      kind: "zip";
      filename: string;
      blob: Blob;
      url: string;
      fileCount: number;
    };

type Status = { tone: "error" | "neutral" | "success"; message: string };

export default function PdfSplitTool() {
  const pdfDocRef = useRef<PDFDocument | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const thumbnails = useThumbnails();

  const [mode, setMode] = useState<Mode>("extract");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rotations, setRotations] = useState<Map<number, number>>(new Map());

  const [rangeInput, setRangeInput] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [splitCount, setSplitCount] = useState(1);
  const [rangeGroupsInput, setRangeGroupsInput] = useState("");

  const [outputBaseName, setOutputBaseName] = useState("document");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [buildStatus, setBuildStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);
  const cancelRequestedRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const rangeInputId = useId();
  const splitCountId = useId();
  const rangeGroupsId = useId();
  const outputNameId = useId();

  const hasFile = fileMeta !== null;
  const showSelection = mode === "extract" || mode === "remove";

  async function processFile(file: File) {
    setLoadError(null);
    setBuildStatus(null);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);

    const validation = validatePdfFile(file);
    if (!validation.ok) {
      setLoadError(validation.message);
      return;
    }

    setIsLoadingFile(true);
    setLoadingMessage(`Reading ${file.name}…`);

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      setLoadError(`"${file.name}" couldn't be read from disk.`);
      setIsLoadingFile(false);
      setLoadingMessage(null);
      return;
    }

    const loaded = await loadPdfDocument(bytes);
    if (!loaded.ok) {
      setLoadError(loaded.message);
      setIsLoadingFile(false);
      setLoadingMessage(null);
      return;
    }

    const pageLimitCheck = checkPageLimit(loaded.value.pageCount);
    if (!pageLimitCheck.ok) {
      setLoadError(pageLimitCheck.message);
      setIsLoadingFile(false);
      setLoadingMessage(null);
      return;
    }

    pdfDocRef.current = loaded.value.doc;
    setFileMeta({ name: file.name, size: file.size });
    setPageCount(loaded.value.pageCount);
    setSelectedPages(new Set());
    setRotations(new Map());
    setRangeInput("");
    setRangeError(null);
    setSplitCount(Math.min(10, loaded.value.pageCount) || 1);
    setRangeGroupsInput("");
    setOutputBaseName(sanitizeBaseName(file.name));
    setIsLoadingFile(false);
    setLoadingMessage(null);

    void thumbnails.start(bytes, loaded.value.pageCount);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDropzoneActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDropzoneActive(true);
  }

  function handleDragLeave() {
    setIsDropzoneActive(false);
  }

  function handleToggleSelected(page: number) {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedPages(
      new Set(Array.from({ length: pageCount }, (_, i) => i + 1)),
    );
  }

  function handleClearSelection() {
    setSelectedPages(new Set());
  }

  function handleApplyRange() {
    const parsed = parsePageRanges(rangeInput, pageCount);
    if (!parsed.ok) {
      setRangeError(parsed.message);
      return;
    }
    setRangeError(null);
    setSelectedPages(new Set(parsed.value));
  }

  function applyRotationDelta(pages: Iterable<number>, delta: number) {
    setRotations((prev) => {
      const next = new Map(prev);
      for (const page of pages) {
        const value = normalizeRotation((next.get(page) ?? 0) + delta);
        if (value === 0) next.delete(page);
        else next.set(page, value);
      }
      return next;
    });
  }

  function handleRotatePage(page: number, delta: number) {
    applyRotationDelta([page], delta);
  }

  function handleRotateSelected(delta: number) {
    if (selectedPages.size === 0) return;
    applyRotationDelta(selectedPages, delta);
  }

  function handleReset() {
    if (result) URL.revokeObjectURL(result.url);
    cancelRequestedRef.current = true;
    thumbnails.reset();
    pdfDocRef.current = null;
    setFileMeta(null);
    setPageCount(0);
    setLoadError(null);
    setIsLoadingFile(false);
    setLoadingMessage(null);
    setMode("extract");
    setSelectedPages(new Set());
    setRotations(new Map());
    setRangeInput("");
    setRangeError(null);
    setSplitCount(1);
    setRangeGroupsInput("");
    setOutputBaseName("document");
    setIsBuilding(false);
    setBuildProgress(null);
    setBuildStatus(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    const doc = pdfDocRef.current;
    if (!doc || isBuilding) return;

    let groups: number[][];

    if (mode === "extract") {
      if (selectedPages.size === 0) {
        setBuildStatus({
          tone: "error",
          message: "Select at least one page to extract.",
        });
        return;
      }
      groups = [[...selectedPages].sort((a, b) => a - b)];
    } else if (mode === "remove") {
      if (selectedPages.size === 0) {
        setBuildStatus({
          tone: "error",
          message: "Select at least one page to remove.",
        });
        return;
      }
      const remaining = complementPages(pageCount, selectedPages);
      if (remaining.length === 0) {
        setBuildStatus({
          tone: "error",
          message:
            "At least one page must remain — you can't remove every page.",
        });
        return;
      }
      groups = [remaining];
    } else if (mode === "split-each") {
      groups = everyPageSeparately(pageCount);
    } else if (mode === "split-count") {
      if (!Number.isInteger(splitCount) || splitCount < 1) {
        setBuildStatus({
          tone: "error",
          message: "Enter a whole number of at least 1 for pages per file.",
        });
        return;
      }
      groups = chunkPages(pageCount, splitCount);
    } else {
      const parsed = parseRangeGroups(rangeGroupsInput, pageCount);
      if (!parsed.ok) {
        setBuildStatus({ tone: "error", message: parsed.message });
        return;
      }
      groups = parsed.value;
    }

    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setBuildStatus(null);
    setIsBuilding(true);
    cancelRequestedRef.current = false;

    const baseName = sanitizeBaseName(outputBaseName);

    if (groups.length === 1) {
      const singleGroup = groups[0] as number[];
      setBuildProgress({ completed: 0, total: 1 });
      const built = await buildPdf(doc, singleGroup, rotations);
      setIsBuilding(false);
      setBuildProgress(null);

      if (!built.ok) {
        setBuildStatus({ tone: "error", message: built.message });
        return;
      }

      const blob = new Blob([new Uint8Array(built.value)], {
        type: "application/pdf",
      });
      setResult({
        kind: "single",
        filename: singleOutputFilename(baseName),
        blob,
        url: URL.createObjectURL(blob),
        pageCount: singleGroup.length,
      });
      setBuildStatus({
        tone: "success",
        message: `Built a PDF with ${singleGroup.length} page${singleGroup.length === 1 ? "" : "s"}.`,
      });
      return;
    }

    setBuildProgress({ completed: 0, total: groups.length });
    let lastUpdate = 0;
    const built = await buildManyPdfs(
      doc,
      groups,
      rotations,
      (index, total) => numberedOutputFilename(baseName, index, total),
      {
        onProgress: (progress) => {
          const now = performance.now();
          if (now - lastUpdate > 80 || progress.completed === progress.total) {
            lastUpdate = now;
            setBuildProgress(progress);
          }
        },
        shouldCancel: () => cancelRequestedRef.current,
      },
    );

    setIsBuilding(false);
    setBuildProgress(null);

    if (!built.ok) {
      setBuildStatus({
        tone: built.cancelled ? "neutral" : "error",
        message: built.message,
      });
      return;
    }

    const zipBytes = createZip(built.value);
    const blob = new Blob([new Uint8Array(zipBytes)], {
      type: "application/zip",
    });
    setResult({
      kind: "zip",
      filename: `${baseName}.zip`,
      blob,
      url: URL.createObjectURL(blob),
      fileCount: built.value.length,
    });
    setBuildStatus({
      tone: "success",
      message: `Built ${built.value.length} PDFs and bundled them into a ZIP.`,
    });
  }

  function handleCancelBuild() {
    cancelRequestedRef.current = true;
  }

  function handleDownload() {
    if (!result) return;
    downloadBlob(result.filename, result.blob);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={fileInputId} className={labelText}>
          PDF file
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            isDropzoneActive
              ? "border-accent bg-accent/5"
              : "border-border-strong"
          }`}
        >
          <p className="text-text-muted mb-2 text-sm">
            Drag a PDF file here, or choose one below
          </p>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="application/pdf,.pdf"
            disabled={isLoadingFile}
            onChange={handleFileInputChange}
            className="text-text-muted file:bg-bg-elevated file:text-text file:border-border-strong hover:file:bg-bg-sunken mx-auto text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </div>
      </div>

      {isLoadingFile && loadingMessage && (
        <StatusMessage tone="neutral">{loadingMessage}</StatusMessage>
      )}

      {loadError && <StatusMessage tone="error">{loadError}</StatusMessage>}

      {hasFile && fileMeta && (
        <>
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <dt className="font-medium">File</dt>
            <dd className="col-span-1 truncate sm:col-span-2">
              {fileMeta.name}
            </dd>
            <dt className="font-medium">Size</dt>
            <dd>{formatBytes(fileMeta.size)}</dd>
            <dt className="font-medium">Pages</dt>
            <dd>{pageCount}</dd>
          </dl>

          <fieldset className="flex flex-col gap-2">
            <legend className={labelText}>What do you want to do?</legend>
            <div className="flex flex-col gap-2">
              {MODES.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-md border p-2 text-sm ${
                    mode === m.id
                      ? "border-accent bg-accent/5"
                      : "border-border-strong"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                      className="accent-accent"
                    />
                    <span className="text-text font-medium">{m.label}</span>
                  </span>
                  <span className="text-text-muted pl-6">{m.helpText}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {showSelection && (
            <div className="flex flex-col gap-2">
              <label htmlFor={rangeInputId} className={labelText}>
                Select by range
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={rangeInputId}
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 6, 9-12"
                  className={`${textField} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={handleApplyRange}
                  className={buttonSecondary}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={buttonGhost}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className={buttonGhost}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateSelected(-90)}
                  disabled={selectedPages.size === 0}
                  className={buttonGhost}
                >
                  Rotate selected left
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateSelected(90)}
                  disabled={selectedPages.size === 0}
                  className={buttonGhost}
                >
                  Rotate selected right
                </button>
              </div>
              {rangeError && (
                <StatusMessage tone="error">{rangeError}</StatusMessage>
              )}
              <p className="text-text-muted text-sm" role="status">
                {selectedPages.size} of {pageCount} page
                {pageCount === 1 ? "" : "s"} selected
              </p>
            </div>
          )}

          {mode === "split-count" && (
            <label htmlFor={splitCountId} className="flex flex-col gap-1">
              <span className={labelText}>Pages per file</span>
              <input
                id={splitCountId}
                type="number"
                min={1}
                max={pageCount}
                step={1}
                value={splitCount}
                onChange={(e) => setSplitCount(Number(e.target.value))}
                className={`${textField} max-w-32`}
              />
            </label>
          )}

          {mode === "split-ranges" && (
            <label htmlFor={rangeGroupsId} className="flex flex-col gap-1">
              <span className={labelText}>
                Ranges — one output file per line
              </span>
              <textarea
                id={rangeGroupsId}
                value={rangeGroupsInput}
                onChange={(e) => setRangeGroupsInput(e.target.value)}
                placeholder={"1-3\n4-6\n7-10"}
                rows={4}
                className="border-border-strong bg-bg-elevated text-text placeholder:text-text-muted focus-visible:outline-accent w-full max-w-xs rounded-md border p-2 font-mono text-sm focus-visible:outline-2"
              />
            </label>
          )}

          {thumbnails.state.error && (
            <StatusMessage tone="neutral">
              {thumbnails.state.error}
            </StatusMessage>
          )}

          {thumbnails.state.isRendering && (
            <div className="flex flex-col gap-1">
              <progress
                value={thumbnails.state.rendered}
                max={thumbnails.state.total}
                className="accent-accent w-full"
              />
              <StatusMessage tone="neutral">
                Rendering previews… {thumbnails.state.rendered} of{" "}
                {thumbnails.state.total}
              </StatusMessage>
            </div>
          )}

          <ul className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <PageCard
                key={page}
                pageNumber={page}
                thumbnailUrl={thumbnails.state.urls.get(page)}
                rotation={rotations.get(page) ?? 0}
                selectable={showSelection}
                selected={selectedPages.has(page)}
                selectLabel={
                  mode === "remove"
                    ? `Select page ${page} to remove`
                    : `Select page ${page} to extract`
                }
                onToggleSelected={() => handleToggleSelected(page)}
                onRotate={(delta) => handleRotatePage(page, delta)}
              />
            ))}
          </ul>

          <label htmlFor={outputNameId} className="flex flex-col gap-1">
            <span className={labelText}>Output filename</span>
            <div className="flex max-w-sm items-center gap-2">
              <input
                id={outputNameId}
                type="text"
                value={outputBaseName}
                onChange={(e) => setOutputBaseName(e.target.value)}
                className={textField}
              />
              <span className="text-text-muted text-sm">
                {mode === "split-each" ||
                mode === "split-count" ||
                mode === "split-ranges"
                  ? "-1.pdf, -2.pdf, …"
                  : ".pdf"}
              </span>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isBuilding}
              className={buttonPrimary}
            >
              {isBuilding ? "Working…" : "Generate"}
            </button>
            {isBuilding && (
              <button
                type="button"
                onClick={handleCancelBuild}
                className={buttonGhost}
              >
                Cancel
              </button>
            )}
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>

          {isBuilding && buildProgress && (
            <div className="flex flex-col gap-1">
              <progress
                value={buildProgress.completed}
                max={buildProgress.total}
                className="accent-accent w-full"
              />
              <StatusMessage tone="neutral">
                Building file {buildProgress.completed} of {buildProgress.total}
                …
              </StatusMessage>
            </div>
          )}

          {buildStatus && !isBuilding && (
            <StatusMessage tone={buildStatus.tone}>
              {buildStatus.message}
            </StatusMessage>
          )}

          {result && (
            <div className="flex flex-col gap-3">
              <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="font-medium">Output</dt>
                <dd role="status">
                  {result.kind === "single"
                    ? `${result.filename} · ${formatBytes(result.blob.size)}`
                    : `${result.fileCount} PDFs in ${result.filename} · ${formatBytes(result.blob.size)}`}
                </dd>
              </dl>
              <div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className={buttonSecondary}
                >
                  {result.kind === "single" ? "Download PDF" : "Download ZIP"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-text-muted text-xs">
        Files up to {formatBytes(MAX_FILE_BYTES)} and {MAX_PAGES} pages are
        supported for in-browser processing. Password-protected PDFs can't be
        opened here — remove the password in a PDF reader you trust first.
      </p>
    </div>
  );
}
