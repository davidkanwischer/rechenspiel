import type { Unlocks } from './generator'

export const GAME_NAME = 'Zielzahl' // Arbeitstitel – finaler Name noch offen

export type ThemeId = 'nacht' | 'hell' | 'ozean' | 'wald' | 'sunset' | 'neon' | 'gold'
export type DiceId = 'klassik' | 'holz' | 'neon' | 'marmor' | 'gold'

export const THEMES: Record<ThemeId, string> = {
  nacht: 'Nacht',
  hell: 'Hell',
  ozean: 'Ozean',
  wald: 'Wald',
  sunset: 'Sonnenuntergang',
  neon: 'Neon',
  gold: 'Gold',
}
export const DICE: Record<DiceId, string> = {
  klassik: 'Klassik',
  holz: 'Holz',
  neon: 'Neon',
  marmor: 'Marmor',
  gold: 'Gold',
}

export type Reward =
  | { kind: 'theme'; id: ThemeId }
  | { kind: 'dice'; id: DiceId }
  | { kind: 'joker'; count: number }
  | { kind: 'op'; id: keyof Unlocks }

/** Belohnung beim Erreichen der jeweiligen Stufe. Ab Stufe 31 gibt es je einen Joker. */
export const REWARDS: Record<number, Reward[]> = {
  2: [{ kind: 'joker', count: 2 }],
  3: [{ kind: 'theme', id: 'ozean' }],
  4: [{ kind: 'dice', id: 'holz' }],
  5: [{ kind: 'op', id: 'div' }],
  6: [{ kind: 'joker', count: 2 }],
  7: [{ kind: 'theme', id: 'hell' }],
  8: [{ kind: 'dice', id: 'neon' }],
  10: [{ kind: 'op', id: 'sq' }, { kind: 'joker', count: 2 }],
  12: [{ kind: 'theme', id: 'wald' }],
  14: [{ kind: 'dice', id: 'marmor' }],
  15: [{ kind: 'op', id: 'sqrt' }],
  17: [{ kind: 'joker', count: 3 }],
  18: [{ kind: 'theme', id: 'sunset' }],
  21: [{ kind: 'theme', id: 'neon' }],
  24: [{ kind: 'joker', count: 3 }],
  25: [{ kind: 'dice', id: 'gold' }],
  30: [{ kind: 'theme', id: 'gold' }, { kind: 'joker', count: 5 }],
}

export function rewardsFor(level: number): Reward[] {
  if (REWARDS[level]) return REWARDS[level]
  if (level > 30) return [{ kind: 'joker', count: 1 }]
  return []
}

export function rewardLabel(r: Reward): string {
  switch (r.kind) {
    case 'theme':
      return `Farbthema „${THEMES[r.id]}“`
    case 'dice':
      return `Würfel „${DICE[r.id]}“`
    case 'joker':
      return `${r.count}× Hinweis-Joker`
    case 'op':
      return r.id === 'div' ? 'Neue Rechenart: Geteilt ÷' : r.id === 'sq' ? 'Neue Rechenart: Quadrat x²' : 'Neue Rechenart: Wurzel √'
  }
}

/** Gesamt-XP, die nötig sind, um Stufe `level` zu erreichen (Stufe 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = level - 1
  return 60 * n + 15 * n * n
}

export function levelFromXp(xp: number): number {
  let l = 1
  while (xpForLevel(l + 1) <= xp) l++
  return l
}

export interface Progress {
  xp: number
  jokers: number
  themes: ThemeId[]
  dice: DiceId[]
  theme: ThemeId
  diceSkin: DiceId
  unlocks: Unlocks
  solved: number
  duelsWon: number
  duelsPlayed: number
}

export const initialProgress = (): Progress => ({
  xp: 0,
  jokers: 1,
  themes: ['nacht'],
  dice: ['klassik'],
  theme: 'nacht',
  diceSkin: 'klassik',
  unlocks: { div: false, sq: false, sqrt: false },
  solved: 0,
  duelsWon: 0,
  duelsPlayed: 0,
})

/** XP gutschreiben; gibt neuen Stand und alle neu erreichten Belohnungen zurück. */
export function addXp(p: Progress, amount: number): { progress: Progress; levelUps: number[]; rewards: Reward[] } {
  const before = levelFromXp(p.xp)
  const next: Progress = { ...p, xp: p.xp + amount, themes: [...p.themes], dice: [...p.dice], unlocks: { ...p.unlocks } }
  const after = levelFromXp(next.xp)
  const levelUps: number[] = []
  const rewards: Reward[] = []
  for (let l = before + 1; l <= after; l++) {
    levelUps.push(l)
    for (const r of rewardsFor(l)) {
      rewards.push(r)
      if (r.kind === 'theme' && !next.themes.includes(r.id)) next.themes.push(r.id)
      if (r.kind === 'dice' && !next.dice.includes(r.id)) next.dice.push(r.id)
      if (r.kind === 'joker') next.jokers += r.count
      if (r.kind === 'op') next.unlocks[r.id] = true
    }
  }
  return { progress: next, levelUps, rewards }
}

/** XP für ein gelöstes Rätsel. */
export function puzzleXp(difficulty: number, seconds: number, usedJoker: boolean): number {
  let xp = 10 + difficulty * 4
  if (seconds < 20) xp = Math.round(xp * 1.5)
  else if (seconds < 45) xp = Math.round(xp * 1.2)
  if (usedJoker) xp = Math.round(xp * 0.5)
  return xp
}

const KEY = 'zielzahl.progress.v1'

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialProgress()
    const base = initialProgress()
    const p = JSON.parse(raw)
    return { ...base, ...p, unlocks: { ...base.unlocks, ...p.unlocks } }
  } catch {
    return initialProgress()
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* Speicher nicht verfügbar – Spiel läuft trotzdem */
  }
}
