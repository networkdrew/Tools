/** Triggers a client-side download of text content — no network request involved. */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain",
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(filename, blob);
}

/** Triggers a client-side download of a Blob (e.g. a canvas-rendered image) — no network request involved. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
