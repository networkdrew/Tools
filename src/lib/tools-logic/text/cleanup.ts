/** Trims leading/trailing whitespace from every line. */
export function trimLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

/** Collapses runs of spaces/tabs within each line down to a single space. */
export function collapseSpaces(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " "))
    .join("\n");
}

/** Collapses 3+ consecutive blank lines down to a single blank line (one paragraph break). */
export function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/** Joins all lines into one paragraph, replacing line breaks with a single space. */
export function removeLineBreaks(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
}

export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

/** Capitalizes the first letter of every word; simple heuristic, not locale-aware. */
export function toTitleCase(text: string): string {
  return text.replace(
    /\w\S*/g,
    (word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase(),
  );
}
