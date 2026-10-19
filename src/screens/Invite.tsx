import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { GainXp } from '../App'
import { cloudEnabled } from '../core/cloud'
import { claimReferrals, INVITE_XP, inviteLink, listFriends, MAX_FRIENDS, myInviteCode, QUALIFY_LEVEL, WELCOME_XP, type Friend } from '../core/invite'
import { TopBar } from '../components/Ui'

interface Props {
  user: User | null
  gainXp: GainXp
  onAccount: () => void
  onBack: () => void
}

export default function Invite({ user, gainXp, onAccount, onBack }: Props) {
  const [code, setCode] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [claimed, setClaimed] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setError(false)
      const [c, f] = await Promise.all([myInviteCode(), listFriends(user.id)])
      setCode(c)
      setFriends(f)
    } catch {
      setError(true)
    }
  }, [user])
  useEffect(() => {
    load()
  }, [load])

  const ready = friends.filter((f) => f.qualified && !f.claimed).length

  const share = async () => {
    if (!code) return
    const url = inviteLink(code)
    const text = `Spiel mit mir Zielzahl – das Rechen-Knobelspiel! Über meinen Link bekommst du ${WELCOME_XP} XP Startbonus:`
    try {
      if (navigator.share) return await navigator.share({ title: 'Zielzahl', text, url })
    } catch {
      return // Teilen abgebrochen
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Link kopieren:', url)
    }
  }

  const claim = async () => {
    try {
      const n = await claimReferrals()
      if (n > 0) gainXp(n * INVITE_XP)
      setClaimed(n)
      load()
    } catch {
      setError(true)
    }
  }

  return (
    <>
      <TopBar title="Freunde einladen" onBack={onBack} />

      <div className="card invite-hero">
        <div className="invite-gift">🎁</div>
        <b>+{INVITE_XP} XP pro Freund</b>
        <p className="muted">
          Wer über deinen Link kommt, bekommt {WELCOME_XP} XP Startbonus. Erreicht dein Freund Stufe {QUALIFY_LEVEL}, holst du dir {INVITE_XP} XP ab.
        </p>
      </div>

      {!cloudEnabled ? (
        <p className="rule">Freunde einladen ist bald verfügbar.</p>
      ) : !user ? (
        <>
          <p className="rule">Zum Einladen brauchst du ein Konto – damit wir zählen können, welche Freunde über deinen Link kommen.</p>
          <button className="btn primary" onClick={onAccount}>
            👤 Konto erstellen oder anmelden
          </button>
        </>
      ) : error ? (
        <>
          <p className="rule bad-text">Verbindung fehlgeschlagen.</p>
          <button className="btn" onClick={load}>
            Nochmal versuchen
          </button>
        </>
      ) : (
        <>
          <div className="card invite-code">
            <small>Dein Einladungscode</small>
            <b>{code ?? '…'}</b>
          </div>
          <button className="btn primary" onClick={share} disabled={!code || friends.length >= MAX_FRIENDS}>
            {copied ? '✓ Link kopiert' : '📤 Link teilen'}
          </button>

          <div className="section-title">
            Deine Freunde ({friends.length}/{MAX_FRIENDS})
          </div>
          {friends.length === 0 ? (
            <p className="rule">Noch niemand – teile deinen Link per WhatsApp, Instagram & Co.</p>
          ) : (
            <div className="card friend-list">
              {friends.map((f, i) => (
                <div key={i} className="friend">
                  <span className="opt-ico" style={{ background: `var(--t${(i % 4) + 1})` }}>
                    👤
                  </span>
                  <span style={{ flex: 1 }}>
                    Freund {i + 1}
                    <small>{f.claimed ? `+${INVITE_XP} XP abgeholt` : f.qualified ? `Stufe ${QUALIFY_LEVEL} erreicht!` : `spielt noch – wartet auf Stufe ${QUALIFY_LEVEL}`}</small>
                  </span>
                  <span>{f.claimed ? '✓' : f.qualified ? '🎁' : '⏳'}</span>
                </div>
              ))}
            </div>
          )}
          {ready > 0 && (
            <button className="btn accent" onClick={claim}>
              🎁 {ready * INVITE_XP} XP abholen
            </button>
          )}
        </>
      )}

      {claimed !== null && (
        <div className="overlay" onClick={() => setClaimed(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="big-icon">🎉</div>
            <h2>{claimed > 0 ? `+${claimed * INVITE_XP} XP` : 'Schon abgeholt'}</h2>
            <p>{claimed > 0 ? 'Danke fürs Einladen!' : 'Diese Belohnung hast du bereits auf einem anderen Gerät abgeholt.'}</p>
            <button className="btn primary" onClick={() => setClaimed(null)}>
              Super
            </button>
          </div>
        </div>
      )}
    </>
  )
}
