import { describe, expect, it } from 'vitest'
import { evaluate, evaluatePartial } from './expr'
import { solve } from './solver'
import { generatePuzzle, type Unlocks } from './generator'
import { addXp, adsLeft, claimable, claimReward, countAd, initialProgress, levelFromXp, mergeProgress, nextReward, normalize, puzzleXp, xpForLevel } from './progress'
import { compare, randomTarget, rollDie, throwsFor } from './duel'
import { botChoice, type BotLevel } from './bot'

// deterministischer Zufall für reproduzierbare Tests
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe('expr', () => {
  it('rechnet Punkt vor Strich', () => {
    expect(evaluate([45, 2, 10], ['*', '+'])).toBe(100)
    expect(evaluate([10, 45, 2], ['+', '*'])).toBe(100)
    expect(evaluate([20, 12, 3, 4], ['-', '/', '*'])).toBe(4)
  })
  it('lehnt Teilen mit Rest und ungültige Wurzeln ab', () => {
    expect(evaluate([7, 2], ['/'])).toBeNull()
    expect(evaluate([8, 2], ['+'], ['sqrt', null])).toBeNull()
    expect(evaluate([9, 3], ['+'], ['sqrt', 'sq'])).toBe(12)
  })
  it('wertet zusammenhängende Teilbelegung aus', () => {
    expect(evaluatePartial([10, 45, null], ['+', '*'])).toBe(55)
    expect(evaluatePartial([null, 45, 2], ['+', '*'])).toBeNull()
  })
})

describe('solver', () => {
  it('findet 45 × 2 + 10', () => {
    const sols = solve({ target: 100, tiles: [45, 2, 10], ops: ['*', '+'], mods: [null, null, null] })
    const vals = sols.map((s) => s.map((i) => [45, 2, 10][i]).join(','))
    expect(vals).toContain('45,2,10')
    expect(vals).toContain('2,45,10')
    expect(vals).toHaveLength(2)
  })
})

describe('generator', () => {
  const variants: Unlocks[] = [
    { div: false, sq: false, sqrt: false },
    { div: true, sq: true, sqrt: true },
  ]
  for (const level of [1, 3, 6, 10, 15, 22, 35]) {
    it(`Stufe ${level}: alle Rätsel lösbar und regelkonform`, () => {
      const rng = seeded(level * 97)
      for (let i = 0; i < 300; i++) {
        const u = variants[i % 2]
        const p = generatePuzzle(level, u, rng)
        expect(p.tiles.length).toBeGreaterThanOrEqual(p.ops.length + 1)
        expect(p.target).toBeGreaterThan(0)
        expect(Number.isInteger(p.target)).toBe(true)
        expect(solve(p, 1).length).toBe(1)
        if (!u.div) expect(p.ops).not.toContain('/')
        if (!u.sq) expect(p.mods).not.toContain('sq')
      }
    })
  }
})

