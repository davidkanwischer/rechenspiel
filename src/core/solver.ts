import { evaluate, type Mod, type Op } from './expr'

export interface Puzzle {
  target: number
  tiles: number[] // alle verfügbaren Zahlen (inkl. Lockzahlen)
  ops: Op[] // Rechenzeichen zwischen den Kästchen
  mods: Mod[] // Zusatz pro Kästchen (², √)
}

/** Alle Belegungen (Kachel-Indizes je Kästchen), die die Zielzahl treffen. */
export function solve(p: Puzzle, limit = Infinity): number[][] {
  const slots = p.ops.length + 1
  const out: number[][] = []
  const seen = new Set<string>()
  const used = new Array(p.tiles.length).fill(false)
  const pick: number[] = []

  const rec = () => {
    if (out.length >= limit) return
    if (pick.length === slots) {
      const nums = pick.map((i) => p.tiles[i])
      const key = nums.join(',')
      if (seen.has(key)) return // gleiche Zahlenwerte (doppelte Kacheln) nur einmal
      seen.add(key)
      if (evaluate(nums, p.ops, p.mods) === p.target) out.push([...pick])
      return
    }
    for (let i = 0; i < p.tiles.length; i++) {
      if (used[i]) continue
      used[i] = true
      pick.push(i)
      rec()
      pick.pop()
      used[i] = false
    }
  }
  rec()
  return out
}

/** Anzahl unterschiedlicher Zahlen-Belegungen insgesamt (für das Lösungsverhältnis). */
export function countPlacements(p: Puzzle): number {
  const slots = p.ops.length + 1
  const seen = new Set<string>()
  const used = new Array(p.tiles.length).fill(false)
  const pick: number[] = []
  const rec = () => {
    if (pick.length === slots) {
      seen.add(pick.join(','))
      return
    }
    for (let i = 0; i < p.tiles.length; i++) {
      if (used[i]) continue
      used[i] = true
      pick.push(p.tiles[i])
      rec()
      pick.pop()
      used[i] = false
    }
  }
  rec()
  return seen.size
}
