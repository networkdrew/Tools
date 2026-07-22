interface PageCardProps {
  pageNumber: number;
  thumbnailUrl: string | undefined;
  rotation: number;
  selectable: boolean;
  selected: boolean;
  selectLabel: string;
  onToggleSelected: () => void;
  onRotate: (delta: number) => void;
}

/**
 * The checkbox *is* the accessible alternative to "clicking the thumbnail":
 * it's a real native control, reachable by Tab and toggled with Space or a
 * tap, with no dependency on the (possibly still-rendering) preview image.
 */
export function PageCard({
  pageNumber,
  thumbnailUrl,
  rotation,
  selectable,
  selected,
  selectLabel,
  onToggleSelected,
  onRotate,
}: PageCardProps) {
  return (
    <li
      className={`border-border-strong bg-bg-elevated flex flex-col items-center gap-2 rounded-md border p-2 ${
        selectable && selected ? "ring-accent ring-2" : ""
      }`}
    >
      <label className="flex cursor-pointer flex-col items-center gap-1">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            aria-label={selectLabel}
            className="accent-accent"
          />
        )}
        <span className="bg-bg-sunken flex h-32 w-24 items-center justify-center overflow-hidden rounded">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              style={{ transform: `rotate(${rotation}deg)` }}
              className="max-h-full max-w-full object-contain transition-transform"
            />
          ) : (
            <span className="text-text-muted text-xs" aria-hidden="true">
              Page {pageNumber}
            </span>
          )}
        </span>
        <span className="text-text-muted text-xs">
          Page {pageNumber}
          {rotation !== 0 && <> · rotated {rotation}°</>}
        </span>
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onRotate(-90)}
          aria-label={`Rotate page ${pageNumber} left`}
          className="text-text-muted hover:bg-bg-sunken hover:text-text rounded px-1.5 py-0.5 text-xs"
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={() => onRotate(90)}
          aria-label={`Rotate page ${pageNumber} right`}
          className="text-text-muted hover:bg-bg-sunken hover:text-text rounded px-1.5 py-0.5 text-xs"
        >
          ⟳
        </button>
      </div>
    </li>
  );
}
