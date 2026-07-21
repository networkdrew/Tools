import type { Size } from "./geometry";

export interface CropPreset {
  id: string;
  label: string;
  /** width/height to lock the crop rect to, or null for an unconstrained (freeform) crop. */
  aspect: number | null;
  /** Suggested export pixel dimensions for this preset, prefilled into the resize fields. */
  output?: Size;
}

export const CROP_PRESETS: readonly CropPreset[] = [
  { id: "free", label: "Free", aspect: null },
  { id: "square", label: "Square (1:1)", aspect: 1 },
  { id: "4-3", label: "4:3", aspect: 4 / 3 },
  { id: "3-2", label: "3:2", aspect: 3 / 2 },
  { id: "16-9", label: "16:9", aspect: 16 / 9 },
  {
    id: "profile-photo",
    label: "Profile photo",
    aspect: 1,
    output: { width: 400, height: 400 },
  },
  {
    id: "instagram-post",
    label: "Instagram post",
    aspect: 1,
    output: { width: 1080, height: 1080 },
  },
  {
    id: "instagram-story",
    label: "Instagram story",
    aspect: 9 / 16,
    output: { width: 1080, height: 1920 },
  },
  {
    id: "facebook-cover",
    label: "Facebook cover",
    aspect: 820 / 312,
    output: { width: 820, height: 312 },
  },
  {
    id: "youtube-thumbnail",
    label: "YouTube thumbnail",
    aspect: 16 / 9,
    output: { width: 1280, height: 720 },
  },
  { id: "custom", label: "Custom dimensions", aspect: null },
] as const satisfies readonly CropPreset[];

export function getCropPreset(id: string): CropPreset | undefined {
  return CROP_PRESETS.find((p) => p.id === id);
}

export const DEFAULT_CROP_PRESET_ID = "free";
