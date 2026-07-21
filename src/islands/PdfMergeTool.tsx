import { useId, useRef, useState } from "react";
import type { PDFDocument } from "pdf-lib";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_PAGES,
  checkFileCountLimit,
  checkTotalPageLimit,
  formatBytes,
  sanitizeOutputFilename,
  validatePdfFile,
} from "@/lib/tools-logic/pdf-merge/file";
import { loadPdfDocument } from "@/lib/tools-logic/pdf-merge/document";
import {
  EMPTY_MERGE_STATE,
  addSourceGroup,
  flattenPages,
  moveGroup,
  movePageWithinGroup,
  removeGroup,
  removePage,
  reorderIndex,
  rotatePage,
  totalPageCount,
  type MergeState,
} from "@/lib/tools-logic/pdf-merge/pages";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  undo,
  type HistoryState,
} from "@/lib/tools-logic/pdf-merge/history";
import {
  mergePdfs,
  type MergeProgress,
} from "@/lib/tools-logic/pdf-merge/merge";
import { downloadBlob } from "@/lib/tools-logic/download";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  textField,
} from "@/components/react/styles";
import { useDragReorder } from "@/islands/pdf-merge/useDragReorder";
import { GroupRow } from "@/islands/pdf-merge/GroupRow";

interface SourceFileMeta {
  id: string;
  name: string;
  size: number;
  pageCount: number;
}

interface MergedResult {
  url: string;
  blob: Blob;
}

type MergeStatus = { tone: "error" | "neutral" | "success"; message: string };

const makePageId = (sourceId: string, index: number) => `${sourceId}:${index}`;

