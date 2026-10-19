import type { Opponent } from '../App'
import { TopBar } from '../components/Ui'

const OPTIONS: { o: Opponent; icon: string; title: string; text: string; color: string }[] = [
  { o: { kind: 'bot', level: 'leicht' }, icon: '🙂', title: 'Bot · leicht', text: 'Würfelt aus dem Bauch', color: 'var(--t2)' },
  { o: { kind: 'bot', level: 'mittel' }, icon: '🤔', title: 'Bot · mittel', text: 'Hat eine Faustregel', color: 'var(--t3)' },
  { o: { kind: 'bot', level: 'schwer' }, icon: '🤖', title: 'Bot · schwer', text: 'Rechnet jede Chance aus', color: 'var(--t1)' },
  { o: { kind: 'local' }, icon: '👥', title: '2 Spieler, 1 Handy', text: 'Abwechselnd würfeln', color: 'var(--t4)' },
]

export default function DuelSetup({ onBack, onStart }: { onBack: () => void; onStart: (o: Opponent) => void }) {
  return (
    <>
      <TopBar title="Würfel-Duell" onBack={onBack} />
      <p className="rule">
        Würfle, wähle <b>×1</b> oder <b>×10</b> und komm so nah wie möglich an die Zielzahl – aber nicht drüber!
      </p>
      {OPTIONS.map(({ o, icon, title, text, color }) => (
        <button key={title} className="btn opt" onClick={() => onStart(o)}>
          <span className="opt-ico" style={{ background: color }}>
            {icon}
          </span>
          <span className="opt-text">
            {title}
            <small>{text}</small>
          </span>
          <span className="muted">›</span>
        </button>
      ))}
    </>
  )
}
