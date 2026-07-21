import wordlist from "./wordlist.json";
import { secureRandomInt, secureRandomItem, secureShuffle } from "./random";

// wordlist.json is EFF's "large" Diceware word list (7,776 words, 6^5),
// released by the Electronic Frontier Foundation for exactly this purpose:
// generating memorable, high-entropy passphrases. See
// https://www.eff.org/dice for the original list and its license.

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  // Excludes quote/backslash characters that are awkward to paste into shells or config files.
  symbols: "!@#$%^&*()-_=+[]{};:,.<>/?",
} as const;

export interface PasswordOptions {
  length: number;
  useLowercase: boolean;
  useUppercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

export interface PasswordFailure {
  ok: false;
  message: string;
}

export interface PasswordSuccess {
  ok: true;
  value: string;
  entropyBits: number;
}

export type PasswordResult = PasswordSuccess | PasswordFailure;

export function generatePassword(options: PasswordOptions): PasswordResult {
  const { length, useLowercase, useUppercase, useNumbers, useSymbols } =
    options;

  if (!Number.isInteger(length) || length < 4 || length > 128) {
    return {
      ok: false,
      message: "Length must be a whole number between 4 and 128.",
    };
  }

  const candidateSets: (string | false)[] = [
    useLowercase && CHARSETS.lowercase,
    useUppercase && CHARSETS.uppercase,
    useNumbers && CHARSETS.numbers,
    useSymbols && CHARSETS.symbols,
  ];
  const selectedSets = candidateSets.filter(
    (set): set is string => typeof set === "string",
  );

  if (selectedSets.length === 0) {
    return { ok: false, message: "Select at least one character type." };
  }

  if (length < selectedSets.length) {
    return {
      ok: false,
      message: `Length must be at least ${selectedSets.length} to include every selected character type.`,
    };
  }

  const fullCharset = selectedSets.join("");

  // Guarantee at least one character from each selected set, then fill the
  // rest from the combined set, then shuffle so the guaranteed characters
  // aren't predictably placed at the start.
  const guaranteed = selectedSets.map((set) => secureRandomItem(set.split("")));
  const remaining = Array.from({ length: length - guaranteed.length }, () =>
    secureRandomItem(fullCharset.split("")),
  );
  const password = secureShuffle([...guaranteed, ...remaining]).join("");

  return {
    ok: true,
    value: password,
    entropyBits: length * log2(fullCharset.length),
  };
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export function generatePassphrase(options: PassphraseOptions): PasswordResult {
  const { wordCount, separator, capitalize, includeNumber } = options;

  if (!Number.isInteger(wordCount) || wordCount < 3 || wordCount > 12) {
    return {
      ok: false,
      message: "Word count must be a whole number between 3 and 12.",
    };
  }

  const words = Array.from({ length: wordCount }, () =>
    secureRandomItem(wordlist as string[]),
  );
  const cased = capitalize
    ? words.map((word) => word[0]!.toUpperCase() + word.slice(1))
    : words;

  if (includeNumber) {
    const position = secureRandomInt(cased.length);
    cased[position] = cased[position] + String(secureRandomInt(100));
  }

  return {
    ok: true,
    value: cased.join(separator),
    entropyBits: wordCount * log2(wordlist.length),
  };
}

function log2(n: number): number {
  return Math.log(n) / Math.log(2);
}

export type StrengthLabel =
  "Very weak" | "Weak" | "Reasonable" | "Strong" | "Very strong";

/**
 * A rough, widely-used heuristic (not a guarantee): entropy bands roughly
 * corresponding to how long an offline brute-force attack would take.
 */
export function strengthLabel(entropyBits: number): StrengthLabel {
  if (entropyBits < 28) return "Very weak";
  if (entropyBits < 40) return "Weak";
  if (entropyBits < 60) return "Reasonable";
  if (entropyBits < 90) return "Strong";
  return "Very strong";
}
