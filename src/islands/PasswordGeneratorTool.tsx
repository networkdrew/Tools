import { useId, useState } from "react";
import {
  generatePassphrase,
  generatePassword,
  strengthLabel,
  type PasswordOptions,
  type PassphraseOptions,
} from "@/lib/tools-logic/password/generate";
import { CopyButton } from "@/components/react/CopyButton";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
  textField,
} from "@/components/react/styles";

type Mode = "password" | "passphrase";

const defaultPasswordOptions: PasswordOptions = {
  length: 20,
  useLowercase: true,
  useUppercase: true,
  useNumbers: true,
  useSymbols: true,
};

const defaultPassphraseOptions: PassphraseOptions = {
  wordCount: 5,
  separator: "-",
  capitalize: true,
  includeNumber: true,
};

export default function PasswordGeneratorTool() {
  const [mode, setMode] = useState<Mode>("password");
  const [passwordOptions, setPasswordOptions] = useState(
    defaultPasswordOptions,
  );
  const [passphraseOptions, setPassphraseOptions] = useState(
    defaultPassphraseOptions,
  );
  const [result, setResult] = useState<{
    value: string;
    entropyBits: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lengthId = useId();
  const wordCountId = useId();
  const separatorId = useId();

  function generate() {
    const outcome =
      mode === "password"
        ? generatePassword(passwordOptions)
        : generatePassphrase(passphraseOptions);
    if (outcome.ok) {
      setResult({ value: outcome.value, entropyBits: outcome.entropyBits });
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
  }

  function handleReset() {
    setMode("password");
    setPasswordOptions(defaultPasswordOptions);
    setPassphraseOptions(defaultPassphraseOptions);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Generator mode" className="flex gap-2">
        {(["password", "passphrase"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setResult(null);
              setError(null);
            }}
            className={
              mode === m
                ? buttonPrimary
                : "border-border-strong bg-bg-elevated text-text-muted hover:text-text inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            }
          >
            {m === "password" ? "Password" : "Passphrase"}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor={lengthId} className={labelText}>
              Length
            </label>
            <input
              id={lengthId}
              type="number"
              min={4}
              max={128}
              value={passwordOptions.length}
              onChange={(e) =>
                setPasswordOptions((prev) => ({
                  ...prev,
                  length: Number(e.target.value),
                }))
              }
              className={`${textField} w-24`}
            />
          </div>
          <fieldset className="flex flex-wrap gap-4">
            <legend className={`${labelText} mb-1 w-full`}>Include</legend>
            {(
              [
                ["useLowercase", "Lowercase (a-z)"],
                ["useUppercase", "Uppercase (A-Z)"],
                ["useNumbers", "Numbers (0-9)"],
                ["useSymbols", "Symbols (!@#…)"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="text-text flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={passwordOptions[key]}
                  onChange={(e) =>
                    setPasswordOptions((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor={wordCountId} className={labelText}>
                Words
              </label>
              <input
                id={wordCountId}
                type="number"
                min={3}
                max={12}
                value={passphraseOptions.wordCount}
                onChange={(e) =>
                  setPassphraseOptions((prev) => ({
                    ...prev,
                    wordCount: Number(e.target.value),
                  }))
                }
                className={`${textField} w-20`}
              />
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor={separatorId} className={labelText}>
                Separator
              </label>
              <input
                id={separatorId}
                type="text"
                maxLength={3}
                value={passphraseOptions.separator}
                onChange={(e) =>
                  setPassphraseOptions((prev) => ({
                    ...prev,
                    separator: e.target.value,
                  }))
                }
                className={`${textField} w-16`}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="text-text flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={passphraseOptions.capitalize}
                onChange={(e) =>
                  setPassphraseOptions((prev) => ({
                    ...prev,
                    capitalize: e.target.checked,
                  }))
                }
              />
              Capitalize words
            </label>
            <label className="text-text flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={passphraseOptions.includeNumber}
                onChange={(e) =>
                  setPassphraseOptions((prev) => ({
                    ...prev,
                    includeNumber: e.target.checked,
                  }))
                }
              />
              Include a number
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generate} className={buttonPrimary}>
          Generate
        </button>
        <button type="button" onClick={handleReset} className={buttonGhost}>
          Reset
        </button>
      </div>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      {result && (
        <div className="flex flex-col gap-2">
          <div className="border-border-strong bg-bg-elevated flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <output
              aria-label="Generated result"
              className="text-text font-mono text-lg break-all"
            >
              {result.value}
            </output>
            <CopyButton text={result.value} />
          </div>
          <p className="text-text-muted text-sm">
            ~{Math.round(result.entropyBits)} bits of entropy —{" "}
            <span className="text-text font-medium">
              {strengthLabel(result.entropyBits)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
