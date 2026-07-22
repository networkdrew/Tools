import { zipSync, type Zippable } from "fflate";
import type { NamedPdf } from "./extract";

/** Bundles multiple PDFs into a single in-memory ZIP archive. */
export function createZip(files: NamedPdf[]): Uint8Array {
  const entries: Zippable = {};
  for (const file of files) {
    entries[file.name] = [file.bytes, { level: 0 }];
  }
  return zipSync(entries);
}
