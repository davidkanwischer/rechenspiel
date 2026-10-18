import { TopBar } from '../components/Ui'

export default function Rules({ onBack }: { onBack: () => void }) {
  return (
    <>
      <TopBar title="Regeln" onBack={onBack} />
      <div className="text">
        <h3>🧩 Rätsel</h3>
        <p>Oben steht die Zielzahl. Zieh die Zahlen in die Kästchen (oder tippe sie an), sodass die Rechnung genau die Zielzahl ergibt.</p>
        <p>
          Es gilt immer <b>Punkt vor Strich</b>: × und ÷ werden zuerst gerechnet. Beispiel: 10 + 45 × 2 = 100.
        </p>
        <p>Manchmal gibt es mehr Zahlen als Kästchen – nicht jede Zahl wird gebraucht.</p>
        <p>Je schneller du bist, desto mehr XP. Mit Stufen schaltest du neue Rechenarten (÷, x², √), Farbthemen, Würfel und Joker frei.</p>
        <h3>🎲 Würfel-Duell</h3>
        <p>Ihr würfelt abwechselnd. Entscheide bei jedem Wurf: ×1 oder ×10. Die Werte werden addiert.</p>
        <p>Die Anzahl der Würfe hängt von der Zielzahl ab (3 bis 6 Würfe).</p>
        <p>Wer am nächsten an der Zielzahl ist, gewinnt. Wer drüber ist, verliert. Sind beide drüber, gewinnt, wer weniger drüber ist.</p>
      </div>
    </>
  )
}
