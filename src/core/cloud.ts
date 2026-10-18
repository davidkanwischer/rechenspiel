import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Progress } from './progress'

// Account ist optional: ohne diese Umgebungsvariablen läuft das Spiel rein lokal.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const cloudEnabled = supabase !== null

export async function loadRemote(userId: string): Promise<Progress | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('progress').select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.data as Progress | undefined) ?? null
}

export async function saveRemote(userId: string, p: Progress): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('progress').upsert({ user_id: userId, data: p, updated_at: new Date().toISOString() })
  if (error) throw error
}
