import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { GainXp } from '../App'
import { evaluate, evaluatePartial, OP_LABEL } from '../core/expr'
import { generatePuzzle, puzzleDifficulty } from '../core/generator'
import { adsLeft, levelFromXp, LIVE_RESULT_MAX_LEVEL, puzzleXp, type Progress } from '../core/progress'
import { showRewardedAd } from '../core/ads'
import { solve, type Puzzle } from '../core/solver'
import { TargetCircle, TopBar } from '../components/Ui'

interface Props {
  progress: Progress
  setProgress: Dispatch<SetStateAction<Progress>>
  gainXp: GainXp
  onJokerAd: () => void
  onBack: () => void
}

interface Drag {
  tile: number
  sx: number
  sy: number
  x: number
  y: number
  active: boolean
}

const slotAt = (x: number, y: number): number | null => {
  const el = document.elementFromPoint(x, y)?.closest('[data-slot]') as HTMLElement | null
  return el ? Number(el.dataset.slot) : null
}

export default function PuzzleScreen({ progress, setProgress, gainXp, onJokerAd, onBack }: Props) {
  const level = levelFromXp(progress.xp)
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(level, progress.unlocks))
  const [place, setPlace] = useState<(number | null)[]>(() => new Array(puzzle.ops.length + 1).fill(null))
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [usedJoker, setUsedJoker] = useState(false)
  const [wrong, setWrong] = useState(0)
  const [checked, setChecked] = useState<string | null>(null) // zuletzt geprüfte Belegung
  const [won, setWon] = useState<{ xp: number; seconds: number; doubled?: boolean } | null>(null)
  const [jokerOffer, setJokerOffer] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const dragRef = useRef<Drag | null>(null)
  const placeRef = useRef(place)
  placeRef.current = place

  const newPuzzle = () => {
    const p = generatePuzzle(levelFromXp(progress.xp), progress.unlocks)
    setPuzzle(p)
    setPlace(new Array(p.ops.length + 1).fill(null))
    setStartedAt(Date.now())
    setUsedJoker(false)
    setWrong(0)
    setChecked(null)
    setWon(null)
  }

  const commit = (next: (number | null)[]) => setPlace(next)

  const potentialXp = puzzleXp(puzzleDifficulty(puzzle), wrong, usedJoker)
  const placeKey = place.join(',')

  /** Belegung prüfen: richtig → gewonnen, falsch → weniger XP. */
  const check = () => {
    if (won || place.some((t) => t === null) || checked === placeKey) return
    const value = evaluate(
      place.map((t) => puzzle.tiles[t!]),
      puzzle.ops,
      puzzle.mods,
    )
    if (value !== puzzle.target) {
      setWrong((w) => w + 1)
      setChecked(placeKey)
      return
    }
    const seconds = Math.round((Date.now() - startedAt) / 1000)
    setWon({ xp: potentialXp, seconds })
    gainXp(potentialXp, (p) => ({ ...p, solved: p.solved + 1 }))
  }

  /** Kachel in ein Kästchen legen (null = zurück in den Vorrat). Belegtes Ziel wird getauscht. */
  const moveTile = (tile: number, to: number | null) => {
    const next = [...placeRef.current]
    const from = next.indexOf(tile)
    if (to === null) {
      if (from >= 0) next[from] = null
    } else {
      const occupant = next[to]
      if (from >= 0) next[from] = occupant
      next[to] = tile
    }
    commit(next)
  }

  const tap = (tile: number) => {
    const cur = placeRef.current
    if (cur.includes(tile)) return moveTile(tile, null)
    const empty = cur.indexOf(null)
    if (empty >= 0) moveTile(tile, empty)
  }

  // aktuelle Handler für die Fenster-Listener (die beim Drücken sofort angemeldet werden)
  const handlers = useRef({ moveTile, tap })
  handlers.current = { moveTile, tap }
  const detach = useRef<(() => void) | null>(null)
  useEffect(() => () => detach.current?.(), [])

  const onPointerDown = (e: React.PointerEvent, tile: number) => {
    if (won || dragRef.current) return
    e.preventDefault()
    const d = { tile, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, active: false }
    dragRef.current = d
    setDrag(d)

    const move = (ev: PointerEvent) => {
      const cur = dragRef.current
      if (!cur || (!cur.active && Math.hypot(ev.clientX - cur.sx, ev.clientY - cur.sy) < 6)) return
      const nd = { ...cur, x: ev.clientX, y: ev.clientY, active: true }
      dragRef.current = nd
      setDrag(nd)
      setOver(slotAt(ev.clientX, ev.clientY))
    }
    const up = (ev: PointerEvent) => {
      const cur = dragRef.current
      detach.current?.()
      dragRef.current = null
      setDrag(null)
      setOver(null)
      if (!cur) return
      if (!cur.active) handlers.current.tap(cur.tile)
      else handlers.current.moveTile(cur.tile, slotAt(ev.clientX, ev.clientY))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    detach.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      detach.current = null
    }
  }

  const doubleXp = async () => {
    if (!won || won.doubled) return
    if (await showRewardedAd(`+${won.xp} XP`)) {
      gainXp(won.xp)
      setWon({ ...won, doubled: true })
    }
  }

  const useJoker = () => {
    if (won) return
    if (progress.jokers <= 0) return setJokerOffer(true)
    const sols = solve(puzzle)
    if (!sols.length) return
    const cur = placeRef.current
    // Lösung wählen, die am besten zur aktuellen Belegung passt
    const score = (s: number[]) => s.filter((t, i) => cur[i] !== null && puzzle.tiles[cur[i]!] === puzzle.tiles[t]).length
    const best = sols.reduce((a, b) => (score(b) > score(a) ? b : a))
    const slot = best.findIndex((t, i) => cur[i] === null || puzzle.tiles[cur[i]!] !== puzzle.tiles[t])
    if (slot < 0) return
    setProgress((p) => ({ ...p, jokers: p.jokers - 1 }))
    setUsedJoker(true)
    const next = [...cur]
    const from = next.indexOf(best[slot])
    if (from >= 0) next[from] = null
    next[slot] = best[slot]
    commit(next)
  }

  const nums = place.map((t) => (t === null ? null : puzzle.tiles[t]))
  const full = nums.every((n) => n !== null)
  const value = full ? evaluate(nums as number[], puzzle.ops, puzzle.mods) : evaluatePartial(nums, puzzle.ops, puzzle.mods)
  const live = level <= LIVE_RESULT_MAX_LEVEL
  const hit = !!won
  const wrongNow = checked === placeKey
  let resultText = ' '
  let resultClass = ''
  if (wrongNow) {
    resultText = live && value !== null ? `= ${value} – falsch!` : 'Leider falsch!'
    resultClass = 'bad'
  } else if (!live) {
    resultText = full ? 'Fertig? Dann prüfen!' : ' '
  } else if (nums.some((n) => n !== null)) {
    if (value === null) {
      resultText = nums[0] === null ? '…' : 'geht nicht glatt auf'
      resultClass = nums[0] === null ? '' : 'bad'
    } else if (full) {
      resultText = `= ${value}`
    } else resultText = `= ${value} …`
  }

  const pool = puzzle.tiles.map((_, i) => i).filter((i) => !place.includes(i))

  return (
    <>
      <TopBar
        title={`Stufe ${level}`}
        onBack={onBack}
        right={
          <button className="pill" onClick={useJoker} disabled={!!won} aria-label="Joker benutzen">
            💡 {progress.jokers}
          </button>
        }
      />
      <div className={`xp-chip${wrong ? ' lowered' : ''}`} key={potentialXp}>
        🏅 {potentialXp} XP{wrong > 0 && <small> · {wrong}× falsch</small>}
      </div>
      <TargetCircle value={puzzle.target} hit={hit} label="Ziel" />
      <div className="rule">
        Es gilt <b>Punkt vor Strich</b>
        {puzzle.tiles.length > puzzle.ops.length + 1 && ' · nicht jede Zahl wird gebraucht'}
      </div>

      <div className={`slots${wrongNow ? ' shake' : ''}`} key={`s${wrong}`}>
        {place.map((t, i) => (
          <SlotWithOp key={i} i={i} puzzle={puzzle} tile={t} over={over === i} drag={drag} onPointerDown={onPointerDown} />
        ))}
      </div>
      <div className={`result ${resultClass}`}>{resultText}</div>

      <div className="pool">
        {pool.map((t) => (
          <div
            key={t}
            className={`tile c${(t % 4) + 1}${drag?.active && drag.tile === t ? ' dragging' : ''}`}
            onPointerDown={(e) => onPointerDown(e, t)}
          >
            {puzzle.tiles[t]}
          </div>
        ))}
      </div>

      <div className="spacer" />
      {full && !won && (
        <button className="btn primary" onClick={check} disabled={wrongNow}>
          ✓ Prüfen
        </button>
      )}
      <div className="row">
        <button className="btn" onClick={() => commit(new Array(place.length).fill(null))} disabled={!!won}>
          ↺ Leeren
        </button>
        <button className="btn" onClick={newPuzzle}>
          ⏭ Überspringen
        </button>
      </div>

      {drag?.active && (
        <div className={`tile ghost c${(drag.tile % 4) + 1}`} style={{ left: drag.x, top: drag.y }}>
          {puzzle.tiles[drag.tile]}
        </div>
      )}

      {won && (
        <div className="overlay">
          <div className="modal">
            <div className="big-icon">🎯</div>
            <h2>Treffer!</h2>
            <p>
              {formatCalc(puzzle, place)} = {puzzle.target}
            </p>
            <div className="big-xp">+{won.doubled ? won.xp * 2 : won.xp} XP</div>
            <p>
              {won.seconds} Sekunden
              {wrong > 0 ? ` · ${wrong}× falsch` : ' · im 1. Versuch'}
              {usedJoker ? ' · mit Joker' : ''}
            </p>
            {!won.doubled && (
              <button className="btn accent" onClick={doubleXp}>
                🎬 XP verdoppeln
              </button>
            )}
            <button className="btn primary" onClick={newPuzzle}>
              Nächstes Rätsel
            </button>
          </div>
        </div>
      )}

      {jokerOffer && (
        <div className="overlay" onClick={() => setJokerOffer(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="big-icon">💡</div>
            <h2>Keine Joker mehr</h2>
            <p>Ein Joker setzt eine Zahl an die richtige Stelle.</p>
            {adsLeft(progress) > 0 ? (
              <button
                className="btn accent"
                onClick={() => {
                  setJokerOffer(false)
                  onJokerAd()
                }}
              >
                🎬 Video ansehen: +1 Joker
              </button>
            ) : (
              <p>Für heute sind alle Gratis-Joker aufgebraucht. Neue gibt es auf dem Belohnungspfad.</p>
            )}
            <button className="btn" onClick={() => setJokerOffer(false)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SlotWithOp({
  i,
  puzzle,
  tile,
  over,
  drag,
  onPointerDown,
}: {
  i: number
  puzzle: Puzzle
  tile: number | null
  over: boolean
  drag: Drag | null
  onPointerDown: (e: React.PointerEvent, tile: number) => void
}) {
  const mod = puzzle.mods[i]
  const op = puzzle.ops[i - 1]
  return (
    <>
      {i > 0 && <span className={`op${op === '*' || op === '/' ? ' punkt' : ''}`}>{OP_LABEL[op]}</span>}
      <div className={`slot${tile !== null ? ' filled' : ''}${over ? ' over' : ''}`} data-slot={i}>
        {mod === 'sqrt' && <span className="mod sqrt">√</span>}
        {tile !== null && (
          <div
            className={`tile c${(tile % 4) + 1}${drag?.active && drag.tile === tile ? ' dragging' : ''}`}
            onPointerDown={(e) => onPointerDown(e, tile)}
          >
            {puzzle.tiles[tile]}
          </div>
        )}
        {mod === 'sq' && <span className="mod sq">²</span>}
      </div>
    </>
  )
}

function formatCalc(p: Puzzle, place: (number | null)[]) {
  return place
    .map((t, i) => {
      const n = t === null ? '?' : String(p.tiles[t])
      const v = p.mods[i] === 'sq' ? `${n}²` : p.mods[i] === 'sqrt' ? `√${n}` : n
      return i === 0 ? v : `${OP_LABEL[p.ops[i - 1]]} ${v}`
    })
    .join(' ')
}