export default function PdfMergeTool() {
  const [sources, setSources] = useState<Map<string, SourceFileMeta>>(
    new Map(),
  );
  const docsRef = useRef<Map<string, PDFDocument>>(new Map());

  const [history, setHistory] = useState<HistoryState<MergeState>>(() =>
    createHistory(EMPTY_MERGE_STATE),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [addFilesStatus, setAddFilesStatus] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [outputName, setOutputName] = useState("merged");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<MergeProgress | null>(
    null,
  );
  const [mergeStatus, setMergeStatus] = useState<MergeStatus | null>(null);
  const [result, setResult] = useState<MergedResult | null>(null);
  const cancelRequestedRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const outputNameId = useId();

  const state = history.present;
  const groupOrder = state.groupOrder;
  const pageTotal = totalPageCount(state);

  const groupDrag = useDragReorder(
    groupOrder,
    (draggedId, targetId, position) => {
      const targetIndex = reorderIndex(
        groupOrder,
        draggedId,
        targetId,
        position,
      );
      pushState(moveGroup(state, draggedId, targetIndex));
    },
  );

  function pushState(next: MergeState) {
    setHistory((h) => pushHistory(h, next));
  }

  async function processFiles(files: File[]) {
    if (files.length === 0 || isAddingFiles) return;

    setFileErrors([]);
    setMergeStatus(null);

    const countCheck = checkFileCountLimit(sources.size, files.length);
    if (!countCheck.ok) {
      setFileErrors([countCheck.message]);
      return;
    }

    setIsAddingFiles(true);

    const errors: string[] = [];
    let workingHistory = history;
    let workingSources = sources;
    let runningTotalPages = totalPageCount(workingHistory.present);

    for (const file of files) {
      setAddFilesStatus(`Reading ${file.name}…`);

      const validation = validatePdfFile(file);
      if (!validation.ok) {
        errors.push(validation.message);
        continue;
      }

      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await file.arrayBuffer());
      } catch {
        errors.push(`"${file.name}" couldn't be read from disk.`);
        continue;
      }

      const loaded = await loadPdfDocument(bytes);
      if (!loaded.ok) {
        errors.push(`"${file.name}": ${loaded.message}`);
        continue;
      }

      const pageCheck = checkTotalPageLimit(
        runningTotalPages,
        loaded.value.pageCount,
      );
      if (!pageCheck.ok) {
        errors.push(`"${file.name}": ${pageCheck.message}`);
        continue;
      }

      const sourceId = crypto.randomUUID();
      docsRef.current.set(sourceId, loaded.value.doc);
      workingSources = new Map(workingSources).set(sourceId, {
        id: sourceId,
        name: file.name,
        size: file.size,
        pageCount: loaded.value.pageCount,
      });
      workingHistory = pushHistory(
        workingHistory,
        addSourceGroup(
          workingHistory.present,
          sourceId,
          loaded.value.pageCount,
          makePageId,
        ),
      );
      runningTotalPages += loaded.value.pageCount;
    }

    setSources(workingSources);
    setHistory(workingHistory);
    setFileErrors(errors);
    setAddFilesStatus(null);
    setIsAddingFiles(false);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void processFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDropzoneActive(false);
    void processFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDropzoneActive(true);
  }

  function handleDragLeave() {
    setIsDropzoneActive(false);
  }

  function handleToggleExpand(sourceId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  function handleGroupMoveUp(sourceId: string) {
    const idx = groupOrder.indexOf(sourceId);
    if (idx > 0) pushState(moveGroup(state, sourceId, idx - 1));
  }

  function handleGroupMoveDown(sourceId: string) {
    const idx = groupOrder.indexOf(sourceId);
    if (idx !== -1 && idx < groupOrder.length - 1) {
      pushState(moveGroup(state, sourceId, idx + 1));
    }
  }

  function handleRemoveGroup(sourceId: string) {
    pushState(removeGroup(state, sourceId));
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.delete(sourceId);
      return next;
    });
  }

  function handleMovePage(
    groupId: string,
    pageId: string,
    targetIndex: number,
  ) {
    pushState(movePageWithinGroup(state, groupId, pageId, targetIndex));
  }

  function handleRemovePage(groupId: string, pageId: string) {
    pushState(removePage(state, groupId, pageId));
  }

  function handleRotatePage(groupId: string, pageId: string, delta: number) {
    pushState(rotatePage(state, groupId, pageId, delta));
  }

  function handleUndo() {
    setHistory((h) => undo(h));
  }

  function handleRedo() {
    setHistory((h) => redo(h));
  }

  function handleReset() {
    if (result) URL.revokeObjectURL(result.url);
    cancelRequestedRef.current = true;
    setIsMerging(false);
    setMergeProgress(null);
    setMergeStatus(null);
    setResult(null);
    setSources(new Map());
    docsRef.current.clear();
    setHistory(createHistory(EMPTY_MERGE_STATE));
    setExpandedGroups(new Set());
    setFileErrors([]);
    setOutputName("merged");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleMerge() {
    const entries = flattenPages(state);
    if (entries.length === 0 || isMerging) return;

    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setMergeStatus(null);
    setMergeProgress({ completed: 0, total: entries.length });
    setIsMerging(true);
    cancelRequestedRef.current = false;

    let lastUpdate = 0;
    const mergeResult = await mergePdfs(entries, docsRef.current, {
      onProgress: (progress) => {
        const now = performance.now();
        if (now - lastUpdate > 80 || progress.completed === progress.total) {
          lastUpdate = now;
          setMergeProgress(progress);
        }
      },
      shouldCancel: () => cancelRequestedRef.current,
    });

    setIsMerging(false);
    setMergeProgress(null);

    if (!mergeResult.ok) {
      setMergeStatus({
        tone: mergeResult.cancelled ? "neutral" : "error",
        message: mergeResult.message,
      });
      return;
    }

    // `mergeResult.value` may be typed over a SharedArrayBuffer-compatible
    // backing store; re-wrapping guarantees a plain ArrayBuffer for Blob.
    const blob = new Blob([new Uint8Array(mergeResult.value)], {
      type: "application/pdf",
    });
    setResult({ url: URL.createObjectURL(blob), blob });
    setMergeStatus({
      tone: "success",
      message: `Merged ${entries.length} page${entries.length === 1 ? "" : "s"} into one PDF.`,
    });
  }

  function handleCancelMerge() {
    cancelRequestedRef.current = true;
  }

  function handleDownload() {
    if (!result) return;
    downloadBlob(sanitizeOutputFilename(outputName), result.blob);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={fileInputId} className={labelText}>
          PDF files
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
            Drag PDF files here, or choose files below
          </p>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={isAddingFiles}
            onChange={handleFileInputChange}
            className="text-text-muted file:bg-bg-elevated file:text-text file:border-border-strong hover:file:bg-bg-sunken mx-auto text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </div>
      </div>

      {isAddingFiles && addFilesStatus && (
        <StatusMessage tone="neutral">{addFilesStatus}</StatusMessage>
      )}

      {fileErrors.length > 0 && (
        <StatusMessage tone="error">
          <ul className="list-disc space-y-1 pl-4">
            {fileErrors.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        </StatusMessage>
      )}

      {groupOrder.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-text text-sm font-medium">
              {groupOrder.length} file{groupOrder.length === 1 ? "" : "s"} ·{" "}
              {pageTotal} page{pageTotal === 1 ? "" : "s"} total
            </h2>
            <div className="flex gap-2">
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
          </div>

          <ul className="flex flex-col gap-2">
            {groupOrder.map((sourceId, index) => {
              const source = sources.get(sourceId);
              if (!source) return null;
              const pages = state.pagesByGroup[sourceId] ?? [];
              return (
                <GroupRow
                  key={sourceId}
                  source={source}
                  pages={pages}
                  isFirst={index === 0}
                  isLast={index === groupOrder.length - 1}
                  expanded={expandedGroups.has(sourceId)}
                  isDragging={groupDrag.dragState.draggingId === sourceId}
                  dropIndicator={
                    groupDrag.dragState.overId === sourceId
                      ? groupDrag.dragState.overPosition
                      : null
                  }
                  registerRow={(el) => groupDrag.registerRow(sourceId, el)}
                  dragHandleProps={groupDrag.handleProps(sourceId)}
                  onToggleExpand={() => handleToggleExpand(sourceId)}
                  onMoveUp={() => handleGroupMoveUp(sourceId)}
                  onMoveDown={() => handleGroupMoveDown(sourceId)}
                  onRemove={() => handleRemoveGroup(sourceId)}
                  onMovePage={(pageId, targetIndex) =>
                    handleMovePage(sourceId, pageId, targetIndex)
                  }
                  onRemovePage={(pageId) => handleRemovePage(sourceId, pageId)}
                  onRotatePage={(pageId, delta) =>
                    handleRotatePage(sourceId, pageId, delta)
                  }
                />
              );
            })}
          </ul>

          <label htmlFor={outputNameId} className="flex flex-col gap-1">
            <span className={labelText}>Output filename</span>
            <div className="flex max-w-sm items-center gap-2">
              <input
                id={outputNameId}
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className={textField}
              />
              <span className="text-text-muted text-sm">.pdf</span>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleMerge}
              disabled={isMerging || pageTotal === 0}
              className={buttonPrimary}
            >
              {isMerging ? "Merging…" : "Merge & prepare download"}
            </button>
            {isMerging && (
              <button
                type="button"
                onClick={handleCancelMerge}
                className={buttonGhost}
              >
                Cancel
              </button>
            )}
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>

          {isMerging && mergeProgress && (
            <div className="flex flex-col gap-1">
              <progress
                value={mergeProgress.completed}
                max={mergeProgress.total}
                className="accent-accent w-full"
              />
              <StatusMessage tone="neutral">
                Merging page {mergeProgress.completed} of {mergeProgress.total}…
              </StatusMessage>
            </div>
          )}
        </>
      )}

      {mergeStatus && !isMerging && (
        <StatusMessage tone={mergeStatus.tone}>
          {mergeStatus.message}
        </StatusMessage>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Output size</dt>
            <dd role="status">{formatBytes(result.blob.size)}</dd>
          </dl>
          <div>
            <button
              type="button"
              onClick={handleDownload}
              className={buttonSecondary}
            >
              Download merged PDF
            </button>
          </div>
        </div>
      )}

      <p className="text-text-muted text-xs">
        Up to {MAX_FILES} files, {formatBytes(MAX_FILE_BYTES)} each, and{" "}
        {MAX_TOTAL_PAGES} total pages are supported for in-browser processing.
      </p>
    </div>
  );
}
