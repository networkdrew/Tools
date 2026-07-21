import { useId, useRef, useState } from "react";
import {
  extractExif,
  type ExifData,
  type ExifField,
} from "@/lib/tools-logic/image-exif/exif";
import { formatExifAsText } from "@/lib/tools-logic/image-exif/format";
import {
  formatBytes,
  formatLabel,
  validateImageFile,
} from "@/lib/tools-logic/image-exif/file";
import { detectMetadata } from "@/lib/tools-logic/image-metadata/metadata";
import { CopyButton } from "@/components/react/CopyButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
} from "@/components/react/styles";

interface Dimensions {
  width: number;
  height: number;
}

interface Selection {
  file: File;
  previewUrl: string;
  dimensions: Dimensions;
  exif: ExifData;
}

async function decodeDimensions(
  file: File,
): Promise<{ ok: true; value: Dimensions } | { ok: false; message: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const value = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      message:
        "Couldn't read that image in this browser. It may be corrupted, or in a format this browser can't decode. Try a different file or a different browser.",
    };
  }
}

function FieldGroup({ title, fields }: { title: string; fields: ExifField[] }) {
  const headingId = useId();
  if (fields.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2
        id={headingId}
        className="text-text-muted text-sm font-semibold tracking-wide uppercase"
      >
        {title}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {fields.map((field) => (
          <li
            key={field.label}
            className="border-border bg-bg-elevated flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="text-text-muted">{field.label}</div>
              <div className="text-text font-medium break-words">
                {field.value}
              </div>
            </div>
            <CopyButton
              text={field.value}
              label="Copy"
              className={buttonGhost}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ImageExifViewerTool() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  function clearSelection() {
    if (selection) URL.revokeObjectURL(selection.previewUrl);
    setSelection(null);
    setSelectError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;

    clearSelection();

    const validation = validateImageFile(chosen);
    if (!validation.ok) {
      setSelectError(validation.message);
      return;
    }

    setIsLoading(true);

    const decoded = await decodeDimensions(chosen);
    if (!decoded.ok) {
      setSelectError(decoded.message);
      setIsLoading(false);
      return;
    }

    const bytes = new Uint8Array(await chosen.arrayBuffer());
    const { hasIcc } = detectMetadata(bytes, chosen.type);
    const exif = extractExif(bytes, chosen.type, decoded.value, hasIcc);

    setSelection({
      file: chosen,
      previewUrl: URL.createObjectURL(chosen),
      dimensions: decoded.value,
      exif,
    });
    setIsLoading(false);
  }

  function handleReset() {
    clearSelection();
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const exif = selection?.exif ?? null;
  const copyAllText = exif ? formatExifAsText(exif) : "";

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
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="text-text-muted file:bg-bg-elevated file:text-text file:border-border-strong hover:file:bg-bg-sunken text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      {selectError && <StatusMessage tone="error">{selectError}</StatusMessage>}

      {isLoading && (
        <StatusMessage tone="neutral">Reading image metadata…</StatusMessage>
      )}

      {selection && exif && !selectError && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <img
              src={selection.previewUrl}
              alt={`Preview of ${selection.file.name}`}
              className="border-border-strong bg-bg-sunken h-32 w-32 shrink-0 rounded-md border object-contain"
            />
            <dl className="text-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">File name</dt>
              <dd className="truncate">{selection.file.name}</dd>
              <dt className="font-medium">Format</dt>
              <dd>{formatLabel(selection.file.type)}</dd>
              <dt className="font-medium">File size</dt>
              <dd>{formatBytes(selection.file.size)}</dd>
            </dl>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CopyButton
              text={copyAllText}
              label="Copy all metadata"
              className={buttonPrimary}
            />
            <button type="button" onClick={handleReset} className={buttonGhost}>
              Reset
            </button>
          </div>

          {!exif.hasMetadata && (
            <StatusMessage tone="neutral">
              No EXIF metadata was found in this image. It may have been
              stripped already, or the file may never have carried any.
            </StatusMessage>
          )}

          <FieldGroup title="Camera" fields={exif.camera} />
          <FieldGroup title="Capture" fields={exif.capture} />
          <FieldGroup title="Image" fields={exif.image} />

          {exif.gps.length > 0 && exif.gpsCoordinates && (
            <section aria-label="GPS" className="flex flex-col gap-2">
              <h2 className="text-text-muted text-sm font-semibold tracking-wide uppercase">
                GPS
              </h2>
              <StatusMessage tone="neutral">
                <strong className="font-medium">Sensitive: </strong>
                This image is tagged with a precise location. Sharing it can
                reveal where the photo was taken.
              </StatusMessage>
              <ul className="flex flex-col gap-1.5">
                {exif.gps.map((field) => (
                  <li
                    key={field.label}
                    className="border-border bg-bg-elevated flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-text-muted">{field.label}</div>
                      <div className="text-text font-medium break-words">
                        {field.value}
                      </div>
                    </div>
                    <CopyButton
                      text={field.value}
                      label="Copy"
                      className={buttonGhost}
                    />
                  </li>
                ))}
              </ul>
              <div>
                <a
                  href={exif.gpsCoordinates.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonGhost}
                >
                  View location on OpenStreetMap (opens in a new tab)
                </a>
              </div>
            </section>
          )}

          <div className="border-border-strong border-t pt-4">
            <p className="text-text-muted text-sm">
              Want this metadata gone instead of just viewing it?{" "}
              <a
                href="/tools/image-metadata-remover/"
                className="text-accent hover:underline"
              >
                Open the Image Metadata Remover
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
