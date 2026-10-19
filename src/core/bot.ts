import type { Rng } from './generator'
import { compare } from './duel'

export type BotLevel = 'leicht' | 'mittel' | 'schwer'
export type Factor = 1 | 10

/** Stand des Gegners: aktuelle Summe und Würfe, die er noch hat. */
export interface OppState {
  sum: number
  left: number
}

/**
 * Entscheidet ×1 oder ×10.
 * @param left Würfe, die nach diesem noch kommen
 */
export function botChoice(
  level: BotLevel,
  roll: number,
  sum: number,
  target: number,
  left: number,
  opp: OppState,
  rng: Rng = Math.random,
): Factor {
  if (level === 'leicht') {
    const s1 = sum + roll
    const s10 = sum + roll * 10
    // beim letzten Wurf nimmt auch der leichte Bot das Sinnvolle
    if (left === 0) return s10 <= target && target - s10 < target - s1 ? 10 : 1
    // sonst manchmal ein Bauchgefühl-Fehler
    if (rng() < 0.3) return rng() < 0.5 ? 1 : 10
    // grobe Regel ohne Puffer für die restlichen Würfe
    return s10 + left <= target ? 10 : 1
  }
  if (level === 'mittel') {
    // Faustregel, aber etwas mutiger und mit gelegentlichen Fehlern
    if (rng() < 0.15) return rng() < 0.5 ? 1 : 10
    return target - sum - roll * 10 >= left * 2 ? 10 : 1
  }
  return bestChoice(roll, sum, target, left, opp)
}

/** Faustregel: ×10 nur, wenn danach noch Platz für die restlichen Würfe mit ×1 (Ø 3,5) bleibt. */
export function heuristicChoice(roll: number, sum: number, target: number, left: number): Factor {
  return target - sum - roll * 10 >= left * 3.5 ? 10 : 1
}

/** Verteilung der Endsumme des Gegners, angenommen er spielt nach der Faustregel. */
function oppDistribution(opp: OppState, target: number): Map<number, number> {
  let dist = new Map<number, number>([[opp.sum, 1]])
  for (let k = opp.left; k > 0; k--) {
    const next = new Map<number, number>()
    for (const [s, p] of dist) {
      for (let r = 1; r <= 6; r++) {
        const ns = s + r * heuristicChoice(r, s, target, k - 1)
        next.set(ns, (next.get(ns) ?? 0) + p / 6)
      }
    }
    dist = next
  }
  return dist
}

/** Wählt den Faktor mit der höchsten Gewinnwahrscheinlichkeit gegen den Gegner. */
export function bestChoice(roll: number, sum: number, target: number, left: number, opp: OppState): Factor {
  const dist = oppDistribution(opp, target)
  const winMemo = new Map<number, number>()
  const win = (s: number) => {
    let w = winMemo.get(s)
    if (w === undefined) {
      w = 0
      for (const [o, p] of dist) {
        const c = compare(s, o, target)
        w += c === 1 ? p : c === 0 ? p / 2 : 0
      }
      winMemo.set(s, w)
    }
    return w
  }
  const memo = new Map<string, number>()
  const value = (s: number, k: number): number => {
    if (k === 0) return win(s)
    const key = `${s}|${k}`
    const hit = memo.get(key)
    if (hit !== undefined) return hit
    let total = 0
    for (let r = 1; r <= 6; r++) total += Math.max(value(s + r, k - 1), value(s + r * 10, k - 1))
    memo.set(key, total / 6)
    return total / 6
  }
  return value(sum + roll * 10, left) > value(sum + roll, left) ? 10 : 1
}
