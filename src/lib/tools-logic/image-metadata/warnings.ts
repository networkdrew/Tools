export interface MetadataWarningInput {
  isAnimated: boolean;
  hasIccProfile: boolean;
  formatConverted: boolean;
  sourceLabel: string;
}

/** Advisory (non-blocking) warnings shown before cleaning, e.g. animation, color profile, or format loss. */
export function computeMetadataWarnings(input: MetadataWarningInput): string[] {
  const warnings: string[] = [];

  if (input.formatConverted) {
    warnings.push(
      `Browsers can't re-encode canvas output back to ${input.sourceLabel}, so the cleaned file is saved as PNG instead — that's required to guarantee every trace of metadata is stripped.`,
    );
  }

  if (input.isAnimated) {
    warnings.push(
      `This ${input.sourceLabel} appears to be animated. Removing metadata requires redrawing it on canvas, which flattens the image to a single static frame — motion will be lost.`,
    );
  }

  if (input.hasIccProfile) {
    warnings.push(
      "This image has an embedded color profile (ICC profile). Removing metadata also removes the color profile — the output is re-encoded in standard sRGB, which may cause a subtle color shift for images from wide-gamut cameras or editing software.",
    );
  }

  return warnings;
}
