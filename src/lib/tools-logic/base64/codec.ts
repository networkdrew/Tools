export interface Base64Success {
  ok: true;
  value: string;
}

export interface Base64Failure {
  ok: false;
  message: string;
}

export type Base64Result = Base64Success | Base64Failure;

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(b64: string): string {
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(padding);
}

/** Encodes UTF-8 text to Base64 (or URL-safe Base64). Handles emoji and non-Latin scripts. */
export function encodeBase64(text: string, urlSafe = false): Base64Result {
  try {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const b64 = btoa(binary);
    return { ok: true, value: urlSafe ? toUrlSafe(b64) : b64 };
  } catch {
    return { ok: false, message: "Couldn't encode that text." };
  }
}

/** Decodes Base64 (standard or URL-safe) back to UTF-8 text. */
export function decodeBase64(input: string, urlSafe = false): Base64Result {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, message: "Enter some Base64 to decode." };
  }

  const normalized = urlSafe ? fromUrlSafe(trimmed) : trimmed;

  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
    normalized.length % 4 !== 0
  ) {
    return { ok: false, message: "That doesn't look like valid Base64." };
  }

  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    return { ok: false, message: "That doesn't look like valid Base64." };
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: text };
  } catch {
    return {
      ok: false,
      message:
        "Decoded successfully, but the result isn't valid UTF-8 text (it may be binary data).",
    };
  }
}
