/**
 * Returns a cryptographically secure random integer in [0, max) using
 * rejection sampling, so the result is unbiased (unlike `% max` on a raw
 * random value, which skews low values when max doesn't divide 2^32).
 */
export function secureRandomInt(max: number): number {
  if (max <= 0 || !Number.isInteger(max)) {
    throw new Error("max must be a positive integer");
  }
  const range = 0x100000000; // 2^32
  const limit = range - (range % max);
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);
  return value % max;
}

/** Fisher-Yates shuffle using crypto-secure randomness. Does not mutate the input. */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export function secureRandomItem<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("items must not be empty");
  return items[secureRandomInt(items.length)] as T;
}
