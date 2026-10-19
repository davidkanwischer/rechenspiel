import type { Dispatch, SetStateAction } from 'react'
import { DICE, initialProgress, THEMES, unlockLevel, type DiceId, type Progress, type ThemeId } from '../core/progress'
import { Die, TopBar } from '../components/Ui'

interface Props {
  progress: Progress
  setProgress: Dispatch<SetStateAction<Progress>>
  onBack: () => void
}

export default function Designs({ progress, setProgress, onBack }: Props) {
  const reset = () => {
    if (confirm('Wirklich den gesamten Fortschritt löschen?')) setProgress(initialProgress())
  }
  return (
    <>
      <TopBar title="Designs" onBack={onBack} />

      <div className="section-title">Farbdesign</div>
      <div className="theme-grid">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => {
          const owned = progress.themes.includes(id)
          return (
            <button
              key={id}
              data-theme={id}
              className={`theme-card${progress.theme === id ? ' sel' : ''}`}
              onClick={() => owned && setProgress((p) => ({ ...p, theme: id }))}
            >
              <span className="mini-target">100</span>
              <span className="mini-tiles">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className="name">{THEMES[id]}</span>
              {!owned && (
                <span className="lock">
                  <b>🔒</b>Stufe {unlockLevel('theme', id)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="section-title">Würfel</div>
      <div className="dice-grid">
        {(Object.keys(DICE) as DiceId[]).map((id) => {
          const owned = progress.dice.includes(id)
          return (
            <button
              key={id}
              className={`dice-card${progress.diceSkin === id ? ' sel' : ''}`}
              onClick={() => owned && setProgress((p) => ({ ...p, diceSkin: id }))}
            >
              <Die value={5} skin={id} small />
              {DICE[id]}
              {!owned && (
                <span className="lock">
                  <b>🔒</b>Stufe {unlockLevel('dice', id)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="rule">Neue Designs und Würfel holst du dir auf dem Belohnungspfad.</p>
      <button className="btn" onClick={reset} style={{ marginTop: 12 }}>
        Fortschritt zurücksetzen
      </button>
    </>
  )
}