describe('progress', () => {
  it('Stufen und Belohnungen werden abgeholt', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(xpForLevel(5))).toBe(5)
    const { progress, levelUps } = addXp(initialProgress(), xpForLevel(7))
    expect(levelUps).toEqual([2, 3, 4, 5, 6, 7])
    // noch nichts vergeben, aber abholbar
    expect(progress.unlocks.div).toBe(false)
    expect(claimable(progress)).toEqual([3, 5, 7])
    let p = claimReward(progress, 7)
    p = claimReward(p, 5)
    p = claimReward(p, 3)
    p = claimReward(p, 3) // doppelt abholen geht nicht
    expect(p.unlocks.div).toBe(true)
    expect(p.themes).toContain('ozean')
    expect(p.jokers).toBe(2)
    expect(claimable(p)).toEqual([])
    expect(claimReward(p, 9)).toBe(p) // noch nicht erreicht
  })
  it('alter Spielstand wird übernommen', () => {
    const old = { xp: xpForLevel(9), jokers: 4, themes: ['nacht'], theme: 'nacht', dice: ['klassik', 'holz'] }
    const p = normalize(old)
    expect(p.claimed).toEqual([3, 5, 7, 9])
    expect(p.themes).toEqual(['bunt', 'ozean'])
    expect(p.theme).toBe('bunt')
    expect(p.unlocks.div).toBe(true)
    expect(p.jokers).toBe(4)
  })
  it('falsche Versuche senken die XP, mindestens 20 % bleiben', () => {
    expect(puzzleXp(5, 0, false)).toBe(30)
    expect(puzzleXp(5, 1, false)).toBe(23)
    expect(puzzleXp(5, 2, false)).toBe(15)
    expect(puzzleXp(5, 10, false)).toBe(6)
    expect(puzzleXp(5, 0, true)).toBe(15)
  })
  it('Werbevideos pro Tag begrenzt', () => {
    let p = initialProgress()
    for (let i = 0; i < 5; i++) p = countAd(p, '2026-10-19')
    expect(adsLeft(p, '2026-10-19')).toBe(0)
    expect(adsLeft(p, '2026-10-20')).toBe(5)
  })
  it('Spielstände zusammenführen verliert nichts', () => {
    const local = { ...initialProgress(), xp: 300, solved: 10, themes: ['bunt', 'ozean'] as const }
    const remote = { ...initialProgress(), xp: 500, solved: 4, jokers: 4, dice: ['klassik', 'holz'] as const, unlocks: { div: true, sq: false, sqrt: false } }
    const m = mergeProgress({ ...local, themes: [...local.themes] }, { ...remote, dice: [...remote.dice] })
    expect(m.xp).toBe(500)
    expect(m.solved).toBe(10)
    expect(m.jokers).toBe(4)
    expect(m.themes).toEqual(['bunt', 'ozean'])
    expect(m.dice).toEqual(['klassik', 'holz'])
    expect(m.unlocks.div).toBe(true)
  })
  it('nächstes Ziel', () => {
    expect(nextReward(1).level).toBe(3)
    expect(nextReward(7).level).toBe(9)
    expect(nextReward(46).level).toBe(50)
  })
})

describe('duel', () => {
  it('Wurfanzahl nach Zielzahl', () => {
    expect(throwsFor(50)).toBe(3)
    expect(throwsFor(100)).toBe(4)
    expect(throwsFor(200)).toBe(5)
    expect(throwsFor(450)).toBe(6)
  })
  it('Zielzahl gegen den Bot höchstens 150', () => {
    for (let i = 0; i < 1000; i++) {
      const t = randomTarget(Math.random, 150)
      expect(t).toBeGreaterThanOrEqual(20)
      expect(t).toBeLessThanOrEqual(150)
    }
  })
  it('Wertung: drüber verliert, beide drüber → weniger drüber gewinnt', () => {
    expect(compare(48, 53, 50)).toBe(1)
    expect(compare(51, 47, 50)).toBe(-1)
    expect(compare(52, 55, 50)).toBe(1)
    expect(compare(45, 45, 50)).toBe(0)
    expect(compare(50, 49, 50)).toBe(1)
  })
})

describe('bot', () => {
  // abwechselnd wie im Spiel; gibt Siege von A und B zurück (A und B wechseln sich als Startspieler ab)
  function match(a: BotLevel, b: BotLevel, seed: number, games = 1500) {
    const rng = seeded(seed)
    let winsA = 0
    let winsB = 0
    for (let g = 0; g < games; g++) {
      const t = randomTarget(rng)
      const n = throwsFor(t)
      const players = g % 2 === 0 ? [a, b] : [b, a]
      const sums = [0, 0]
      const done = [0, 0]
      for (let i = 0; i < n; i++) {
        for (const p of [0, 1]) {
          const r = rollDie(rng)
          const o = 1 - p
          sums[p] += r * botChoice(players[p], r, sums[p], t, n - i - 1, { sum: sums[o], left: n - done[o] }, rng)
          done[p]++
        }
      }
      const c = compare(sums[0], sums[1], t)
      const aIdx = g % 2 === 0 ? 0 : 1
      if (c === 0) continue
      if ((c === 1) === (aIdx === 0)) winsA++
      else winsB++
    }
    return { winsA, winsB }
  }
  it('Schwer schlägt Leicht deutlich', () => {
    const { winsA, winsB } = match('schwer', 'leicht', 42)
    expect(winsA).toBeGreaterThan(winsB * 2)
  })
  it('Schwer schlägt Mittel', () => {
    const { winsA, winsB } = match('schwer', 'mittel', 7)
    expect(winsA).toBeGreaterThan(winsB * 1.1)
  })
  it('Mittel schlägt Leicht', () => {
    const { winsA, winsB } = match('mittel', 'leicht', 3)
    expect(winsA).toBeGreaterThan(winsB)
  })
})
