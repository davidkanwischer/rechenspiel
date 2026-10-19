import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { BANNER_ENABLED, onRewardedAdRequest } from '../core/ads'
import { levelFromXp, rewardLabel, xpForLevel, type DiceId, type Reward, type ThemeId } from '../core/progress'

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="top">
      <button className="icon-btn" onClick={onBack} aria-label="Zurück">
        ‹
      </button>
      <h2>{title}</h2>
      {right}
    </div>
  )
}

export function JokerPill({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <button className="pill joker" onClick={onClick} aria-label={`${count} Joker`}>
      💡 {count}
      {onClick && <span className="plus">+</span>}
    </button>
  )
}

/** Stufe mit Fortschrittsring. */
export function LevelBadge({ xp }: { xp: number }) {
  const level = levelFromXp(xp)
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  const pct = Math.min(100, ((xp - from) / (to - from)) * 100)
  return (
    <div className="lvl-badge">
      <div className="lvl-ring" style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--card2) 0)` }}>
        <span>{level}</span>
      </div>
      <div className="lvl-text">
        <b>Stufe {level}</b>
        {xp - from} / {to - from} XP
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
    <div className={`die ${skin}${rolling ? ' rolling' : ''}${small ? ' small' : ''}`} aria-label={value ? `Würfel zeigt ${value}` : 'Würfel'}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="pip" style={{ visibility: on.has(i) ? 'visible' : 'hidden' }} />
      ))}
    </div>
  )
}

// Farben je Design für die Vorschau-Symbole
const SWATCH: Record<ThemeId, [string, string, string, string]> = {
  bunt: ['#6c5ce7', '#ffc93c', '#ff8a65', '#4fd1a5'],
  ozean: ['#1e88c9', '#ffd166', '#11b5a4', '#4aa8ff'],
  candy: ['#e8549a', '#7fe0c8', '#b39dff', '#ffb86b'],
  wald: ['#3e9b5a', '#ffb648', '#58b4c9', '#c98bd6'],
  sunset: ['#f2683c', '#ffd25e', '#ee6a9b', '#9c7cf0'],
  nacht: ['#17142b', '#8b7cff', '#ffc93c', '#ff7a59'],
  gold: ['#1b1710', '#e3b341', '#c9824a', '#f7e7b4'],
}

export function RewardIcon({ r }: { r: Reward }) {
  if (r.kind === 'theme') {
    const [a, b, c, d] = SWATCH[r.id]
    return <span className="r-icon theme" style={{ '--sw1': a, '--sw2': b, '--sw3': c, '--sw4': d } as CSSProperties} />
  }
  if (r.kind === 'dice')
    return (
      <span className="r-icon">
        <Die value={5} skin={r.id} small />
      </span>
    )
  if (r.kind === 'joker') return <span className="r-icon joker">💡</span>
  return <span className="r-icon op">{r.id === 'div' ? '÷' : r.id === 'sq' ? 'x²' : '√'}</span>
}

export function RewardList({ rewards }: { rewards: Reward[] }) {
  return (
    <>
      {rewards.map((r, i) => (
        <div key={i} className="reward-item">
          <RewardIcon r={r} />
          {rewardLabel(r)}
        </div>
      ))}
    </>
  )
}

export function LevelUpModal({ level, hasReward, onClose, onGoTrack }: { level: number; hasReward: boolean; onClose: () => void; onGoTrack: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="big-icon">⭐</div>
        <h2>Stufe {level}!</h2>
        <p>{hasReward ? 'Eine neue Belohnung wartet auf dich.' : 'Weiter so – die nächste Belohnung kommt bald.'}</p>
        {hasReward ? (
          <>
            <button className="btn accent" onClick={onGoTrack}>
              🎁 Zum Belohnungspfad
            </button>
            <button className="btn" onClick={onClose}>
              Später
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={onClose}>
            Weiter
          </button>
        )}
      </div>
    </div>
  )
}

/** Fester Werbeplatz unten am Bildschirm (Standardgröße 320×50). */
export function AdBanner() {
  if (!BANNER_ENABLED) return null
  return (
    <div className="ad-banner">
      <div>ANZEIGE</div>
    </div>
  )
}

/** Platzhalter-Werbevideo: 5 Sekunden Countdown, danach gibt es die Belohnung. */
export function AdHost() {
  const [req, setReq] = useState<{ label: string; resolve: (w: boolean) => void } | null>(null)
  const [left, setLeft] = useState(5)

  useEffect(() => {
    onRewardedAdRequest((r) => {
      setLeft(5)
      setReq(r)
    })
    return () => onRewardedAdRequest(null)
  }, [])
  useEffect(() => {
    if (!req || left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [req, left])

  if (!req) return null
  const finish = (watched: boolean) => {
    req.resolve(watched)
    setReq(null)
  }
  return (
    <div className="overlay">
      <div className="modal">
        <div className="ad-video">
          <span className="count">{left > 0 ? `${left} s` : 'fertig'}</span>
          Werbevideo (Platzhalter)
        </div>
        <p>Belohnung: {req.label}</p>
        {left > 0 ? (
          <button className="btn" onClick={() => finish(false)}>
            Abbrechen (keine Belohnung)
          </button>
        ) : (
          <button className="btn accent" onClick={() => finish(true)}>
            Belohnung holen
          </button>
        )}
      </div>
    </div>
  )
}
