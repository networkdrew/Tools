/** Reads `length` bytes starting at `offset` as a Latin-1/ASCII string, for sniffing file signatures and chunk types. */
export function readAscii(
  bytes: Uint8Array,
  offset: number,
  length: number,
): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(bytes[offset + i] ?? 0);
  }
  return result;
}
