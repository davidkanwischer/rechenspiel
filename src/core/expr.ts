// Ausdrucksauswertung: Zahlen in Kästchen, feste Rechenzeichen dazwischen.
// Es gilt immer Punkt vor Strich. Ungültige Rechnungen (Teilen mit Rest,
// Wurzel aus Nicht-Quadratzahl) ergeben null.

export type Op = '+' | '-' | '*' | '/'
export type Mod = 'sq' | 'sqrt' | null

export const OP_LABEL: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

export function applyMod(n: number, mod: Mod): number | null {
  if (mod === 'sq') return n * n
  if (mod === 'sqrt') {
    const r = Math.round(Math.sqrt(n))
    return r * r === n ? r : null
  }
  return n
}

/** Wertet nums[0] ops[0] nums[1] ops[1] ... mit Punkt vor Strich aus. */
export function evaluate(nums: number[], ops: Op[], mods: Mod[] = []): number | null {
  if (nums.length !== ops.length + 1) throw new Error('nums/ops passen nicht zusammen')
  const vals: number[] = []
  for (let i = 0; i < nums.length; i++) {
    const v = applyMod(nums[i], mods[i] ?? null)
    if (v === null) return null
    vals.push(v)
  }
  // 1. Punkt-Rechnung zu Termen zusammenfassen
  const terms: number[] = [vals[0]]
  const signs: ('+' | '-')[] = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const v = vals[i + 1]
    if (op === '*') terms[terms.length - 1] *= v
    else if (op === '/') {
      const cur = terms[terms.length - 1]
      if (v === 0 || cur % v !== 0) return null
      terms[terms.length - 1] = cur / v
    } else {
      signs.push(op)
      terms.push(v)
    }
  }
  // 2. Strich-Rechnung von links nach rechts
  let result = terms[0]
  for (let i = 0; i < signs.length; i++) result = signs[i] === '+' ? result + terms[i + 1] : result - terms[i + 1]
  return result
}

/** Wertet nur die bereits gefüllten Kästchen aus, solange sie zusammenhängend von links sind. */
export function evaluatePartial(nums: (number | null)[], ops: Op[], mods: Mod[] = []): number | null {
  let n = 0
  while (n < nums.length && nums[n] !== null) n++
  if (n === 0) return null
  return evaluate(nums.slice(0, n) as number[], ops.slice(0, n - 1), mods.slice(0, n))
}
