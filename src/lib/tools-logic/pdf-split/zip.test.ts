import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { createZip } from "./zip";

describe("createZip", () => {
  it("bundles multiple files into a ZIP that unpacks back to the originals", () => {
    const files = [
      { name: "a.pdf", bytes: new Uint8Array([1, 2, 3]) },
      { name: "b.pdf", bytes: new Uint8Array([4, 5, 6, 7]) },
    ];

    const zipped = createZip(files);
    const unzipped = unzipSync(zipped);

    expect(Object.keys(unzipped).sort()).toEqual(["a.pdf", "b.pdf"]);
    expect(Array.from(unzipped["a.pdf"]!)).toEqual([1, 2, 3]);
    expect(Array.from(unzipped["b.pdf"]!)).toEqual([4, 5, 6, 7]);
  });
});
