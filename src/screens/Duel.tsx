import { useEffect, useState } from 'react'
import type { GainXp, Opponent } from '../App'
import { botChoice, type Factor } from '../core/bot'
import { compare, randomTarget, rollDie, throwsFor } from '../core/duel'
import type { DiceId } from '../core/progress'
import { Die, TargetCircle, TopBar } from '../components/Ui'

interface Props {
  opponent: Opponent
  diceSkin: DiceId
  gainXp: GainXp
  onBack: () => void
}

type Phase = 'roll' | 'rolling' | 'choose' | 'done'

const BOT_XP = { leicht: 15, mittel: 25, schwer: 40 } as const
const BOT_NAME = { leicht: 'Bot (leicht)', mittel: 'Bot (mittel)', schwer: 'Bot (schwer)' } as const

function newGame(starter: number) {
  const target = randomTarget()
  return { target, n: throwsFor(target), cells: [[], []] as number[][], cur: starter, phase: 'roll' as Phase, roll: null as number | null }
}

export default function DuelScreen({ opponent, diceSkin, gainXp, onBack }: Props) {
  const [gameNo, setGameNo] = useState(0)
  const [g, setG] = useState(() => newGame(0))
  const [face, setFace] = useState<number | null>(null)
  const [lastBot, setLastBot] = useState<Factor | null>(null)

  const names = opponent.kind === 'bot' ? ['Du', BOT_NAME[opponent.level]] : ['Spieler 1', 'Spieler 2']
  const isBot = (p: number) => opponent.kind === 'bot' && p === 1
  const sums = g.cells.map((c) => c.reduce((a, b) => a + b, 0))

  const startRoll = () => setG((s) => (s.phase === 'roll' ? { ...s, phase: 'rolling', roll: null } : s))

  const choose = (f: Factor) => {
    if (g.phase !== 'choose' || g.roll === null) return
    const cells = g.cells.map((c, i) => (i === g.cur ? [...c, g.roll! * f] : c))
    const done = cells[0].length === g.n && cells[1].length === g.n
    setG({ ...g, cells, cur: done ? g.cur : 1 - g.cur, phase: done ? 'done' : 'roll', roll: null })
    setFace(null)
    if (done && opponent.kind === 'bot') {
      const [a, b] = cells.map((c) => c.reduce((x, y) => x + y, 0))
      const res = compare(a, b, g.target)
      const xp = res === 1 ? BOT_XP[opponent.level] : res === 0 ? Math.round(BOT_XP[opponent.level] / 2) : 5
      gainXp(xp, (p) => ({ ...p, duelsPlayed: p.duelsPlayed + 1, duelsWon: p.duelsWon + (res === 1 ? 1 : 0) }))
    }
  }

  // Würfel-Animation
  useEffect(() => {
    if (g.phase !== 'rolling') return
    const iv = setInterval(() => setFace(rollDie()), 70)
    const to = setTimeout(() => {
      clearInterval(iv)
      const r = rollDie()
      setFace(r)
      setG((s) => ({ ...s, phase: 'choose', roll: r }))
    }, 650)
    return () => {
      clearInterval(iv)
      clearTimeout(to)
    }
  }, [g.phase])

  // Bot spielt automatisch
  useEffect(() => {
    if (!isBot(g.cur) || opponent.kind !== 'bot') return
    if (g.phase === 'roll') {
      const t = setTimeout(startRoll, 600)
      return () => clearTimeout(t)
    }
    if (g.phase === 'choose' && g.roll !== null) {
      const me = g.cur
      const other = 1 - me
      const f = botChoice(opponent.level, g.roll, sums[me], g.target, g.n - g.cells[me].length - 1, {
        sum: sums[other],
        left: g.n - g.cells[other].length,
      })
      const t = setTimeout(() => {
        setLastBot(f)
        choose(f)
      }, 800)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.phase, g.cur, g.roll])

  const again = () => {
    const next = gameNo + 1
    setGameNo(next)
    setG(newGame(next % 2))
    setFace(null)
    setLastBot(null)
  }

  const botTurn = isBot(g.cur)
  let turnText = ''
  if (g.phase !== 'done') {
    if (botTurn) turnText = g.phase === 'choose' ? `${names[1]} überlegt …` : `${names[1]} würfelt …`
    else if (opponent.kind === 'bot') turnText = lastBot ? `Bot nahm ×${lastBot} · du bist dran` : 'Du bist dran'
    else turnText = `${names[g.cur]} ist dran`
  }

  const result = g.phase === 'done' ? compare(sums[0], sums[1], g.target) : null

  return (
    <>
      <TopBar title="Würfel-Duell" onBack={onBack} right={<span className="pill">{g.n} Würfe</span>} />
      <TargetCircle value={g.target} label="Ziel" />

      {[0, 1].map((p) => (
        <div key={p} className={`board${g.phase !== 'done' && g.cur === p ? ' active' : ''}`}>
          <div className="board-head">
            <b>{names[p]}</b>
            <span className={`board-sum${sums[p] > g.target ? ' over' : ''}`}>
              {sums[p]}
              <small style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>
                {' '}
                {sums[p] > g.target ? `(${sums[p] - g.target} drüber)` : `(noch ${g.target - sums[p]})`}
              </small>
            </span>
          </div>
          <div className="cells">
            {Array.from({ length: g.n }, (_, i) => {
              const v = g.cells[p][i]
              return (
                <div key={i} className={`cell${v !== undefined && v >= 10 ? ' ten' : ''}`}>
                  {v ?? ''}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="dice-zone">
        <div className="turn">{turnText}</div>
        <Die value={face} skin={diceSkin} rolling={g.phase === 'rolling'} />
        {!botTurn && g.phase === 'roll' && (
          <button className="btn primary center" style={{ width: '100%' }} onClick={startRoll}>
            🎲 Würfeln
          </button>
        )}
        {!botTurn && g.phase === 'choose' && g.roll !== null && (
          <div className="row" style={{ width: '100%' }}>
            {([1, 10] as Factor[]).map((f) => (
              <button key={f} className={`btn center${f === 10 ? ' primary' : ''}`} onClick={() => choose(f)}>
                <span>
                  ×{f} = {g.roll! * f}
                  <small>Summe {sums[g.cur] + g.roll! * f}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {g.phase === 'done' && result !== null && (
        <div className="overlay">
          <div className="modal">
            <div style={{ fontSize: 48 }}>{result === 0 ? '🤝' : opponent.kind === 'bot' ? (result === 1 ? '🏆' : '😅') : '🏆'}</div>
            <h2>
              {result === 0
                ? 'Unentschieden'
                : opponent.kind === 'bot'
                  ? result === 1
                    ? 'Gewonnen!'
                    : 'Verloren'
                  : `${names[result === 1 ? 0 : 1]} gewinnt!`}
            </h2>
            <p>Ziel: {g.target}</p>
            {[0, 1].map((p) => (
              <div key={p} className="reward-item">
                {names[p]}: {sums[p]} {sums[p] > g.target ? `(${sums[p] - g.target} drüber)` : `(${g.target - sums[p]} daneben)`}
              </div>
            ))}
            <button className="btn primary center" onClick={again}>
              Nochmal
            </button>
            <button className="btn center" onClick={onBack}>
              Anderer Gegner
            </button>
          </div>
        </div>
      )}
    </>
  )
}
