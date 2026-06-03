/**
 * Fisher–Yates shuffle on a shallow copy.
 * Used for product grids until rankings are driven by sales or merchandising rules.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const out = items.length ? [...items] : [];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
