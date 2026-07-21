export interface JsonSuccess {
  ok: true;
  value: string;
}

export interface JsonFailure {
  ok: false;
  message: string;
  line?: number;
  column?: number;
}

export type JsonResult = JsonSuccess | JsonFailure;

/** Converts a 0-based string offset into a 1-based line/column pair. */
export function offsetToLineColumn(
  input: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(offset, input.length);
  for (let i = 0; i < end; i++) {
    if (input[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function parseWithPosition(input: string): { value: unknown } | JsonFailure {
  try {
    return { value: JSON.parse(input) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";

    // Newer V8 often reports the location itself: "... (line L column C)".
    const lineColumnMatch = /line (\d+) column (\d+)/.exec(message);
    if (lineColumnMatch?.[1] && lineColumnMatch[2]) {
      return {
        ok: false,
        message,
        line: Number(lineColumnMatch[1]),
        column: Number(lineColumnMatch[2]),
      };
    }

    // Otherwise it reports a 0-based offset: "... at position N".
    const positionMatch = /position (\d+)/.exec(message);
    if (positionMatch?.[1]) {
      const offset = Number(positionMatch[1]);
      const { line, column } = offsetToLineColumn(input, offset);
      return { ok: false, message, line, column };
    }

    return { ok: false, message };
  }
}

export function validateJson(input: string): JsonResult {
  if (input.trim() === "") {
    return { ok: false, message: "Enter some JSON to validate." };
  }
  const result = parseWithPosition(input);
  if ("ok" in result) return result;
  return { ok: true, value: input };
}

export function formatJson(input: string, indent = 2): JsonResult {
  if (input.trim() === "") {
    return { ok: false, message: "Enter some JSON to format." };
  }
  const result = parseWithPosition(input);
  if ("ok" in result) return result;
  return { ok: true, value: JSON.stringify(result.value, null, indent) };
}

export function minifyJson(input: string): JsonResult {
  if (input.trim() === "") {
    return { ok: false, message: "Enter some JSON to minify." };
  }
  const result = parseWithPosition(input);
  if ("ok" in result) return result;
  return { ok: true, value: JSON.stringify(result.value) };
}
