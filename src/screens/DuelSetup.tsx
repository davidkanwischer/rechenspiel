import type { Opponent } from '../App'
import { TopBar } from '../components/Ui'

export default function DuelSetup({ onBack, onStart }: { onBack: () => void; onStart: (o: Opponent) => void }) {
  return (
    <>
      <TopBar title="Würfel-Duell" onBack={onBack} />
      <p className="rule">
        Würfle, wähle <b>×1</b> oder <b>×10</b> und komm so nah wie möglich an die Zielzahl – aber nicht drüber!
      </p>
      <div className="section-title">Gegen den Bot</div>
      <button className="btn" onClick={() => onStart({ kind: 'bot', level: 'leicht' })}>
        <span className="emoji">🙂</span>
        <span>
          Leicht<small>Würfelt eher aus dem Bauch</small>
        </span>
      </button>
      <button className="btn" onClick={() => onStart({ kind: 'bot', level: 'mittel' })}>
        <span className="emoji">🤔</span>
        <span>
          Mittel<small>Hat eine Faustregel</small>
        </span>
      </button>
      <button className="btn" onClick={() => onStart({ kind: 'bot', level: 'schwer' })}>
        <span className="emoji">🤖</span>
        <span>
          Schwer<small>Rechnet jede Wahrscheinlichkeit aus</small>
        </span>
      </button>
      <div className="section-title">Zu zweit</div>
      <button className="btn" onClick={() => onStart({ kind: 'local' })}>
        <span className="emoji">👥</span>
        <span>
          2 Spieler, 1 Handy<small>Abwechselnd würfeln</small>
        </span>
      </button>
    </>
  )
}
