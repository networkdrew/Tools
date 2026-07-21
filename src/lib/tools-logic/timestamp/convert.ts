export type DetectedFormat =
  "unix-seconds" | "unix-milliseconds" | "date-string";

export interface TimestampSuccess {
  ok: true;
  date: Date;
  detectedFormat: DetectedFormat;
  unixSeconds: number;
  unixMillis: number;
  iso: string;
  utcString: string;
  localString: string;
  localTimeZone: string;
}

export interface TimestampFailure {
  ok: false;
  message: string;
}

export type TimestampResult = TimestampSuccess | TimestampFailure;

function buildSuccess(
  date: Date,
  detectedFormat: DetectedFormat,
): TimestampSuccess {
  return {
    ok: true,
    date,
    detectedFormat,
    unixSeconds: Math.floor(date.getTime() / 1000),
    unixMillis: date.getTime(),
    iso: date.toISOString(),
    utcString: date.toUTCString(),
    localString: date.toLocaleString(undefined, { timeZoneName: "short" }),
    localTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Parses either a Unix timestamp (seconds or milliseconds, detected by
 * digit count) or a date string understood by the Date constructor
 * (ISO 8601, RFC 2822, etc).
 */
export function parseTimestampInput(input: string): TimestampResult {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, message: "Enter a Unix timestamp or a date." };
  }

  if (/^-?\d+$/.test(trimmed)) {
    const digitCount = trimmed.replace("-", "").length;
    if (digitCount > 13) {
      return {
        ok: false,
        message:
          "That number has too many digits to be a supported Unix timestamp.",
      };
    }
    const isMillis = digitCount >= 11;
    const millis = isMillis ? Number(trimmed) : Number(trimmed) * 1000;
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) {
      return {
        ok: false,
        message: "That number doesn't correspond to a valid date.",
      };
    }
    return buildSuccess(date, isMillis ? "unix-milliseconds" : "unix-seconds");
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      message:
        "Couldn't parse that as a date. Try an ISO 8601 date/time or a Unix timestamp.",
    };
  }
  return buildSuccess(date, "date-string");
}

/** Converts an existing Date to the same result shape, for the "now" / live view. */
export function fromDate(date: Date): TimestampSuccess {
  return buildSuccess(date, "date-string");
}
