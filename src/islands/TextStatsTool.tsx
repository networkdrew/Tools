import { useId, useMemo, useState } from "react";
import { computeTextStats } from "@/lib/tools-logic/text/stats";
import {
  collapseBlankLines,
  collapseSpaces,
  removeLineBreaks,
  toLowerCase,
  toTitleCase,
  toUpperCase,
  trimLines,
} from "@/lib/tools-logic/text/cleanup";
import { CopyButton } from "@/components/react/CopyButton";
import { DownloadButton } from "@/components/react/DownloadButton";
import {
  buttonGhost,
  buttonSecondary,
  labelText,
  textareaField,
} from "@/components/react/styles";

const cleanupActions = [
  { label: "Trim each line", fn: trimLines },
  { label: "Collapse spaces", fn: collapseSpaces },
  { label: "Collapse blank lines", fn: collapseBlankLines },
  { label: "Remove line breaks", fn: removeLineBreaks },
  { label: "UPPERCASE", fn: toUpperCase },
  { label: "lowercase", fn: toLowerCase },
  { label: "Title Case", fn: toTitleCase },
] as const;

export default function TextStatsTool() {
  const [text, setText] = useState("");
  const inputId = useId();

  const stats = useMemo(() => computeTextStats(text), [text]);

  const statEntries: Array<[string, number]> = [
    ["Words", stats.words],
    ["Characters", stats.characters],
    ["Characters (no spaces)", stats.charactersNoSpaces],
    ["Sentences", stats.sentences],
    ["Paragraphs", stats.paragraphs],
    ["Lines", stats.lines],
    ["Reading time (min)", stats.readingTimeMinutes],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className={labelText}>
          Text
        </label>
        <textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type text here…"
          rows={12}
          className={textareaField}
        />
      </div>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        role="group"
        aria-label="Text statistics"
      >
        {statEntries.map(([label, value]) => (
          <div
            key={label}
            className="border-border bg-bg-elevated rounded-md border p-3"
          >
            <div className="text-text font-mono text-xl">{value}</div>
            <div className="text-text-muted text-xs">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {cleanupActions.map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            className={buttonSecondary}
            disabled={!text}
            onClick={() => setText((prev) => fn(prev))}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={buttonGhost}
          onClick={() => setText("")}
        >
          Reset
        </button>
      </div>

      <div className="flex gap-2">
        <CopyButton text={text} />
        <DownloadButton text={text} filename="text.txt" />
      </div>
    </div>
  );
}
