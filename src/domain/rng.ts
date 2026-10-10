export type Rng = () => number;

export const randomRng: Rng = () => Math.random();

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(rng: Rng, length: number): number {
  return Math.floor(rng() * length);
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  return items[pickIndex(rng, items.length)]!;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = pickIndex(rng, i + 1);
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}
