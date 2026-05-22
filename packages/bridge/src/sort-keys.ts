export function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).toSorted(
      ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
    );
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = sortKeysDeep(val);
    }
    return result as T;
  }
  return value;
}
