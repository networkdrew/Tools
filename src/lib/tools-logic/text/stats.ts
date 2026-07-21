export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTimeMinutes: number;
}

const WORDS_PER_MINUTE = 200;

export function computeTextStats(text: string): TextStats {
  const characters = [...text].length;
  const charactersNoSpaces = [...text.replace(/\s/g, "")].length;

  const words =
    text.trim() === "" ? 0 : (text.trim().match(/\S+/g)?.length ?? 0);

  // Heuristic: a sentence ends at ., !, or ?. Any trailing text without one
  // still counts as a sentence. Won't be perfect for abbreviations like "Dr.".
  const trimmed = text.trim();
  const sentences =
    trimmed === ""
      ? 0
      : (trimmed
          .match(/[^.!?]*[.!?]+|[^.!?]+$/g)
          ?.filter((s) => s.trim() !== "").length ?? 0);

  const paragraphs =
    text.trim() === ""
      ? 0
      : text
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p !== "").length;

  const lines = text === "" ? 0 : text.split("\n").length;

  const readingTimeMinutes =
    words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingTimeMinutes,
  };
}
