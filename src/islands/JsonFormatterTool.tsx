import { useId, useMemo, useState } from "react";
import {
  formatJson,
  minifyJson,
  validateJson,
} from "@/lib/tools-logic/json/format";
import { CopyButton } from "@/components/react/CopyButton";
import { DownloadButton } from "@/components/react/DownloadButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  labelText,
  selectField,
  textareaField,
} from "@/components/react/styles";

export default function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState<{
    message: string;
    line?: number;
    column?: number;
  } | null>(null);

  const inputId = useId();
  const outputId = useId();

  const liveValidation = useMemo(() => {
    if (input.trim() === "") return null;
    return validateJson(input);
  }, [input]);

  function handleFormat() {
    const result = formatJson(input, indent);
    if (result.ok) {
      setOutput(result.value);
      setError(null);
    } else {
      setOutput("");
      setError(result);
    }
  }

  function handleMinify() {
    const result = minifyJson(input);
    if (result.ok) {
      setOutput(result.value);
      setError(null);
    } else {
      setOutput("");
      setError(result);
    }
  }

  function handleReset() {
    setInput("");
    setOutput("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={inputId} className={labelText}>
            JSON input
          </label>
          {liveValidation && (
            <span
              className={`text-xs font-medium ${liveValidation.ok ? "text-success" : "text-danger"}`}
            >
              {liveValidation.ok ? "Valid JSON" : "Invalid JSON"}
            </span>
          )}
        </div>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"example": [1, 2, 3]}'
          rows={12}
          spellCheck={false}
          className={textareaField}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleFormat} className={buttonPrimary}>
          Format
        </button>
        <button
          type="button"
          onClick={handleMinify}
          className={buttonSecondary}
        >
          Minify
        </button>
        <label className="text-text-muted flex items-center gap-2 text-sm">
          Indent
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className={selectField}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </label>
        <button type="button" onClick={handleReset} className={buttonGhost}>
          Reset
        </button>
      </div>

      {error && (
        <StatusMessage tone="error">
          {error.message}
          {error.line !== undefined &&
            ` (line ${error.line}, column ${error.column})`}
        </StatusMessage>
      )}

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
                filename="formatted.json"
                mimeType="application/json"
              />
            </div>
          </div>
          <textarea
            id={outputId}
            value={output}
            readOnly
            rows={12}
            className={textareaField}
          />
        </div>
      )}
    </div>
  );
}
