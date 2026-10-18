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

/** Belohnung beim Erreichen der jeweiligen Stufe. Ab Stufe 46 gibt es alle 5 Stufen einen Joker. */
export const REWARDS: Record<number, Reward[]> = {
  3: [{ kind: 'joker', count: 1 }],
  5: [{ kind: 'theme', id: 'ozean' }],
  7: [{ kind: 'op', id: 'div' }],
  9: [{ kind: 'dice', id: 'holz' }],
  11: [{ kind: 'joker', count: 2 }],
  13: [{ kind: 'theme', id: 'hell' }],
  15: [{ kind: 'op', id: 'sq' }],
  17: [{ kind: 'dice', id: 'neon' }],
  20: [{ kind: 'theme', id: 'wald' }],
  22: [{ kind: 'joker', count: 2 }],
  25: [{ kind: 'op', id: 'sqrt' }],
  28: [{ kind: 'dice', id: 'marmor' }],
  31: [{ kind: 'theme', id: 'sunset' }],
  35: [{ kind: 'theme', id: 'neon' }],
  40: [{ kind: 'dice', id: 'gold' }],
  45: [{ kind: 'theme', id: 'gold' }, { kind: 'joker', count: 3 }],
}
export const LAST_TABLE_LEVEL = 45

export function rewardsFor(level: number): Reward[] {
  if (REWARDS[level]) return REWARDS[level]
  if (level > LAST_TABLE_LEVEL && level % 5 === 0) return [{ kind: 'joker', count: 1 }]
  return []
}

/** Nächste Stufe (über `level`), die eine Belohnung bringt. */
export function nextReward(level: number): { level: number; rewards: Reward[] } {
  let l = level + 1
  while (rewardsFor(l).length === 0) l++
  return { level: l, rewards: rewardsFor(l) }
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
  return 80 * n + 25 * n * n
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
  if (seconds < 20) xp = Math.round(xp * 1.3)
  else if (seconds < 45) xp = Math.round(xp * 1.1)
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
