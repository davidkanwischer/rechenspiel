import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../core/cloud'
import { TopBar } from '../components/Ui'

export type SyncState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  user: User | null
  sync: SyncState
  onBack: () => void
}

const SYNC_TEXT: Record<SyncState, string> = {
  idle: 'Fortschritt wird automatisch gespeichert',
  saving: 'Speichere …',
  saved: 'Fortschritt gespeichert ✓',
  error: 'Speichern fehlgeschlagen – wird beim nächsten Mal erneut versucht',
}

export default function Account({ user, sync, onBack }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)

  const run = async (mode: 'login' | 'signup') => {
    if (!supabase) return
    if (!email || password.length < 6) return setMsg({ text: 'Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.', bad: true })
    setBusy(true)
    setMsg(null)
    const res =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (res.error) return setMsg({ text: translate(res.error.message), bad: true })
    if (mode === 'signup' && !res.data.session) setMsg({ text: 'Fast geschafft! Bestätige deine E-Mail über den Link, den wir dir geschickt haben.' })
  }

  return (
    <>
      <TopBar title="Konto" onBack={onBack} />
      {user ? (
        <>
          <div className="card">
            <div>
              <b>Angemeldet</b>
            </div>
            <div className="text">{user.email}</div>
            <p className="rule" style={{ textAlign: 'left', marginTop: 8 }}>
              {SYNC_TEXT[sync]}
            </p>
          </div>
          <p className="rule">Melde dich auf einem anderen Handy mit derselben E-Mail an – dein Fortschritt ist dann auch dort.</p>
          <button className="btn" onClick={() => supabase?.auth.signOut()}>
            Abmelden
          </button>
        </>
      ) : (
        <>
          <p className="rule">
            Ein Konto ist <b>optional</b>. Ohne Konto wird dein Fortschritt nur auf diesem Gerät gespeichert. Mit Konto kannst du ihn auf jedem
            Handy weiterspielen.
          </p>
          <input className="input" type="email" placeholder="E-Mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            type="password"
            placeholder="Passwort (mind. 6 Zeichen)"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {msg && <p className={`rule${msg.bad ? ' bad-text' : ''}`}>{msg.text}</p>}
          <button className="btn primary" disabled={busy} onClick={() => run('login')}>
            Anmelden
          </button>
          <button className="btn" disabled={busy} onClick={() => run('signup')}>
            Neues Konto erstellen
          </button>
          <p className="rule">Dein bisheriger Fortschritt auf diesem Gerät bleibt erhalten und wird ins Konto übernommen.</p>
        </>
      )}
    </>
  )
}

function translate(m: string): string {
  if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort falsch.'
  if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach.'
  if (/already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto – bitte anmelden.'
  if (/rate limit/i.test(m)) return 'Zu viele Versuche – bitte kurz warten.'
  return m
}
