import { evaluate, type Mod, type Op } from './expr'
import { countPlacements, solve, type Puzzle } from './solver'

export type Rng = () => number

export interface Unlocks {
  div: boolean
  sq: boolean
  sqrt: boolean
}

export interface GenParams {
  slots: number
  decoys: number
  maxNum: number
  minus: boolean
  trapChance: number // Wahrscheinlichkeit, dass ×/÷ hinter einem +/− steht (Punkt-vor-Strich-Falle)
  modChance: number
  maxTarget: number
  maxSolutionRatio: number
}

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const pickOne = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)]

/** Schwierigkeitsparameter aus der Spielerstufe (1, 2, 3, ...). */
export function paramsFor(level: number, rng: Rng): GenParams {
  const L = Math.max(1, level)
  const slots = L < 3 ? 3 : L < 6 ? (rng() < 0.5 ? 3 : 4) : L < 12 ? 4 : L < 20 ? (rng() < 0.5 ? 4 : 5) : 5
  const decoys = L < 2 ? 1 : L < 5 ? int(rng, 1, 2) : 2
  return {
    slots,
    decoys,
    maxNum: Math.min(12 + L * 4, 99),
    minus: L >= 2,
    trapChance: Math.min(0.15 + L * 0.05, 0.7),
    modChance: Math.min(0.15 + (L - 10) * 0.02, 0.4),
    maxTarget: Math.min(150 + L * 40, 1500),
    maxSolutionRatio: L < 5 ? 0.5 : L < 12 ? 0.34 : 0.2,
  }
}

function randomOps(rng: Rng, prm: GenParams, u: Unlocks): Op[] {
  const strich: Op[] = prm.minus ? ['+', '+', '-'] : ['+']
  const punkt: Op[] = u.div ? ['*', '*', '/'] : ['*']
  const ops: Op[] = []
  for (let i = 0; i < prm.slots - 1; i++) {
    const prev = ops[i - 1]
    // Punkt-Zeichen direkt nach einem Strich-Zeichen ist die "Falle"
    const wantPunkt = prev === '+' || prev === '-' ? rng() < prm.trapChance : rng() < 0.45
    let op = wantPunkt ? pickOne(rng, punkt) : pickOne(rng, strich)
    if (op === '/' && (prev === '/' || prev === '*')) op = '*' // keine Ketten mit ÷ in der Mitte
    ops.push(op)
  }
  // mindestens ein Punkt- und ein Strich-Zeichen, sonst ist es zu langweilig
  if (!ops.some((o) => o === '*' || o === '/')) ops[int(rng, 0, ops.length - 1)] = '*'
  if (ops.length > 1 && !ops.some((o) => o === '+' || o === '-')) ops[int(rng, 0, ops.length - 1)] = '+'
  return ops
}

function smallNum(rng: Rng, max: number) {
  return int(rng, 2, Math.max(3, Math.min(12, Math.floor(max / 3))))
}

function tryGenerate(rng: Rng, prm: GenParams, u: Unlocks): Puzzle | null {
  const ops = randomOps(rng, prm, u)
  const mods: Mod[] = new Array(prm.slots).fill(null)
  if (u.sq || u.sqrt) {
    const kinds: Mod[] = [u.sq ? 'sq' : null, u.sqrt ? 'sqrt' : null].filter(Boolean) as Mod[]
    if (rng() < prm.modChance) mods[int(rng, 0, prm.slots - 1)] = pickOne(rng, kinds)
  }

  const nums: number[] = []
  for (let i = 0; i < prm.slots; i++) {
    const nextOp = ops[i]
    const prevOp = ops[i - 1]
    const inProduct = nextOp === '*' || nextOp === '/' || prevOp === '*' || prevOp === '/'
    // Faktoren eher klein halten, Summanden dürfen groß sein
    nums.push(inProduct ? smallNum(rng, prm.maxNum) + (rng() < 0.3 ? int(rng, 0, prm.maxNum / 2) : 0) : int(rng, 2, prm.maxNum))
  }
  for (let i = 0; i < prm.slots; i++) {
    if (mods[i] === 'sq') nums[i] = int(rng, 2, 12)
    if (mods[i] === 'sqrt') nums[i] = int(rng, 2, 12) ** 2
  }
  // ÷ glatt machen: den Faktor vor dem Teiler um den Teiler vergrößern
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] !== '/') continue
    if (mods[i + 1]) mods[i + 1] = null
    const d = int(rng, 2, 9)
    nums[i + 1] = d
    if (mods[i] === 'sqrt') mods[i] = null
    if (mods[i] === 'sq') nums[i] = d * int(rng, 1, 3) // (d·k)² ist durch d teilbar
    else nums[i] = (nums[i] <= 12 ? nums[i] : int(rng, 2, 12)) * d
  }

  const target = evaluate(nums, ops, mods)
  if (target === null || target <= 0 || target > prm.maxTarget) return null
  if (nums.some((n) => n === target)) return null

  const tiles = [...nums]
  for (let i = 0; i < prm.decoys; i++) {
    let d = int(rng, 2, prm.maxNum)
    if (mods.includes('sqrt') && rng() < 0.5) d = int(rng, 2, 12) ** 2
    tiles.push(d)
  }
  shuffle(rng, tiles)

  const p: Puzzle = { target, tiles, ops, mods }
  const sols = solve(p)
  if (sols.length === 0) return null
  if (sols.length / countPlacements(p) > prm.maxSolutionRatio) return null
  return p
}

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generatePuzzle(level: number, u: Unlocks, rng: Rng = Math.random): Puzzle {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const prm = paramsFor(level, rng)
    // nach vielen Fehlversuchen etwas lockerer werden
    if (attempt > 500) prm.maxSolutionRatio = Math.max(prm.maxSolutionRatio, 0.5)
    const p = tryGenerate(rng, prm, u)
    if (p) return p
  }
  // Rückfall, der immer funktioniert
  return { target: 100, tiles: [10, 45, 2], ops: ['*', '+'], mods: [null, null, null] }
}

/** Schwierigkeits-Wert eines Rätsels für die XP-Berechnung. */
export function puzzleDifficulty(p: Puzzle): number {
  let d = p.ops.length + 1 + (p.tiles.length - p.ops.length - 1)
  p.ops.forEach((o, i) => {
    if ((o === '*' || o === '/') && (p.ops[i - 1] === '+' || p.ops[i - 1] === '-')) d += 1
    if (o === '/') d += 1
  })
  d += p.mods.filter(Boolean).length
  return d
}
