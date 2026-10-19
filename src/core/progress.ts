import type { Unlocks } from './generator'

export const GAME_NAME = 'Zielzahl' // Arbeitstitel – finaler Name noch offen

export type ThemeId = 'bunt' | 'ozean' | 'candy' | 'wald' | 'sunset' | 'nacht' | 'gold'
export type DiceId = 'klassik' | 'holz' | 'neon' | 'marmor' | 'gold'

export const THEMES: Record<ThemeId, string> = {
  bunt: 'Bunt',
  ozean: 'Ozean',
  candy: 'Zuckerwatte',
  wald: 'Wald',
  sunset: 'Sonnenuntergang',
  nacht: 'Nacht',
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
  13: [{ kind: 'theme', id: 'candy' }],
  15: [{ kind: 'op', id: 'sq' }],
  17: [{ kind: 'dice', id: 'neon' }],
  20: [{ kind: 'theme', id: 'wald' }],
  22: [{ kind: 'joker', count: 2 }],
  25: [{ kind: 'op', id: 'sqrt' }],
  28: [{ kind: 'dice', id: 'marmor' }],
  31: [{ kind: 'theme', id: 'sunset' }],
  35: [{ kind: 'theme', id: 'nacht' }],
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

/** Stufe, ab der ein Design bzw. Würfel freigeschaltet wird. */
export function unlockLevel(kind: 'theme' | 'dice', id: string): number {
  for (const [l, rs] of Object.entries(REWARDS)) if (rs.some((r) => r.kind === kind && r.id === id)) return Number(l)
  return 1
}

export function rewardLabel(r: Reward): string {
  switch (r.kind) {
    case 'theme':
      return `Design „${THEMES[r.id]}“`
    case 'dice':
      return `Würfel „${DICE[r.id]}“`
    case 'joker':
      return `${r.count}× Joker`
    case 'op':
      return r.id === 'div' ? 'Geteilt ÷' : r.id === 'sq' ? 'Quadrat x²' : 'Wurzel √'
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
  claimed: number[] // Stufen, deren Belohnung abgeholt wurde
  solved: number
  duelsWon: number
  duelsPlayed: number
  adDay: string // Datum der Werbevideo-Zählung
  adsToday: number
}

export const initialProgress = (): Progress => ({
  xp: 0,
  jokers: 1,
  themes: ['bunt'],
  dice: ['klassik'],
  theme: 'bunt',
  diceSkin: 'klassik',
  unlocks: { div: false, sq: false, sqrt: false },
  claimed: [],
  solved: 0,
  duelsWon: 0,
  duelsPlayed: 0,
  adDay: '',
  adsToday: 0,
})

/** XP gutschreiben. Belohnungen werden nicht automatisch vergeben, sondern auf dem Pfad abgeholt. */
export function addXp(p: Progress, amount: number): { progress: Progress; levelUps: number[] } {
  const before = levelFromXp(p.xp)
  const next = { ...p, xp: p.xp + amount }
  const after = levelFromXp(next.xp)
  const levelUps: number[] = []
  for (let l = before + 1; l <= after; l++) levelUps.push(l)
  return { progress: next, levelUps }
}

/** Stufen, deren Belohnung erreicht, aber noch nicht abgeholt ist. */
export function claimable(p: Progress): number[] {
  const out: number[] = []
  const level = levelFromXp(p.xp)
  for (let l = 2; l <= level; l++) if (rewardsFor(l).length && !p.claimed.includes(l)) out.push(l)
  return out
}

function applyRewards(p: Progress, rewards: Reward[]): Progress {
  const next: Progress = { ...p, themes: [...p.themes], dice: [...p.dice], unlocks: { ...p.unlocks } }
  for (const r of rewards) {
    if (r.kind === 'theme' && !next.themes.includes(r.id)) next.themes.push(r.id)
    if (r.kind === 'dice' && !next.dice.includes(r.id)) next.dice.push(r.id)
    if (r.kind === 'joker') next.jokers += r.count
    if (r.kind === 'op') next.unlocks[r.id] = true
  }
  return next
}

/** Belohnung einer erreichten Stufe abholen. */
export function claimReward(p: Progress, level: number): Progress {
  if (level > levelFromXp(p.xp) || p.claimed.includes(level)) return p
  const rewards = rewardsFor(level)
  if (!rewards.length) return p
  return { ...applyRewards(p, rewards), claimed: [...p.claimed, level] }
}

/** XP für ein gelöstes Rätsel. */
export function puzzleXp(difficulty: number, seconds: number, usedJoker: boolean): number {
  let xp = 10 + difficulty * 4
  if (seconds < 20) xp = Math.round(xp * 1.3)
  else if (seconds < 45) xp = Math.round(xp * 1.1)
  if (usedJoker) xp = Math.round(xp * 0.5)
  return xp
}

// Werbevideos nach Wahl: begrenzte Anzahl Gratis-Joker pro Tag
export const AD_JOKERS_PER_DAY = 5
export const today = () => new Date().toISOString().slice(0, 10)
export function adsLeft(p: Progress, day = today()): number {
  return p.adDay === day ? Math.max(0, AD_JOKERS_PER_DAY - p.adsToday) : AD_JOKERS_PER_DAY
}
export function countAd(p: Progress, day = today()): Progress {
  return { ...p, adDay: day, adsToday: (p.adDay === day ? p.adsToday : 0) + 1 }
}

/** Gespeicherten Stand auf das aktuelle Format bringen (auch ältere Versionen). */
export function normalize(raw: unknown): Progress {
  const base = initialProgress()
  const p = { ...base, ...(raw as Partial<Progress>) } as Progress
  p.unlocks = { ...base.unlocks, ...p.unlocks }
  if (!Array.isArray((raw as Partial<Progress> | null)?.claimed)) {
    // ältere Version: Belohnungen wurden automatisch vergeben → als abgeholt übernehmen und neu berechnen
    const level = levelFromXp(p.xp)
    const claimed = Object.keys(REWARDS).map(Number).filter((l) => l <= level)
    const rebuilt = applyRewards({ ...base, xp: p.xp }, claimed.flatMap(rewardsFor))
    p.claimed = claimed
    p.themes = rebuilt.themes
    p.dice = rebuilt.dice
    p.unlocks = rebuilt.unlocks
  }
  p.themes = p.themes.filter((t) => t in THEMES)
  if (!p.themes.includes('bunt')) p.themes.unshift('bunt')
  if (!p.themes.includes(p.theme)) p.theme = 'bunt'
  if (!p.dice.includes(p.diceSkin)) p.diceSkin = 'klassik'
  return p
}

const KEY = 'zielzahl.progress.v1'

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalize(JSON.parse(raw)) : initialProgress()
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

/** Zwei Spielstände zusammenführen (z. B. Handy-Stand + Konto-Stand): nichts geht verloren. */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const r = normalize(remote)
  const ahead = local.xp >= r.xp ? local : r
  return {
    ...local,
    xp: Math.max(local.xp, r.xp),
    jokers: ahead.jokers,
    themes: [...new Set([...local.themes, ...r.themes])],
    dice: [...new Set([...local.dice, ...r.dice])],
    unlocks: {
      div: local.unlocks.div || r.unlocks.div,
      sq: local.unlocks.sq || r.unlocks.sq,
      sqrt: local.unlocks.sqrt || r.unlocks.sqrt,
    },
    claimed: [...new Set([...local.claimed, ...r.claimed])],
    solved: Math.max(local.solved, r.solved),
    duelsWon: Math.max(local.duelsWon, r.duelsWon),
    duelsPlayed: Math.max(local.duelsPlayed, r.duelsPlayed),
  }
}
