/** Low-level RFC 4180-style CSV parsing and serialization (no JSON knowledge). */

/** Parses CSV text into rows of raw string fields. Throws on an unterminated quoted field. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAnyField = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      sawAnyField = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
      sawAnyField = true;
    } else if (char === "\r") {
      // Ignored; the paired \n (or end of input) ends the row.
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      sawAnyField = false;
    } else {
      field += char;
      sawAnyField = true;
    }
  }

  if (inQuotes) {
    throw new Error(
      "Unterminated quoted field — check for a missing closing quote.",
    );
  }

  if (sawAnyField || field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0]?.trim() === ""));
}

function escapeField(field: string, delimiter: string): string {
  if (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Serializes rows of string fields back into CSV text. */
export function stringifyCsv(rows: string[][], delimiter: string): string {
  return rows
    .map((row) =>
      row.map((field) => escapeField(field, delimiter)).join(delimiter),
    )
    .join("\n");
}
