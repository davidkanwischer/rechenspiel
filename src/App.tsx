import { useCallback, useEffect, useRef, useState } from 'react'
import { addXp, levelFromXp, loadProgress, rewardsFor, saveProgress, type Progress, type Reward } from './core/progress'
import type { BotLevel } from './core/bot'
import { LevelUpModal } from './components/Ui'
import Home from './screens/Home'
import PuzzleScreen from './screens/Puzzle'
import DuelSetup from './screens/DuelSetup'
import DuelScreen from './screens/Duel'
import Rewards from './screens/Rewards'
import Rules from './screens/Rules'

export type Opponent = { kind: 'bot'; level: BotLevel } | { kind: 'local' }
export type GainXp = (amount: number, extra?: (p: Progress) => Progress) => void

type Screen =
  | { id: 'home' }
  | { id: 'puzzle' }
  | { id: 'duelSetup' }
  | { id: 'duel'; opponent: Opponent }
  | { id: 'rewards' }
  | { id: 'rules' }

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [screen, setScreen] = useState<Screen>({ id: 'home' })
  const [levelUp, setLevelUp] = useState<{ levels: number[]; rewards: Reward[] } | null>(null)

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  }, [progress.theme])

  const gainXp: GainXp = useCallback((amount, extra) => {
    setProgress((p) => addXp(extra ? extra(p) : p, amount).progress)
  }, [])

  // Stufenaufstieg erkennen und Belohnungen anzeigen
  const level = levelFromXp(progress.xp)
  const lastLevel = useRef(level)
  useEffect(() => {
    if (level > lastLevel.current) {
      const levels: number[] = []
      for (let l = lastLevel.current + 1; l <= level; l++) levels.push(l)
      setLevelUp({ levels, rewards: levels.flatMap(rewardsFor) })
    }
    lastLevel.current = level
  }, [level])

  const home = () => setScreen({ id: 'home' })

  return (
    <div className="app">
      {screen.id === 'home' && (
        <Home
          progress={progress}
          onPuzzle={() => setScreen({ id: 'puzzle' })}
          onDuel={() => setScreen({ id: 'duelSetup' })}
          onRewards={() => setScreen({ id: 'rewards' })}
          onRules={() => setScreen({ id: 'rules' })}
        />
      )}
      {screen.id === 'puzzle' && <PuzzleScreen progress={progress} setProgress={setProgress} gainXp={gainXp} onBack={home} />}
      {screen.id === 'duelSetup' && <DuelSetup onBack={home} onStart={(opponent) => setScreen({ id: 'duel', opponent })} />}
      {screen.id === 'duel' && (
        <DuelScreen opponent={screen.opponent} diceSkin={progress.diceSkin} gainXp={gainXp} onBack={() => setScreen({ id: 'duelSetup' })} />
      )}
      {screen.id === 'rewards' && <Rewards progress={progress} setProgress={setProgress} onBack={home} />}
      {screen.id === 'rules' && <Rules onBack={home} />}
      {levelUp && <LevelUpModal levels={levelUp.levels} rewards={levelUp.rewards} onClose={() => setLevelUp(null)} />}
    </div>
  )
}
