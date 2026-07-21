import type { OutputFormat } from "./file";

export interface ConversionWarningInput {
  isAnimated: boolean;
  hasTransparency: boolean;
  sourceLabel: string;
  outputFormat: OutputFormat;
}

/** Advisory (non-blocking) warnings shown before conversion, e.g. animation or transparency loss. */
export function computeConversionWarnings(
  input: ConversionWarningInput,
): string[] {
  const warnings: string[] = [];

  if (input.isAnimated) {
    warnings.push(
      `This ${input.sourceLabel} appears to be animated. Converting it flattens the image to a single static frame — motion will be lost.`,
    );
  }

  if (input.hasTransparency && input.outputFormat === "image/jpeg") {
    warnings.push(
      "The source image has transparent areas. JPEG doesn't support transparency, so those areas will be filled with white in the output.",
    );
  }

  return warnings;
}
