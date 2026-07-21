import { parseCsv, stringifyCsv } from "./csv";

export interface ConvertSuccess {
  ok: true;
  value: string;
}

export interface ConvertFailure {
  ok: false;
  message: string;
}

export type ConvertResult = ConvertSuccess | ConvertFailure;

type JsonRecord = Record<string, unknown>;

function cellValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Converts CSV text to a JSON string (an array of row objects, or an array of arrays without a header). */
export function csvToJson(
  csvText: string,
  options: { delimiter: string; hasHeader: boolean },
): ConvertResult {
  if (csvText.trim() === "") {
    return { ok: false, message: "Enter some CSV to convert." };
  }

  let rows: string[][];
  try {
    rows = parseCsv(csvText, options.delimiter);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't parse that CSV.",
    };
  }

  if (rows.length === 0) {
    return { ok: false, message: "No data rows found." };
  }

  if (!options.hasHeader) {
    return { ok: true, value: JSON.stringify(rows, null, 2) };
  }

  const [header, ...dataRows] = rows as [string[], ...string[][]];
  if (dataRows.length === 0) {
    return {
      ok: false,
      message:
        'Only a header row was found. Add at least one data row, or turn off "First row is header".',
    };
  }

  const columns = header.map(
    (name, index) => name.trim() || `column${index + 1}`,
  );
  const objects: JsonRecord[] = dataRows.map((row) => {
    const record: JsonRecord = {};
    columns.forEach((column, index) => {
      record[column] = row[index] ?? "";
    });
    return record;
  });

  return { ok: true, value: JSON.stringify(objects, null, 2) };
}

/** Converts a JSON array of objects (or a single object) to CSV text. */
export function jsonToCsv(
  jsonText: string,
  options: { delimiter: string },
): ConvertResult {
  if (jsonText.trim() === "") {
    return { ok: false, message: "Enter some JSON to convert." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, message: "That doesn't look like valid JSON." };
  }

  let records: JsonRecord[];
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return { ok: false, message: "The JSON array is empty." };
    }
    if (!parsed.every((item) => isPlainObject(item))) {
      return {
        ok: false,
        message: 'Expected an array of objects, e.g. [{"name": "Ada"}].',
      };
    }
    records = parsed as JsonRecord[];
  } else if (isPlainObject(parsed)) {
    records = [parsed];
  } else {
    return {
      ok: false,
      message: "Expected a JSON array of objects, or a single object.",
    };
  }

  const columns: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  if (columns.length === 0) {
    return { ok: false, message: "No fields found to convert." };
  }

  const rows = [
    columns,
    ...records.map((record) =>
      columns.map((column) => cellValue(record[column])),
    ),
  ];

  return { ok: true, value: stringifyCsv(rows, options.delimiter) };
}

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
