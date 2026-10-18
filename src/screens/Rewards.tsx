import type { Dispatch, SetStateAction } from 'react'
import {
  DICE,
  initialProgress,
  levelFromXp,
  rewardLabel,
  REWARDS,
  THEMES,
  type DiceId,
  type Progress,
  type ThemeId,
} from '../core/progress'
import { Die, TopBar, XpBar } from '../components/Ui'

interface Props {
  progress: Progress
  setProgress: Dispatch<SetStateAction<Progress>>
  onBack: () => void
}

export default function Rewards({ progress, setProgress, onBack }: Props) {
  const level = levelFromXp(progress.xp)
  const reset = () => {
    if (confirm('Wirklich den gesamten Fortschritt löschen?')) setProgress(initialProgress())
  }
  return (
    <>
      <TopBar title="Belohnungen" onBack={onBack} />
      <XpBar xp={progress.xp} />
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
          <b>{progress.jokers}</b>
          <span>Joker</span>
        </div>
      </div>

      <div className="section-title">Farbthema</div>
      <div className="chips">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => (
          <button
            key={id}
            className={`chip${progress.theme === id ? ' sel' : ''}`}
            disabled={!progress.themes.includes(id)}
            onClick={() => setProgress((p) => ({ ...p, theme: id }))}
          >
            {progress.themes.includes(id) ? '' : '🔒 '}
            {THEMES[id]}
          </button>
        ))}
      </div>

      <div className="section-title">Würfel</div>
      <div className="chips">
        {(Object.keys(DICE) as DiceId[]).map((id) => (
          <button
            key={id}
            className={`chip${progress.diceSkin === id ? ' sel' : ''}`}
            disabled={!progress.dice.includes(id)}
            onClick={() => setProgress((p) => ({ ...p, diceSkin: id }))}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <Die value={5} skin={id} small />
            <span>
              {progress.dice.includes(id) ? '' : '🔒 '}
              {DICE[id]}
            </span>
          </button>
        ))}
      </div>

      <div className="section-title">Stufen</div>
      <div className="list">
        {Object.entries(REWARDS).map(([lvl, rs]) => {
          const l = Number(lvl)
          return (
            <div key={l} className={`list-item${l <= level ? ' done' : ' locked'}`}>
              <span className="lvl">{l}</span>
              <span>{rs.map(rewardLabel).join(' · ')}</span>
            </div>
          )
        })}
        <div className={`list-item${level > 30 ? ' done' : ' locked'}`}>
          <span className="lvl">31+</span>
          <span>Jede Stufe: 1× Hinweis-Joker</span>
        </div>
      </div>

      <button className="btn center" onClick={reset} style={{ marginTop: 8 }}>
        Fortschritt zurücksetzen
      </button>
    </>
  )
}
