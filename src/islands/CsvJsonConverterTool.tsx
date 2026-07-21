import { useId, useState } from "react";
import {
  csvToJson,
  jsonToCsv,
} from "@/lib/tools-logic/csv-json-converter/convert";
import { CopyButton } from "@/components/react/CopyButton";
import { DownloadButton } from "@/components/react/DownloadButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
  selectField,
  textareaField,
} from "@/components/react/styles";

type Mode = "csv-to-json" | "json-to-csv";

const delimiters = [
  { label: "Comma (,)", value: "," },
  { label: "Semicolon (;)", value: ";" },
  { label: "Tab", value: "\t" },
];

export default function CsvJsonConverterTool() {
  const [mode, setMode] = useState<Mode>("csv-to-json");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [hasHeader, setHasHeader] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inputId = useId();
  const outputId = useId();
  const delimiterId = useId();

  function run() {
    const result =
      mode === "csv-to-json"
        ? csvToJson(input, { delimiter, hasHeader })
        : jsonToCsv(input, { delimiter });
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

  function switchMode(next: Mode) {
    setMode(next);
    setOutput("");
    setError(null);
  }

  function swap() {
    const nextInput = output || input;
    switchMode(mode === "csv-to-json" ? "json-to-csv" : "csv-to-json");
    setInput(nextInput);
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Direction" className="flex gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "csv-to-json"}
          onClick={() => switchMode("csv-to-json")}
          className={
            mode === "csv-to-json"
              ? buttonPrimary
              : "border-border-strong bg-bg-elevated text-text-muted hover:text-text inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          }
        >
          CSV to JSON
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "json-to-csv"}
          onClick={() => switchMode("json-to-csv")}
          className={
            mode === "json-to-csv"
              ? buttonPrimary
              : "border-border-strong bg-bg-elevated text-text-muted hover:text-text inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          }
        >
          JSON to CSV
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className={labelText}>
          {mode === "csv-to-json" ? "CSV" : "JSON"}
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          spellCheck={false}
          className={textareaField}
          placeholder={
            mode === "csv-to-json"
              ? "name,age\nAda,36\nGrace,85"
              : '[\n  { "name": "Ada", "age": 36 }\n]'
          }
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor={delimiterId} className={labelText}>
            Delimiter
          </label>
          <select
            id={delimiterId}
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            className={selectField}
          >
            {delimiters.map((d) => (
              <option key={d.label} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "csv-to-json" && (
          <label className="text-text flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            First row is header
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          Convert
        </button>
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
                filename={
                  mode === "csv-to-json" ? "converted.json" : "converted.csv"
                }
                mimeType={
                  mode === "csv-to-json" ? "application/json" : "text/csv"
                }
              />
            </div>
          </div>
          <textarea
            id={outputId}
            value={output}
            readOnly
            rows={10}
            className={textareaField}
          />
        </div>
      )}
    </div>
  );
}
