import { useId, useState } from "react";
import { decodeBase64, encodeBase64 } from "@/lib/tools-logic/base64/codec";
import { CopyButton } from "@/components/react/CopyButton";
import { DownloadButton } from "@/components/react/DownloadButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
  textareaField,
} from "@/components/react/styles";

type Mode = "encode" | "decode";

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputId = useId();
  const outputId = useId();

  function run() {
    const result =
      mode === "encode"
        ? encodeBase64(input, urlSafe)
        : decodeBase64(input, urlSafe);
    if (result.ok) {
      setOutput(result.value);
      setError(null);
    } else {
      setOutput("");
      setError(result.message);
    }
  }

  function handleReset() {
    setInput("");
    setOutput("");
    setError(null);
  }

  function swap() {
    setMode((prev) => (prev === "encode" ? "decode" : "encode"));
    setInput(output || input);
    setOutput("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Mode" className="flex gap-2">
        {(["encode", "decode"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setOutput("");
              setError(null);
            }}
            className={
              mode === m
                ? buttonPrimary
                : "border-border-strong bg-bg-elevated text-text-muted hover:text-text inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            }
          >
            {m === "encode" ? "Encode" : "Decode"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className={labelText}>
          {mode === "encode" ? "Text" : "Base64"}
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          spellCheck={false}
          className={textareaField}
          placeholder={
            mode === "encode" ? "Text to encode…" : "Base64 to decode…"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          {mode === "encode" ? "Encode" : "Decode"}
        </button>
        <label className="text-text flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={urlSafe}
            onChange={(e) => setUrlSafe(e.target.checked)}
          />
          URL-safe
        </label>
        <button
          type="button"
          onClick={swap}
          className={buttonGhost}
          disabled={!output && !input}
        >
          Swap &amp; use result as input
        </button>
        <button type="button" onClick={handleReset} className={buttonGhost}>
          Reset
        </button>
      </div>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      {output && !error && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={outputId} className={labelText}>
              Result
            </label>
            <div className="flex gap-2">
              <CopyButton text={output} />
              <DownloadButton
                text={output}
                filename={mode === "encode" ? "encoded.txt" : "decoded.txt"}
              />
            </div>
          </div>
          <textarea
            id={outputId}
            value={output}
            readOnly
            rows={8}
            className={textareaField}
          />
        </div>
      )}
    </div>
  );
}
