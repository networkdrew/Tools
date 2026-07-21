import {
  applyCloneStamp,
  applyContentAwareFill,
  type RGBAImage,
} from "./inpaint";
import { rasterizeOperation, type RepairOperation } from "./maskOps";

/**
 * Replays an ordered list of repair operations onto `base`, returning a new
 * buffer (the original is left untouched). Because operations store
 * normalized coordinates, calling this with a working-resolution `base` for
 * live preview and again with the full-resolution decoded image at export
 * time reproduces the identical edit at each resolution.
 */
export function applyRepairOperations(
  base: RGBAImage,
  ops: RepairOperation[],
): RGBAImage {
  const working: RGBAImage = {
    data: new Uint8ClampedArray(base.data),
    width: base.width,
    height: base.height,
  };

  for (const op of ops) {
    const rasterized = rasterizeOperation(op, base.width, base.height);
    if (!rasterized) continue;
    if (op.kind === "clone") {
      applyCloneStamp(working, op, rasterized);
    } else {
      applyContentAwareFill(working, rasterized);
    }
  }

  return working;
}
