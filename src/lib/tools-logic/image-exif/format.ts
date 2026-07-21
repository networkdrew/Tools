import type { ExifData, ExifField } from "./exif";

const SECTION_TITLES: [
  keyof Pick<ExifData, "camera" | "capture" | "image" | "gps">,
  string,
][] = [
  ["camera", "Camera"],
  ["capture", "Capture"],
  ["image", "Image"],
  ["gps", "GPS"],
];

/** Formats every detected field as plain, indented text for a single "copy all" action. */
export function formatExifAsText(data: ExifData): string {
  const lines: string[] = [];

  for (const [key, title] of SECTION_TITLES) {
    const fields = data[key] as ExifField[];
    if (fields.length === 0) continue;
    lines.push(title);
    for (const field of fields) lines.push(`  ${field.label}: ${field.value}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}
