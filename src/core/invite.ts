import { supabase } from './cloud'

export const INVITE_XP = 200 // für den Einladenden, sobald der Freund Stufe 3 erreicht
export const WELCOME_XP = 100 // für den Eingeladenen beim Einlösen
export const MAX_FRIENDS = 10
export const QUALIFY_LEVEL = 3

const REF_KEY = 'zielzahl.ref'

/** Einladungscode aus dem Link (?ref=ABC123) merken und aus der Adresszeile entfernen. */
export function captureRefFromUrl() {
  try {
    const url = new URL(window.location.href)
    const ref = url.searchParams.get('ref')
    if (!ref) return
    localStorage.setItem(REF_KEY, ref.toUpperCase())
    url.searchParams.delete('ref')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch {
    /* ohne Speicher kein Einladungsbonus */
  }
}

export function pendingRef(): string | null {
  try {
    return localStorage.getItem(REF_KEY)
  } catch {
    return null
  }
}

export function clearRef() {
  try {
    localStorage.removeItem(REF_KEY)
  } catch {
    /* egal */
  }
}

export const inviteLink = (code: string) => `${window.location.origin}/?ref=${code}`

export async function myInviteCode(): Promise<string> {
  const { data, error } = await supabase!.rpc('my_invite_code')
  if (error) throw error
  return data as string
}

export async function redeemInvite(code: string): Promise<boolean> {
  const { data, error } = await supabase!.rpc('redeem_invite', { code })
  if (error) throw error
  return data === true
}

export async function qualifyReferral(): Promise<boolean> {
  const { data, error } = await supabase!.rpc('qualify_referral')
  if (error) throw error
  return data === true
}

/** Holt die XP für alle Freunde ab, die Stufe 3 erreicht haben. Liefert die Anzahl. */
export async function claimReferrals(): Promise<number> {
  const { data, error } = await supabase!.rpc('claim_referrals')
  if (error) throw error
  return (data as number) ?? 0
}

export interface Friend {
  qualified: boolean
  claimed: boolean
  created_at: string
}

export async function listFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase!
    .from('referrals')
    .select('qualified, claimed, created_at')
    .eq('inviter', userId)
    .order('created_at')
  if (error) throw error
  return data as Friend[]
}
