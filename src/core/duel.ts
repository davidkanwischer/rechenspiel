import type { Rng } from './generator'

export const rollDie = (rng: Rng = Math.random) => 1 + Math.floor(rng() * 6)

/** Wurfanzahl hängt von der Zielzahl ab. */
export function throwsFor(target: number): number {
  if (target <= 60) return 3
  if (target <= 150) return 4
  if (target <= 300) return 5
  return 6
}

export function randomTarget(rng: Rng = Math.random, max = 500): number {
  // gleichmäßig über die Wurf-Stufen verteilt, damit alle Längen vorkommen
  const ranges = (
    [
      [60, 100],
      [101, 150],
      [151, 300],
      [301, 500],
    ] as [number, number][]
  ).filter(([a]) => a <= max)
  const [a, rawB] = ranges[Math.floor(rng() * ranges.length)]
  const b = Math.min(rawB, max)
  return a + Math.floor(rng() * (b - a + 1))
}

/** Verlust-Wert: je kleiner, desto besser. Drüber ist immer schlechter als drunter. */
export function loss(sum: number, target: number): number {
  return sum <= target ? target - sum : target + 1 + (sum - target)
}

/** 1 = A gewinnt, -1 = B gewinnt, 0 = Unentschieden. */
export function compare(a: number, b: number, target: number): 1 | -1 | 0 {
  const la = loss(a, target)
  const lb = loss(b, target)
  return la < lb ? 1 : la > lb ? -1 : 0
}
