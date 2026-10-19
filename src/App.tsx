import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  addXp,
  adsLeft,
  countAd,
  levelFromXp,
  loadProgress,
  mergeProgress,
  rewardsFor,
  saveProgress,
  type Progress,
} from './core/progress'
import { cloudEnabled, loadRemote, saveRemote, supabase } from './core/cloud'
import { showRewardedAd } from './core/ads'
import type { BotLevel } from './core/bot'
import { AdBanner, AdHost, LevelUpModal } from './components/Ui'
import Home from './screens/Home'
import PuzzleScreen from './screens/Puzzle'
import DuelSetup from './screens/DuelSetup'
import DuelScreen from './screens/Duel'
import Track from './screens/Track'
import Designs from './screens/Designs'
import Rules from './screens/Rules'
import Account, { type SyncState } from './screens/Account'
import Invite from './screens/Invite'
import { clearRef, pendingRef, qualifyReferral, QUALIFY_LEVEL, redeemInvite, WELCOME_XP } from './core/invite'

export type Opponent = { kind: 'bot'; level: BotLevel } | { kind: 'local' }
export type GainXp = (amount: number, extra?: (p: Progress) => Progress) => void

type Screen =
  | { id: 'home' }
  | { id: 'puzzle' }
  | { id: 'duelSetup' }
  | { id: 'duel'; opponent: Opponent }
  | { id: 'track' }
  | { id: 'designs' }
  | { id: 'rules' }
  | { id: 'account' }
  | { id: 'invite' }

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [screen, setScreen] = useState<Screen>({ id: 'home' })
  const [levelUp, setLevelUp] = useState<{ level: number; hasReward: boolean } | null>(null)

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  }, [progress.theme])

  const gainXp: GainXp = useCallback((amount, extra) => {
    setProgress((p) => addXp(extra ? extra(p) : p, amount).progress)
  }, [])

  // Werbevideo nach Wahl: +1 Joker (begrenzt pro Tag)
  const watchJokerAd = useCallback(async () => {
    if (adsLeft(progress) <= 0) return
    if (await showRewardedAd('1× Joker')) setProgress((p) => countAd({ ...p, jokers: p.jokers + 1 }))
  }, [progress])

  // Stufenaufstieg erkennen
  const level = levelFromXp(progress.xp)
  const lastLevel = useRef(level)
  const silentLevel = useRef(false) // beim Laden aus dem Konto kein Stufen-Popup
  useEffect(() => {
    if (silentLevel.current) silentLevel.current = false
    else if (level > lastLevel.current) {
      let hasReward = false
      for (let l = lastLevel.current + 1; l <= level; l++) if (rewardsFor(l).length) hasReward = true
      setLevelUp({ level, hasReward })
    }
    lastLevel.current = level
  }, [level])

  // Optionales Konto: beim Anmelden Stände zusammenführen, danach automatisch speichern
  const [user, setUser] = useState<User | null>(null)
  const [sync, setSync] = useState<SyncState>('idle')
  const remoteReady = useRef(false)
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser((prev) => (prev?.id === u?.id ? prev : u))
    })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    remoteReady.current = false
    if (!user) return
    let cancelled = false
    loadRemote(user.id)
      .then((remote) => {
        if (cancelled) return
        setProgress((local) => {
          const merged = remote ? mergeProgress(local, remote) : local
          if (merged.xp !== local.xp) silentLevel.current = true
          return merged
        })
        remoteReady.current = true
        setSync('idle')
      })
      .catch(() => !cancelled && setSync('error'))
    return () => {
      cancelled = true
    }
  }, [user])
  useEffect(() => {
    if (!user || !remoteReady.current) return
    setSync('saving')
    const t = setTimeout(() => {
      saveRemote(user.id, progress)
        .then(() => setSync('saved'))
        .catch(() => setSync('error'))
    }, 1200)
    return () => clearTimeout(t)
  }, [progress, user])

  // Freunde einladen: Einladung beim ersten Anmelden einlösen, Stufe 3 an den Server melden
  const [invited, setInvited] = useState(() => !!pendingRef())
  const [welcome, setWelcome] = useState(false)
  useEffect(() => {
    const code = pendingRef()
    if (!user || !code) return
    redeemInvite(code)
      .then((ok) => {
        clearRef()
        setInvited(false)
        if (ok) {
          gainXp(WELCOME_XP)
          setWelcome(true)
        }
      })
      .catch(() => {}) // später erneut versuchen
  }, [user, gainXp])
  const qualifySent = useRef(false)
  useEffect(() => {
    if (!user || sync !== 'saved' || level < QUALIFY_LEVEL || qualifySent.current) return
    qualifySent.current = true
    qualifyReferral().catch(() => (qualifySent.current = false))
  }, [user, sync, level])

  const go = (s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }
  const home = () => go({ id: 'home' })

  return (
    <div className="app">
      <div className="screen">
        {screen.id === 'home' && (
          <Home
            progress={progress}
            loggedIn={!!user}
            onPuzzle={() => go({ id: 'puzzle' })}
            onDuel={() => go({ id: 'duelSetup' })}
            onTrack={() => go({ id: 'track' })}
            onDesigns={() => go({ id: 'designs' })}
            onRules={() => go({ id: 'rules' })}
            onAccount={cloudEnabled ? () => go({ id: 'account' }) : undefined}
            onInvite={() => go({ id: 'invite' })}
            invited={invited && cloudEnabled && !user}
            onJokerAd={watchJokerAd}
          />
        )}
        {screen.id === 'puzzle' && (
          <PuzzleScreen progress={progress} setProgress={setProgress} gainXp={gainXp} onJokerAd={watchJokerAd} onBack={home} />
        )}
        {screen.id === 'duelSetup' && <DuelSetup onBack={home} onStart={(opponent) => go({ id: 'duel', opponent })} />}
        {screen.id === 'duel' && (
          <DuelScreen opponent={screen.opponent} diceSkin={progress.diceSkin} gainXp={gainXp} onBack={() => go({ id: 'duelSetup' })} />
        )}
        {screen.id === 'track' && <Track progress={progress} setProgress={setProgress} onBack={home} />}
        {screen.id === 'designs' && <Designs progress={progress} setProgress={setProgress} onBack={home} />}
        {screen.id === 'rules' && <Rules onBack={home} />}
        {screen.id === 'account' && <Account user={user} sync={sync} onBack={home} />}
        {screen.id === 'invite' && <Invite user={user} gainXp={gainXp} onAccount={() => go({ id: 'account' })} onBack={home} />}
      </div>
      <AdBanner />
      <AdHost />
      {welcome && (
        <div className="overlay" onClick={() => setWelcome(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="big-icon">🎁</div>
            <h2>Willkommen!</h2>
            <p>Du wurdest von einem Freund eingeladen.</p>
            <div className="big-xp">+{WELCOME_XP} XP</div>
            <button className="btn primary" onClick={() => setWelcome(false)}>
              Los geht's
            </button>
          </div>
        </div>
      )}
      {levelUp && (
        <LevelUpModal
          level={levelUp.level}
          hasReward={levelUp.hasReward}
          onClose={() => setLevelUp(null)}
          onGoTrack={() => {
            setLevelUp(null)
            go({ id: 'track' })
          }}
        />
      )}
    </div>
  )
}
