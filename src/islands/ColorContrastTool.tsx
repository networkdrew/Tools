import { useId, useMemo, useState } from "react";
import {
  contrastRatio,
  evaluateContrast,
  parseColor,
  rgbToHex,
  type WcagEvaluation,
} from "@/lib/tools-logic/color-contrast/contrast";
import { CopyButton } from "@/components/react/CopyButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import { buttonGhost, labelText, textField } from "@/components/react/styles";

const DEFAULT_FG = "#000000";
const DEFAULT_BG = "#ffffff";

interface CheckRow {
  label: string;
  pass: boolean;
}

function checksFor(evaluation: WcagEvaluation): CheckRow[] {
  return [
    { label: "AA — normal text (4.5:1)", pass: evaluation.aaNormalText },
    { label: "AA — large text (3:1)", pass: evaluation.aaLargeText },
    { label: "AAA — normal text (7:1)", pass: evaluation.aaaNormalText },
    { label: "AAA — large text (4.5:1)", pass: evaluation.aaaLargeText },
    {
      label: "UI components & graphics (3:1)",
      pass: evaluation.aaUiComponents,
    },
  ];
}

export default function ColorContrastTool() {
  const [fgInput, setFgInput] = useState(DEFAULT_FG);
  const [bgInput, setBgInput] = useState(DEFAULT_BG);

  const fgId = useId();
  const bgId = useId();
  const fgSwatchId = useId();
  const bgSwatchId = useId();

  const fg = useMemo(() => parseColor(fgInput), [fgInput]);
  const bg = useMemo(() => parseColor(bgInput), [bgInput]);

  const error = !fg.ok
    ? `Text color: ${fg.message}`
    : !bg.ok
      ? `Background color: ${bg.message}`
      : null;

  const evaluation =
    fg.ok && bg.ok ? evaluateContrast(contrastRatio(fg.value, bg.value)) : null;

  function handleReset() {
    setFgInput(DEFAULT_FG);
    setBgInput(DEFAULT_BG);
  }

  function swap() {
    setFgInput(bgInput);
    setBgInput(fgInput);
  }

  const previewStyle =
    fg.ok && bg.ok
      ? {
          color: `rgba(${fg.value.r}, ${fg.value.g}, ${fg.value.b}, ${fg.value.a})`,
          backgroundColor: `rgba(${bg.value.r}, ${bg.value.g}, ${bg.value.b}, ${bg.value.a})`,
        }
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={fgId} className={labelText}>
            Text color
          </label>
          <div className="flex items-center gap-2">
            <input
              id={fgSwatchId}
              type="color"
              aria-label="Text color swatch"
              value={fg.ok ? rgbToHex(fg.value) : DEFAULT_FG}
              onChange={(e) => setFgInput(e.target.value)}
              className="border-border-strong h-9 w-9 shrink-0 rounded-md border p-0.5"
            />
            <input
              id={fgId}
              type="text"
              value={fgInput}
              onChange={(e) => setFgInput(e.target.value)}
              spellCheck={false}
              placeholder="#000000"
              className={textField}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={bgId} className={labelText}>
            Background color
          </label>
          <div className="flex items-center gap-2">
            <input
              id={bgSwatchId}
              type="color"
              aria-label="Background color swatch"
              value={bg.ok ? rgbToHex(bg.value) : DEFAULT_BG}
              onChange={(e) => setBgInput(e.target.value)}
              className="border-border-strong h-9 w-9 shrink-0 rounded-md border p-0.5"
            />
            <input
              id={bgId}
              type="text"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
              spellCheck={false}
              placeholder="#ffffff"
              className={textField}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={swap} className={buttonGhost}>
          Swap colors
        </button>
        <button type="button" onClick={handleReset} className={buttonGhost}>
          Reset
        </button>
      </div>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      {evaluation && !error && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-text" role="status">
              Contrast ratio:{" "}
              <span className="font-mono text-lg font-semibold">
                {evaluation.ratio.toFixed(2)}:1
              </span>
            </p>
            <CopyButton
              text={`${evaluation.ratio.toFixed(2)}:1`}
              label="Copy ratio"
            />
          </div>

          <div
            className="border-border-strong overflow-hidden rounded-md border"
            style={previewStyle}
          >
            <p className="p-4 text-base">
              Normal text sample — the quick brown fox jumps over the lazy dog.
            </p>
            <p className="p-4 pt-0 text-2xl font-bold">Large text sample</p>
          </div>

          <ul
            className="grid gap-2 sm:grid-cols-2"
            aria-label="WCAG 2.1 contrast results"
          >
            {checksFor(evaluation).map((row) => (
              <li
                key={row.label}
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                  row.pass
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-danger/40 bg-danger/10 text-danger"
                }`}
              >
                <span>{row.label}</span>
                <span className="font-medium">
                  {row.pass ? "Pass" : "Fail"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
