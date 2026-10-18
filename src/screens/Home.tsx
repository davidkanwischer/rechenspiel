import { GAME_NAME, type Progress } from '../core/progress'
import { XpBar } from '../components/Ui'

interface Props {
  progress: Progress
  onPuzzle: () => void
  onDuel: () => void
  onRewards: () => void
  onRules: () => void
}

export default function Home({ progress, onPuzzle, onDuel, onRewards, onRules }: Props) {
  return (
    <>
      <div className="home-title">
        <div className="logo" />
        <h1>{GAME_NAME}</h1>
        <p>Triff die Zahl.</p>
      </div>
      <XpBar xp={progress.xp} showGoal />
      <button className="btn primary" onClick={onPuzzle}>
        <span className="emoji">🧩</span>
        <span>
          Rätsel
          <small>Zahlen ziehen, Zielzahl treffen</small>
        </span>
      </button>
      <button className="btn" onClick={onDuel}>
        <span className="emoji">🎲</span>
        <span>
          Würfel-Duell
          <small>×1 oder ×10? Gegen Bot oder zu zweit</small>
        </span>
      </button>
      <div className="row">
        <button className="btn center" onClick={onRewards}>
          🏆 Belohnungen
        </button>
        <button className="btn center" onClick={onRules}>
          ❓ Regeln
        </button>
      </div>
    </>
  )
}
