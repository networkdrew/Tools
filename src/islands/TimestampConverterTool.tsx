import { useEffect, useId, useMemo, useState } from "react";
import {
  fromDate,
  parseTimestampInput,
} from "@/lib/tools-logic/timestamp/convert";
import { CopyButton } from "@/components/react/CopyButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonSecondary,
  labelText,
  textField,
} from "@/components/react/styles";

function useNow(paused: boolean) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  return now;
}

function usePageVisible() {
  const [visible, setVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState === "visible",
  );
  useEffect(() => {
    function handleChange() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", handleChange);
    return () => document.removeEventListener("visibilitychange", handleChange);
  }, []);
  return visible;
}

export default function TimestampConverterTool() {
  const [input, setInput] = useState("");
  const inputId = useId();
  const visible = usePageVisible();
  const now = useNow(!visible);

  const result = useMemo(
    () => (input.trim() === "" ? null : parseTimestampInput(input)),
    [input],
  );

  const nowResult = fromDate(now);

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border bg-bg-elevated rounded-md border p-3">
        <div className={`${labelText} mb-1`}>
          Current time {visible ? "" : "(paused)"}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <output className="text-text font-mono text-sm">
            {nowResult.unixSeconds}
          </output>
          <output className="text-text-muted font-mono text-sm">
            {nowResult.iso}
          </output>
          <CopyButton
            text={String(nowResult.unixSeconds)}
            label="Copy seconds"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className={labelText}>
          Unix timestamp or date
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1737331200 or 2025-01-20T00:00:00Z"
            className={`${textField} max-w-md`}
          />
          <button
            type="button"
            onClick={() => setInput(String(nowResult.unixSeconds))}
            className={buttonSecondary}
          >
            Use current time
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className={buttonGhost}
          >
            Reset
          </button>
        </div>
      </div>

      {result && !result.ok && (
        <StatusMessage tone="error">{result.message}</StatusMessage>
      )}

      {result?.ok && (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ResultField
            label="Detected format"
            value={formatLabel(result.detectedFormat)}
          />
          <ResultField
            label="Unix seconds"
            value={String(result.unixSeconds)}
            copyable
          />
          <ResultField
            label="Unix milliseconds"
            value={String(result.unixMillis)}
            copyable
          />
          <ResultField label="ISO 8601 (UTC)" value={result.iso} copyable />
          <ResultField label="UTC" value={result.utcString} copyable />
          <ResultField
            label={`Local (${result.localTimeZone})`}
            value={result.localString}
            copyable
          />
        </dl>
      )}
    </div>
  );
}

function formatLabel(
  format: "unix-seconds" | "unix-milliseconds" | "date-string",
): string {
  switch (format) {
    case "unix-seconds":
      return "Unix timestamp (seconds)";
    case "unix-milliseconds":
      return "Unix timestamp (milliseconds)";
    case "date-string":
      return "Date string";
  }
}

function ResultField({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="border-border bg-bg-elevated rounded-md border p-3">
      <dt className="text-text-muted text-xs">{label}</dt>
      <dd className="mt-1 flex items-center justify-between gap-2">
        <span className="text-text font-mono text-sm break-all">{value}</span>
        {copyable && <CopyButton text={value} label="Copy" />}
      </dd>
    </div>
  );
}
