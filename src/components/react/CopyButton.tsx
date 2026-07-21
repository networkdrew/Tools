import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/tools-logic/clipboard";
import { buttonSecondary } from "./styles";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  className,
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function handleClick() {
    const success = await copyToClipboard(text);
    setState(success ? "copied" : "failed");
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!text}
      className={className ?? buttonSecondary}
    >
      {state === "idle" && label}
      {state === "copied" && "Copied"}
      {state === "failed" && "Couldn't copy"}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied"
          ? "Copied to clipboard"
          : state === "failed"
            ? "Copy failed"
            : ""}
      </span>
    </button>
  );
}
