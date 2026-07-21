import { downloadTextFile } from "@/lib/tools-logic/download";
import { buttonSecondary } from "./styles";

interface DownloadButtonProps {
  text: string;
  filename: string;
  mimeType?: string;
  label?: string;
  className?: string;
}

export function DownloadButton({
  text,
  filename,
  mimeType,
  label = "Download",
  className,
}: DownloadButtonProps) {
  return (
    <button
      type="button"
      disabled={!text}
      onClick={() => downloadTextFile(filename, text, mimeType)}
      className={className ?? buttonSecondary}
    >
      {label}
    </button>
  );
}
