import type { ReactNode } from 'react'
import { levelFromXp, rewardLabel, xpForLevel, type DiceId, type Reward } from '../core/progress'

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="top">
      <button className="icon-btn" onClick={onBack} aria-label="Zurück">
        ←
      </button>
      <h2>{title}</h2>
      {right}
    </div>
  )
}

export function XpBar({ xp }: { xp: number }) {
  const level = levelFromXp(xp)
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  const pct = Math.min(100, ((xp - from) / (to - from)) * 100)
  return (
    <div className="xp">
      <div className="xp-head">
        <b>Stufe {level}</b>
        <span>
          {xp - from} / {to - from} XP
        </span>
      </div>
      <div className="bar">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function TargetCircle({ value, hit, label }: { value: number; hit?: boolean; label?: string }) {
  return (
    <div className={`target${hit ? ' hit' : ''}`}>
      {value}
      {label && <small>{label}</small>}
    </div>
  )
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

export function Die({ value, skin, rolling, small }: { value: number | null; skin: DiceId; rolling?: boolean; small?: boolean }) {
  const on = new Set(value ? PIPS[value] : [])
  return (
    <div
      className={`die ${skin}${rolling ? ' rolling' : ''}${small ? ' small' : ''}`}
      aria-label={value ? `Würfel zeigt ${value}` : 'Würfel'}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="pip" style={{ visibility: on.has(i) ? 'visible' : 'hidden' }} />
      ))}
    </div>
  )
}

export function LevelUpModal({ levels, rewards, onClose }: { levels: number[]; rewards: Reward[]; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h2>Stufe {levels[levels.length - 1]}!</h2>
        {rewards.length > 0 ? <p>Freigeschaltet:</p> : <p>Weiter so!</p>}
        {rewards.map((r, i) => (
          <div key={i} className="reward-item">
            {rewardLabel(r)}
          </div>
        ))}
        <button className="btn primary center" onClick={onClose}>
          Super
        </button>
      </div>
    </div>
  )
}
