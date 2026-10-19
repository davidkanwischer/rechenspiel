import { adsLeft, AD_JOKERS_PER_DAY, claimable, GAME_NAME, levelFromXp, nextReward, rewardLabel, rewardsFor, xpForLevel, type Progress } from '../core/progress'
import { Die, JokerPill, LevelBadge, RewardIcon } from '../components/Ui'
import { WELCOME_XP } from '../core/invite'

interface Props {
  progress: Progress
  loggedIn: boolean
  onPuzzle: () => void
  onDuel: () => void
  onTrack: () => void
  onDesigns: () => void
  onRules: () => void
  onAccount?: () => void
  onInvite: () => void
  invited: boolean
  onJokerAd: () => void
}

export default function Home(props: Props) {
  const { progress } = props
  const level = levelFromXp(progress.xp)
  const ready = claimable(progress)
  const goal = nextReward(level)

  // Fortschritt seit der letzten Belohnungsstufe bis zur nächsten
  let prev = level
  while (prev > 1 && rewardsFor(prev).length === 0) prev--
  const from = xpForLevel(prev)
  const to = xpForLevel(goal.level)
  const pct = Math.min(100, ((progress.xp - from) / (to - from)) * 100)
  const left = adsLeft(progress)

  return (
    <>
      <div className="top">
        <LevelBadge xp={progress.xp} />
        <JokerPill count={progress.jokers} onClick={left > 0 ? props.onJokerAd : undefined} />
      </div>

      {props.invited && props.onAccount && (
        <button className="card invite-banner chunky" onClick={props.onAccount}>
          <span className="ico">🎁</span>
          <span style={{ flex: 1 }}>
            Du wurdest eingeladen!
            <small>Konto erstellen und {WELCOME_XP} XP Startbonus holen</small>
          </span>
          <span className="muted">›</span>
        </button>
      )}

      <div className="hero">
        <div className="logo">100</div>
        <h1>{GAME_NAME}</h1>
      </div>

      <button className={`card path-card chunky${ready.length ? ' ready' : ''}`} onClick={props.onTrack}>
        {ready.length ? <RewardIcon r={rewardsFor(ready[0])[0]} /> : <RewardIcon r={goal.rewards[0]} />}
        <div className="info">
          <small>Belohnungspfad</small>
          {ready.length ? (
            <b>
              {ready.length === 1 ? 'Belohnung' : `${ready.length} Belohnungen`} bereit!
            </b>
          ) : (
            <>
              <b>
                Stufe {goal.level}: {goal.rewards.map(rewardLabel).join(' + ')}
              </b>
              <div className="bar">
                <div style={{ width: `${pct}%` }} />
              </div>
              <div className="left">noch {to - progress.xp} XP</div>
            </>
          )}
        </div>
        {ready.length > 0 && <span className="claim-tag">Abholen</span>}
      </button>

      <button className="mode puzzle" onClick={props.onPuzzle}>
        <div className="mode-text">
          <h3>Rätsel</h3>
          <p>Zahlen ziehen, Ziel treffen</p>
          <div className="mini-calc">
            <span>45</span>
            <i>×</i>
            <span>2</span>
            <i>+</i>
            <span>10</span>
          </div>
        </div>
        <span className="go">›</span>
      </button>

      <button className="mode duel" onClick={props.onDuel}>
        <div className="mode-text">
          <h3>Würfel-Duell</h3>
          <p>×1 oder ×10? Komm nah ran!</p>
          <div className="mini-dice">
            <Die value={4} skin={progress.diceSkin} small />
            <Die value={6} skin={progress.diceSkin} small />
          </div>
        </div>
        <span className="go">›</span>
      </button>

      {left > 0 && (
        <button className="card video-offer chunky" onClick={props.onJokerAd}>
          <span className="ico">🎬</span>
          <span style={{ flex: 1 }}>
            Gratis-Joker
            <small>
              Kurzes Video ansehen · {left}/{AD_JOKERS_PER_DAY} heute
            </small>
          </span>
          <span className="pill">+1 💡</span>
        </button>
      )}

      <div className="quick">
        <button className="btn" onClick={props.onDesigns}>
          <span className="ico">🎨</span>Designs
        </button>
        <button className="btn" onClick={props.onInvite}>
          <span className="ico">👥</span>Freunde
        </button>
        <button className="btn" onClick={props.onRules}>
          <span className="ico">❓</span>Regeln
        </button>
        {props.onAccount && (
          <button className="btn" onClick={props.onAccount}>
            <span className="ico">👤</span>
            {props.loggedIn ? 'Konto ✓' : 'Konto'}
          </button>
        )}
      </div>
    </>
  )
}
