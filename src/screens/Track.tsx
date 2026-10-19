import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { claimReward, levelFromXp, rewardLabel, rewardsFor, xpForLevel, type Progress, type Reward } from '../core/progress'
import { JokerPill, LevelBadge, RewardIcon, RewardList, TopBar } from '../components/Ui'

interface Props {
  progress: Progress
  setProgress: Dispatch<SetStateAction<Progress>>
  onBack: () => void
}

const COL = 120 // Breite einer Stufe auf dem Pfad (muss zu .t-col passen)

export default function Track({ progress, setProgress, onBack }: Props) {
  const level = levelFromXp(progress.xp)
  const last = Math.max(50, Math.ceil((level + 10) / 5) * 5)
  const levels = Array.from({ length: last }, (_, i) => i + 1)
  const frac = (progress.xp - xpForLevel(level)) / (xpForLevel(level + 1) - xpForLevel(level))
  const fillWidth = (level - 1 + Math.min(frac, 1)) * COL

  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = wrap.current
    if (el) el.scrollLeft = (level - 1) * COL // Pfad startet zentriert auf Stufe 1
  }, [level])

  const [opened, setOpened] = useState<Reward[] | null>(null)
  const claim = (l: number) => {
    setProgress((p) => claimReward(p, l))
    setOpened(rewardsFor(l))
  }

  return (
    <>
      <TopBar title="Belohnungspfad" onBack={onBack} right={<JokerPill count={progress.jokers} />} />
      <div className="card">
        <LevelBadge xp={progress.xp} />
      </div>

      <div className="track-wrap" ref={wrap}>
        <div className="track">
          <div className="track-inner">
          <div className="track-line" style={{ left: COL / 2, width: (last - 1) * COL }} />
          <div className="track-fill" style={{ left: COL / 2, width: fillWidth }} />
          {levels.map((l) => {
            const rs = rewardsFor(l)
            const reached = l <= level
            const claimed = progress.claimed.includes(l)
            return (
              <div key={l} className="t-col">
                <div className="t-slot">
                  {rs.length > 0 && (
                    <div className={`t-card${claimed ? ' claimed' : reached ? ' ready' : ' locked'}`}>
                      <RewardIcon r={rs[0]} />
                      <span>{rs.map(rewardLabel).join(' + ')}</span>
                      {claimed ? (
                        <span className="state">✓ Abgeholt</span>
                      ) : reached ? (
                        <button className="claim" onClick={() => claim(l)}>
                          Abholen
                        </button>
                      ) : (
                        <span className="state">🔒</span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`t-node${l === level ? ' current' : l < level ? ' done' : ''}`}>{l}</div>
              </div>
            )
          })}
          </div>
        </div>
      </div>
      <p className="rule">Wische nach links und rechts · Belohnungen musst du selbst abholen</p>

      <div className="stats">
        <div className="stat">
          <b>{progress.solved}</b>
          <span>Rätsel gelöst</span>
        </div>
        <div className="stat">
          <b>{progress.duelsWon}</b>
          <span>Duelle gewonnen</span>
        </div>
        <div className="stat">
          <b>{progress.claimed.length}</b>
          <span>Belohnungen</span>
        </div>
      </div>

      {opened && (
        <div className="overlay" onClick={() => setOpened(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="big-icon">🎁</div>
            <h2>Abgeholt!</h2>
            <RewardList rewards={opened} />
            {opened.some((r) => r.kind === 'theme' || r.kind === 'dice') && <p>Unter „Designs" im Hauptmenü kannst du es auswählen.</p>}
            <button className="btn primary" onClick={() => setOpened(null)}>
              Super
            </button>
          </div>
        </div>
      )}
    </>
  )
}
