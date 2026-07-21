import type { OutputFormat } from "./file";

export interface CropWarningInput {
  isAnimated: boolean;
  hasTransparency: boolean;
  sourceLabel: string;
  outputFormat: OutputFormat;
}

/** Advisory (non-blocking) warnings shown before cropping/exporting. */
export function computeCropWarnings(input: CropWarningInput): string[] {
  const warnings: string[] = [];

  if (input.isAnimated) {
    warnings.push(
      `This ${input.sourceLabel} appears to be animated. Cropping and resizing it flattens the image to a single static frame — motion will be lost.`,
    );
  }

  if (input.hasTransparency && input.outputFormat === "image/jpeg") {
    warnings.push(
      "The source image has transparent areas. JPEG doesn't support transparency, so those areas will be filled with white in the output.",
    );
  }

  return warnings;
}
